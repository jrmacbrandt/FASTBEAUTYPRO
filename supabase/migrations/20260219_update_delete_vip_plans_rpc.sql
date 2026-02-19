-- 🛡️ UPDATE VIP: Secure RPC for updates
CREATE OR REPLACE FUNCTION update_vip_plan(
    p_id UUID,
    p_name TEXT,
    p_price DECIMAL(10,2),
    p_description TEXT,
    p_benefits JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- 1. Identifica o Tenant do usuário atual
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = auth.uid();

    -- 2. Atualiza o plano garantindo o tenant_id
    UPDATE subscription_plans
    SET 
        name = p_name,
        price = p_price,
        description = p_description,
        benefits = p_benefits
    WHERE id = p_id AND tenant_id = v_tenant_id;
END;
$$;

-- 🛡️ DELETE VIP: Secure RPC for permanent deletion
CREATE OR REPLACE FUNCTION delete_vip_plan(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- 1. Identifica o Tenant do usuário atual
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = auth.uid();

    -- 2. Deleta o plano garantindo o tenant_id
    DELETE FROM subscription_plans
    WHERE id = p_id AND tenant_id = v_tenant_id;
END;
$$;
