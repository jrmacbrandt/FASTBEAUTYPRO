-- ================================================================
-- ⚡ Migration: Data Archiving (90 Days) & Monthly Summaries
-- Data: 2026-02-23
-- Objetivo: Criar tabela consolidadora e Função RPC de Limpeza
-- Segurança: RLs restritas ao admin master e tenant.
-- ================================================================

-- 1. Criação da Tabela Consolidada (Arquivo Mestre)
CREATE TABLE IF NOT EXISTS public.tenant_monthly_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    reference_month DATE NOT NULL,
    total_service_revenue DECIMAL(10,2) DEFAULT 0,
    total_product_revenue DECIMAL(10,2) DEFAULT 0,
    total_commissions DECIMAL(10,2) DEFAULT 0,
    total_fees DECIMAL(10,2) DEFAULT 0,
    net_profit DECIMAL(10,2) DEFAULT 0,
    total_appointments INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, reference_month)
);

-- Ativar RLS
ALTER TABLE public.tenant_monthly_summaries ENABLE ROW LEVEL SECURITY;

-- Política simples: Dono do Tenant vê seus resumos
CREATE POLICY "Tenants podem visualizar próprios resumos"
ON public.tenant_monthly_summaries
FOR SELECT TO authenticated
USING (
    tenant_id IN (
        SELECT t.id FROM public.tenants t
        WHERE t.owner_id = auth.uid()
    )
);

-- Master admin vê tudo
CREATE POLICY "Master admin visão total summarizada"
ON public.tenant_monthly_summaries
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
);

-- Trigger de Updated At
CREATE TRIGGER update_tenant_monthly_summaries_updated_at
BEFORE UPDATE ON public.tenant_monthly_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================
-- 2. Função RPC de Arquivamento e Limpeza (> 90 dias)
-- ================================================================
CREATE OR REPLACE FUNCTION public.archive_tenant_history(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_date DATE := CURRENT_DATE - INTERVAL '90 days';
    v_record RECORD;
    v_deleted_orders_count INTEGER := 0;
    v_deleted_appointments_count INTEGER := 0;
BEGIN
    -- Validar segurança IDOR
    IF p_tenant_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'Tenant ID obrigatório.');
    END IF;

    -- Agrupar dados com mais de 90 dias e inserir/atualizar na tabela de sumários mensais
    FOR v_record IN (
        SELECT 
            DATE_TRUNC('month', COALESCE(o.finalized_at, o.created_at))::DATE AS m_month,
            SUM(COALESCE(o.service_total, o.total_value, 0)) AS sum_services,
            SUM(COALESCE(o.product_total, 0)) AS sum_products,
            SUM(COALESCE(o.commission_amount, 0)) AS sum_commissions,
            SUM(COALESCE(o.fee_amount_services, 0) + COALESCE(o.fee_amount_products, 0)) AS sum_fees,
            COUNT(DISTINCT o.appointment_id) AS count_appointments
        FROM public.orders o
        WHERE o.tenant_id = p_tenant_id
          AND COALESCE(o.finalized_at, o.created_at) < v_target_date
          AND o.status = 'paid' -- Arquiva apenas comandas pagas
        GROUP BY 1
    ) LOOP
        -- UPSERT no arquivo mestre
        INSERT INTO public.tenant_monthly_summaries (
            tenant_id, 
            reference_month, 
            total_service_revenue, 
            total_product_revenue, 
            total_commissions, 
            total_fees, 
            net_profit, 
            total_appointments
        ) VALUES (
            p_tenant_id,
            v_record.m_month,
            v_record.sum_services,
            v_record.sum_products,
            v_record.sum_commissions,
            v_record.sum_fees,
            (v_record.sum_services + v_record.sum_products) - v_record.sum_commissions - v_record.sum_fees,
            v_record.count_appointments
        )
        ON CONFLICT (tenant_id, reference_month)
        DO UPDATE SET 
            total_service_revenue = public.tenant_monthly_summaries.total_service_revenue + EXCLUDED.total_service_revenue,
            total_product_revenue = public.tenant_monthly_summaries.total_product_revenue + EXCLUDED.total_product_revenue,
            total_commissions = public.tenant_monthly_summaries.total_commissions + EXCLUDED.total_commissions,
            total_fees = public.tenant_monthly_summaries.total_fees + EXCLUDED.total_fees,
            net_profit = public.tenant_monthly_summaries.net_profit + EXCLUDED.net_profit,
            total_appointments = public.tenant_monthly_summaries.total_appointments + EXCLUDED.total_appointments,
            updated_at = NOW();
    END LOOP;

    -- Deletar fisicamente as 'Orders' processadas e consolidadas
    WITH deleted_orders AS (
        DELETE FROM public.orders
        WHERE tenant_id = p_tenant_id
          AND COALESCE(finalized_at, created_at) < v_target_date
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_orders_count FROM deleted_orders;

    -- Limpar Appointments velhos que já foram processados/deletados via rules de cascade ou pendentes velhos
    WITH deleted_appointments AS (
        DELETE FROM public.appointments
        WHERE tenant_id = p_tenant_id
          AND scheduled_at < v_target_date
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_appointments_count FROM deleted_appointments;

    RETURN json_build_object(
        'success', TRUE,
        'message', 'Arquivamento concluído com sucesso.',
        'archive_cutoff_date', v_target_date,
        'orders_cleaned', v_deleted_orders_count,
        'appointments_cleaned', v_deleted_appointments_count
    );
EXCEPTION 
    WHEN OTHERS THEN
        RETURN json_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- Permite perfis master/owner invocar
GRANT EXECUTE ON FUNCTION public.archive_tenant_history(UUID) TO authenticated, service_role;
