
-- ================================================================
-- 🧹 MIGRATION: ADICIONAR LIMPEZA DE COMANDAS ÓRFÃS (Orders sem Appointments)
-- ================================================================

CREATE OR REPLACE FUNCTION admin_cleanup_database()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
    deleted_orders_orphan INT := 0;
    deleted_orders_tenant INT := 0;
    result json;
BEGIN
    -- 1. Remover Profiles órfãos (tenant_id não existe na tabela tenants)
    DELETE FROM public.profiles
    WHERE tenant_id IS NOT NULL 
    AND tenant_id NOT IN (SELECT id FROM public.tenants)
    AND role != 'master';
    GET DIAGNOSTICS deleted_profiles = ROW_COUNT;

    -- 2. Remover Agendamentos órfãos (tenant sumiu)
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

    -- 6. Remover COMANDAS ÓRFÃS (Orders vinculadas a Appointments que NÃO existem mais)
    -- Isso garante que se um agendamento foi excluído (lixeira), a comanda dele suma também.
    DELETE FROM public.orders
    WHERE appointment_id IS NOT NULL
    AND appointment_id NOT IN (SELECT id FROM public.appointments);
    GET DIAGNOSTICS deleted_orders_orphan = ROW_COUNT;

    -- 7. Remover Comandas de Tenants que não existem mais
    DELETE FROM public.orders
    WHERE tenant_id NOT IN (SELECT id FROM public.tenants);
    GET DIAGNOSTICS deleted_orders_tenant = ROW_COUNT;

    -- 8. Remover Transações órfãs
    DELETE FROM public.stock_transactions
    WHERE tenant_id NOT IN (SELECT id FROM public.tenants);
    GET DIAGNOSTICS deleted_transactions = ROW_COUNT;

    -- 9. Remover Clientes órfãos
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
        EXECUTE 'DELETE FROM public.customers WHERE tenant_id NOT IN (SELECT id FROM public.tenants)';
        GET DIAGNOSTICS deleted_customers = ROW_COUNT;
    END IF;

    -- Retornar estatísticas unificadas
    result := json_build_object(
        'deleted_profiles', deleted_profiles,
        'deleted_appointments', deleted_appointments,
        'deleted_products', deleted_products,
        'deleted_services', deleted_services,
        'deleted_supplies', deleted_supplies,
        'deleted_transactions', deleted_transactions,
        'deleted_customers', deleted_customers,
        'deleted_orders', (deleted_orders_orphan + deleted_orders_tenant)
    );

    RETURN result;
END;
$$;
