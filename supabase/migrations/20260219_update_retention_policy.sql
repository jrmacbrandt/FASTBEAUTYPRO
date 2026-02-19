-- ================================================================
-- 🗑️ ATUALIZAÇÃO DA FUNÇÃO DE LIMPEZA (Retention Policy: 60 Dias)
-- ================================================================

CREATE OR REPLACE FUNCTION admin_cleanup_database()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_profiles INT := 0;
    deleted_appointments INT := 0;
    deleted_orders INT := 0;
    deleted_history_appointments INT := 0;
    result json;
BEGIN
    -- 1. Remover registros órfãos (Inquilinos que não existem mais)
    DELETE FROM public.appointments WHERE tenant_id NOT IN (SELECT id FROM public.tenants);
    GET DIAGNOSTICS deleted_appointments = ROW_COUNT;

    DELETE FROM public.orders WHERE tenant_id NOT IN (SELECT id FROM public.tenants);
    GET DIAGNOSTICS deleted_orders = ROW_COUNT;

    -- 2. POLÍTICA DE RETENÇÃO: Remover Histórico antigo (> 60 dias)
    -- Remover agendamentos finalizados ou ausentes com mais de 60 dias
    DELETE FROM public.appointments 
    WHERE status IN ('completed', 'absent') 
    AND scheduled_at < (NOW() - INTERVAL '60 days');
    GET DIAGNOSTICS deleted_history_appointments = ROW_COUNT;

    -- Remover comandas com mais de 60 dias
    DELETE FROM public.orders 
    WHERE created_at < (NOW() - INTERVAL '60 days');

    -- 3. Remover Profiles órfãos
    DELETE FROM public.profiles
    WHERE tenant_id IS NOT NULL 
    AND tenant_id NOT IN (SELECT id FROM public.tenants)
    AND role != 'master';
    GET DIAGNOSTICS deleted_profiles = ROW_COUNT;

    -- Retornar estatísticas consolidadas
    result := json_build_object(
        'deleted_profiles', deleted_profiles,
        'deleted_orphaned_appointments', deleted_appointments,
        'deleted_history_appointments_60d', deleted_history_appointments,
        'deleted_orders', deleted_orders
    );

    RETURN result;
END;
$$;
