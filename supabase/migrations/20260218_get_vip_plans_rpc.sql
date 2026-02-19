-- 🛡️ FIX VIP: VISIBILITY NUCLEAR (RPC Get)
-- Substitui o acesso direto à tabela por uma função segura que ignora RLS.

CREATE OR REPLACE FUNCTION get_vip_plans()
RETURNS SETOF subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER -- ⚡ Roda como Admin (Bypasses RLS)
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- 1. Identifica o Tenant do usuário atual
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = auth.uid();

    -- 2. Retorna os planos desse tenant
    RETURN QUERY
    SELECT *
    FROM subscription_plans
    WHERE tenant_id = v_tenant_id
    ORDER BY created_at;
END;
$$;
