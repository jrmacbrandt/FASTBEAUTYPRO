-- 🛡️ FIX VIP: SECURE RPC (Bypasses RLS)
CREATE OR REPLACE FUNCTION create_vip_plan(
    p_name TEXT,
    p_price DECIMAL,
    p_description TEXT,
    p_benefits JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- ⚡ Runs as Database Owner (Bypasses RLS)
AS $$
DECLARE
    v_tenant_id UUID;
    v_new_plan_id UUID;
BEGIN
    -- 1. Get Tenant ID from secure profile
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = auth.uid();

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User not linked to a tenant';
    END IF;

    -- 2. Insert Plan safely
    INSERT INTO subscription_plans (tenant_id, name, price, description, benefits, active)
    VALUES (v_tenant_id, p_name, p_price, p_description, p_benefits, true)
    RETURNING id INTO v_new_plan_id;

    RETURN jsonb_build_object('success', true, 'id', v_new_plan_id);
END;
$$;
