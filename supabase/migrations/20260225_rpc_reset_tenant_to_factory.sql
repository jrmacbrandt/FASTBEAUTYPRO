-- ================================================================
-- 🛡️ [BLINDADO] RPC: reset_tenant_to_factory
-- Data: 2026-02-25
-- Autor: AntiGravity (BLINDADO)
-- Objetivo: Resetar todas as tabelas de um inquilino e
-- manter apenas o Owner e as configurações da loja, retornando-a 
-- ao seu estado virgem de criação.
-- ================================================================

CREATE OR REPLACE FUNCTION public.reset_tenant_to_factory(
    p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_profiles INT := 0;
    deleted_appointments INT := 0;
    deleted_orders INT := 0;
    deleted_products INT := 0;
    deleted_services INT := 0;
    deleted_supplies INT := 0;
    deleted_stock_tx INT := 0;
    deleted_clients INT := 0;
    deleted_campaigns INT := 0;
    deleted_loyalty INT := 0;
    deleted_subscriptions INT := 0;
BEGIN
    -- Validação Básica
    IF p_tenant_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'ID do inquilino ausente.');
    END IF;

    -- 1. Apaga Comandas (Filho de appointments) e Notificações
    DELETE FROM public.orders WHERE tenant_id = p_tenant_id;
    GET DIAGNOSTICS deleted_orders = ROW_COUNT;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        EXECUTE 'DELETE FROM public.notifications WHERE tenant_id = $1' USING p_tenant_id;
    END IF;

    -- 2. Apaga Agendamentos e Transações (Filhos de Serviços/Clientes e Produtos)
    DELETE FROM public.appointments WHERE tenant_id = p_tenant_id;
    GET DIAGNOSTICS deleted_appointments = ROW_COUNT;

    DELETE FROM public.stock_transactions WHERE tenant_id = p_tenant_id;
    GET DIAGNOSTICS deleted_stock_tx = ROW_COUNT;

    -- 3. Apaga Dependentes de Clientes (Fidelidade e Assinaturas)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_loyalty') THEN
        EXECUTE 'DELETE FROM public.client_loyalty WHERE tenant_id = $1' USING p_tenant_id;
        GET DIAGNOSTICS deleted_loyalty = ROW_COUNT;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_subscriptions') THEN
        EXECUTE 'DELETE FROM public.client_subscriptions WHERE tenant_id = $1' USING p_tenant_id;
        GET DIAGNOSTICS deleted_subscriptions = ROW_COUNT;
    END IF;

    -- 4. Apaga Catálogos (Serviços, Produtos, Insumos) e CRM
    DELETE FROM public.services WHERE tenant_id = p_tenant_id;
    GET DIAGNOSTICS deleted_services = ROW_COUNT;

    DELETE FROM public.products WHERE tenant_id = p_tenant_id;
    GET DIAGNOSTICS deleted_products = ROW_COUNT;

    DELETE FROM public.supplies WHERE tenant_id = p_tenant_id;
    GET DIAGNOSTICS deleted_supplies = ROW_COUNT;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
        EXECUTE 'DELETE FROM public.campaigns WHERE tenant_id = $1' USING p_tenant_id;
        GET DIAGNOSTICS deleted_campaigns = ROW_COUNT;
    END IF;

    -- 5. Apaga Base de Clientes (Pais de agendamentos e comandas)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
        EXECUTE 'DELETE FROM public.clients WHERE tenant_id = $1' USING p_tenant_id;
        GET DIAGNOSTICS deleted_clients = ROW_COUNT;
    END IF;

    -- 6. Apaga Perfis de Time (MANTENDO O OWNER)
    -- Atenção redobrada para não apagar o dono da loja (role = 'owner')
    DELETE FROM public.profiles 
    WHERE tenant_id = p_tenant_id 
    AND role != 'owner' 
    AND role != 'master';
    GET DIAGNOSTICS deleted_profiles = ROW_COUNT;

    RETURN json_build_object(
        'success', TRUE,
        'message', 'Inquilino resetado para os padrões de fábrica com sucesso.',
        'stats', json_build_object(
            'profiles', deleted_profiles,
            'appointments', deleted_appointments,
            'orders', deleted_orders,
            'products', deleted_products,
            'services', deleted_services,
            'clients', deleted_clients
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.reset_tenant_to_factory(UUID) TO authenticated, service_role;
