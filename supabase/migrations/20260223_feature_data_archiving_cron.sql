-- ================================================================
-- ⚡ Migration: Data Archiving Automation (pg_cron)
-- Data: 2026-02-23
-- Objetivo: Criar rotina automática diária para arquivar dados velhos
-- ================================================================

-- 1. Habilitar a extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 2. Criar uma função "Wrapper" que itera sobre todos os tenants
-- O pg_cron roda comandos isolados, então precisamos de uma função 
-- que busque todos os tenants e chame a rotina de arquivamento para cada um.
CREATE OR REPLACE FUNCTION public.execute_global_tenant_archiving()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_tenant_record RECORD;
BEGIN
    -- Itera sobre todos os tenants ativos no sistema
    FOR v_tenant_record IN (SELECT id FROM public.tenants) LOOP
        -- Chama a função de arquivamento para o tenant atual
        PERFORM public.archive_tenant_history(v_tenant_record.id);
    END LOOP;
END;
$function$;

-- Prmissões (apenas service_role / cron precisa executar isso)
GRANT EXECUTE ON FUNCTION public.execute_global_tenant_archiving() TO service_role;

-- 3. Agendar o Job no pg_cron
-- Remove o job antigo se existir (para idempotência)
SELECT cron.unschedule('daily_data_archiving_job');

-- Cria um novo job que roda todo dia às 03:00 da manhã (madrugada)
-- Expressão Cron: '0 3 * * *' (Minuto 0, Hora 3, Todo dia, Todo mês, Todo dia da semana)
SELECT cron.schedule(
    'daily_data_archiving_job',  -- Nome do Job
    '0 3 * * *',                 -- Expressão Cron (Todo dia às 3AM)
    $$SELECT public.execute_global_tenant_archiving();$$ -- Comando a ser executado
);
