
-- ================================================================
-- 🧠 SMART PURGE & AGGREGATION SYSTEM (v1.0)
-- Objetivo: Manter apenas 3 meses de dados granulares enquanto preserva
--           inteligência financeira e histórico de comissões.
-- ================================================================

BEGIN;

-- 1. Tabela para Resumos Mensais (Faturamento e Atendimentos)
-- Permite que gráficos anuais continuem funcionando sem as linhas detalhadas.
CREATE TABLE IF NOT EXISTS public.monthly_summaries (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    year              SMALLINT NOT NULL,
    month             SMALLINT NOT NULL,
    total_revenue     DECIMAL DEFAULT 0,
    appointments_qty  INTEGER DEFAULT 0,
    total_commissions DECIMAL DEFAULT 0,
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, year, month)
);

-- 2. Tabela para Histórico Persistente de Comissões
-- Garante que o profissional nunca perca o registro do que ganhou.
CREATE TABLE IF NOT EXISTS public.professional_commissions_ledger (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    professional_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount            DECIMAL NOT NULL,
    original_date     TIMESTAMPTZ NOT NULL,
    order_ref         UUID, -- ID original (APENAS REFERÊNCIA)
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_lookup ON public.monthly_summaries(tenant_id, year, month);
CREATE INDEX IF NOT EXISTS idx_commissions_ledger_prof ON public.professional_commissions_ledger(professional_id, original_date);

-- 3. Função Principal de FAXINA INTELIGENTE (Smart Purge)
CREATE OR REPLACE FUNCTION admin_perform_smart_purge()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_retention_date TIMESTAMPTZ := NOW() - INTERVAL '3 months';
    v_archived_commissions INT := 0;
    v_summaries_updated INT := 0;
    v_deleted_appointments INT := 0;
    v_deleted_orders INT := 0;
    r RECORD;
BEGIN
    -- [FASE 1] Arquivar Comissões Atômicas (Ledger)
    -- Copia dados de 'orders' (pagas) para o ledger persistente se ainda não existirem
    INSERT INTO public.professional_commissions_ledger (tenant_id, professional_id, amount, original_date, order_ref)
    SELECT 
        o.tenant_id, 
        a.barber_id, 
        o.commission_amount, 
        o.finalized_at, 
        o.id
    FROM public.orders o
    JOIN public.appointments a ON o.appointment_id = a.id
    WHERE o.status = 'paid' 
    AND o.finalized_at < v_retention_date
    AND NOT EXISTS (SELECT 1 FROM public.professional_commissions_ledger WHERE order_ref = o.id);
    
    GET DIAGNOSTICS v_archived_commissions = ROW_COUNT;

    -- [FASE 2] Atualizar/Inserir Resumos Mensais (Aggregates)
    FOR r IN 
        SELECT 
            tenant_id,
            EXTRACT(YEAR FROM finalized_at)::SMALLINT as v_year,
            EXTRACT(MONTH FROM finalized_at)::SMALLINT as v_month,
            SUM(total_value) as v_revenue,
            SUM(commission_amount) as v_comm,
            COUNT(*) as v_qty
        FROM public.orders
        WHERE status = 'paid' AND finalized_at < v_retention_date
        GROUP BY tenant_id, v_year, v_month
    LOOP
        INSERT INTO public.monthly_summaries (tenant_id, year, month, total_revenue, appointments_qty, total_commissions)
        VALUES (r.tenant_id, r.v_year, r.v_month, r.v_revenue, r.v_qty, r.v_comm)
        ON CONFLICT (tenant_id, year, month) DO UPDATE SET
            total_revenue = public.monthly_summaries.total_revenue + EXCLUDED.total_revenue,
            appointments_qty = public.monthly_summaries.appointments_qty + EXCLUDED.appointments_qty,
            total_commissions = public.monthly_summaries.total_commissions + EXCLUDED.total_commissions,
            updated_at = NOW();
        v_summaries_updated := v_summaries_updated + 1;
    END LOOP;

    -- [FASE 3] Deletar dados granulares antigos
    -- Orders primeiro (filhos)
    DELETE FROM public.orders 
    WHERE (finalized_at < v_retention_date OR created_at < v_retention_date);
    GET DIAGNOSTICS v_deleted_orders = ROW_COUNT;

    -- Appointments (pais)
    DELETE FROM public.appointments 
    WHERE scheduled_at < v_retention_date;
    GET DIAGNOSTICS v_deleted_appointments = ROW_COUNT;

    RETURN json_build_object(
        'success', TRUE,
        'archived_commissions', v_archived_commissions,
        'summaries_updated', v_summaries_updated,
        'deleted_orders', v_deleted_orders,
        'deleted_appointments', v_deleted_appointments,
        'retention_limit', v_retention_date
    );
END;
$$;

COMMIT;
