
-- ================================================================
-- MIGRATION V7.0: VIP SUBSCRIPTION CLUB
-- ================================================================

BEGIN;

-- 1. Create SUBSCRIPTION_PLANS Table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "King Club"
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    benefits JSONB DEFAULT '{}', -- e.g. {"cuts": "unlimited", "drinks": 4}
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create CLIENT_SUBSCRIPTIONS Table
CREATE TABLE IF NOT EXISTS client_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'overdue', 'cancelled')) DEFAULT 'active',
    start_date DATE DEFAULT CURRENT_DATE,
    expires_at DATE,
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Plans: Visible to authenticated users of the same tenant
CREATE POLICY "plans_isolation" ON subscription_plans
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Subscriptions: Visible to authenticated users of the same tenant
CREATE POLICY "subs_isolation" ON client_subscriptions
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

COMMIT;
