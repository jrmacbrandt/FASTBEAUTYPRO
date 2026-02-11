-- ================================================================
-- MIGRATION V6.0: DYNAMIC LOYALTY SYSTEM (5+1)
-- ================================================================

BEGIN;

-- 1. Update TENANTS table (Configurable Target)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS loyalty_program_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS loyalty_target INTEGER DEFAULT 5; -- Default: 5 cuts = 1 free

-- 2. Update CLIENT_LOYALTY table (Tracking Vouchers)
ALTER TABLE client_loyalty
ADD COLUMN IF NOT EXISTS total_vouchers_earned INTEGER DEFAULT 0,
ADD CONSTRAINT unique_client_tenant UNIQUE (tenant_id, client_phone);

-- 3. Create LOYALTY_VOUCHERS table
CREATE TABLE IF NOT EXISTS loyalty_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_phone TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'used', 'expired')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE loyalty_vouchers ENABLE ROW LEVEL SECURITY;

-- RLS: Tenant Isolation
CREATE POLICY "loyalty_vouchers_isolation" ON loyalty_vouchers
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- 4. TRIGGER FUNCTION: Process Stamps & Generate Vouchers
CREATE OR REPLACE FUNCTION process_loyalty_stamp()
RETURNS TRIGGER AS $$
DECLARE
    v_client_phone TEXT;
    v_current_stamps INT;
    v_target INT;
BEGIN
    -- Only process if status changed to 'completed'
    IF (NEW.status = 'completed') AND (OLD.status <> 'completed') THEN
        
        -- Get Client Phone via Appointment
        SELECT c.phone INTO v_client_phone
        FROM appointments a
        JOIN clients c ON c.id = a.client_id
        WHERE a.id = NEW.appointment_id;

        -- If linked to a registered client
        IF v_client_phone IS NOT NULL THEN
            
            -- Get Tenant Target
            SELECT loyalty_target INTO v_target FROM tenants WHERE id = NEW.tenant_id;
            
            -- Upsert into Client Loyalty (Add +1 stamp)
            INSERT INTO client_loyalty (tenant_id, client_phone, stamps_count, last_stamp_at)
            VALUES (NEW.tenant_id, v_client_phone, 1, now())
            ON CONFLICT (tenant_id, client_phone) 
            DO UPDATE SET 
                stamps_count = client_loyalty.stamps_count + 1,
                last_stamp_at = now()
            RETURNING stamps_count INTO v_current_stamps;

            -- Check if Target Reached
            IF v_current_stamps >= v_target THEN
                -- 1. Generate Voucher
                INSERT INTO loyalty_vouchers (tenant_id, client_phone, status)
                VALUES (NEW.tenant_id, v_client_phone, 'active');

                -- 2. Deduct Stamps (Reset logic or Subtract?) -> Let's Subtract Target to allow rollover
                UPDATE client_loyalty 
                SET stamps_count = stamps_count - v_target,
                    total_vouchers_earned = total_vouchers_earned + 1
                WHERE tenant_id = NEW.tenant_id AND client_phone = v_client_phone;
            END IF;

        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach Trigger to ORDERS
DROP TRIGGER IF EXISTS trg_process_loyalty ON orders;
CREATE TRIGGER trg_process_loyalty
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION process_loyalty_stamp();

COMMIT;
