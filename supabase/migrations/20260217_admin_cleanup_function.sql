
-- ================================================================
-- 🗑️ FUNÇÃO DE LIMPEZA GERAL DO SISTEMA (Banco de Dados)
-- ================================================================

CREATE OR REPLACE FUNCTION admin_cleanup_database()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios de admin para ignorar RLS
AS $$
DECLARE
    deleted_profiles INT := 0;
    deleted_appointments INT := 0;
    deleted_products INT := 0;
    deleted_services INT := 0;
    deleted_supplies INT := 0;
    deleted_transactions INT := 0;
    deleted_coupons INT := 0;
    deleted_customers INT := 0;
    deleted_auth_users INT := 0;
    result json;
BEGIN
    -- 1. Remover Profiles órfãos (tenant_id não existe na tabela tenants)
    -- Exceção: Master Admin (pode ter tenant_id nulo ou especial)
    DELETE FROM public.profiles
    WHERE tenant_id IS NOT NULL 
    AND tenant_id NOT IN (SELECT id FROM public.tenants)
    AND role != 'master';
    GET DIAGNOSTICS deleted_profiles = ROW_COUNT;

    -- 2. Remover Agendamentos órfãos
    DELETE FROM public.appointments
    WHERE tenant_id NOT IN (SELECT id FROM public.tenants);
    GET DIAGNOSTICS deleted_appointments = ROW_COUNT;

    -- 3. Remover Serviços órfãos
    DELETE FROM public.services
    WHERE tenant_id NOT IN (SELECT id FROM public.tenants);
    GET DIAGNOSTICS deleted_services = ROW_COUNT;

    -- 4. Remover Produtos órfãos
    DELETE FROM public.products
    WHERE tenant_id NOT IN (SELECT id FROM public.tenants);
    GET DIAGNOSTICS deleted_products = ROW_COUNT;

    -- 5. Remover Insumos órfãos
    DELETE FROM public.supplies
    WHERE tenant_id NOT IN (SELECT id FROM public.tenants);
    GET DIAGNOSTICS deleted_supplies = ROW_COUNT;

    -- 6. Remover Transações órfãs (Estoque e Financeiro)
    DELETE FROM public.stock_transactions
    WHERE tenant_id NOT IN (SELECT id FROM public.tenants);
    
    -- Se houver tabela financeira (financial_transactions ou similar), adicionar aqui
    -- DELETE FROM public.financial_transactions WHERE tenant_id NOT IN ...
    GET DIAGNOSTICS deleted_transactions = ROW_COUNT;

    -- 7. Remover Clientes órfãos (se existir tabela customers vinculada a tenant)
    -- Verificando existência da tabela customers
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
        EXECUTE 'DELETE FROM public.customers WHERE tenant_id NOT IN (SELECT id FROM public.tenants)';
        GET DIAGNOSTICS deleted_customers = ROW_COUNT;
    END IF;

    -- Retornar estatísticas
    result := json_build_object(
        'deleted_profiles', deleted_profiles,
        'deleted_appointments', deleted_appointments,
        'deleted_products', deleted_products,
        'deleted_services', deleted_services,
        'deleted_supplies', deleted_supplies,
        'deleted_transactions', deleted_transactions,
        'deleted_customers', deleted_customers
    );

    RETURN result;
END;
$$;
