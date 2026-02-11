
-- ================================================================
-- MIGRATION V8.0: BILL OF MATERIALS (BOM) INFRASTRUCTURE
-- ================================================================

BEGIN;

-- 1. Create SERVICE_MATERIALS Table
-- This table links a Service (what the client pays for) to Products (what is consumed/inventory).
CREATE TABLE IF NOT EXISTS service_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10,4) NOT NULL DEFAULT 1.0, -- Supports fractional usage (e.g. 0.5 of a tube)
    unit TEXT DEFAULT 'un', -- 'ml', 'g', 'un'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Prevent duplicate linking of the same product to the same service
    CONSTRAINT unique_service_product UNIQUE (service_id, product_id)
);

-- 2. Enable RLS
ALTER TABLE service_materials ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Allow access only to users belonging to the same tenant
CREATE POLICY "service_materials_isolation" ON service_materials
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- 4. Create Index for Performance
CREATE INDEX idx_service_materials_service ON service_materials(service_id);
CREATE INDEX idx_service_materials_product ON service_materials(product_id);

COMMIT;
