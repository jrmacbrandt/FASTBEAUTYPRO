-- ================================================================
-- 🗃 CRM CONSOLIDATION v7.0
-- Data: 2026-02-22
-- Objetivo: Adicionar client_id a client_loyalty, coluna birth_month
--           computada em clients, tabela client_rewards, e índices CRM.
-- Estratégia: Zero-downtime, colunas nullable, backward-compatible.
-- ================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────
-- 1. ADICIONAR client_id EM client_loyalty (nullable, backward-compat)
--    client_phone é mantido para não quebrar código existente.
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE public.client_loyalty
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Backfill: preencher client_id com base no phone + tenant
UPDATE public.client_loyalty cl
SET client_id = c.id
FROM public.clients c
WHERE cl.tenant_id = c.tenant_id
  AND cl.client_phone = c.phone
  AND cl.client_id IS NULL;

-- Índice para lookup por client_id
CREATE INDEX IF NOT EXISTS idx_client_loyalty_client_id
    ON public.client_loyalty (client_id)
    WHERE client_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────
-- 2. COLUNA birth_month EM clients (coluna real para compatibilidade
--    com PostgreSQL em versões sem GENERATED ALWAYS + expressão regex)
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS birth_month SMALLINT;

-- Backfill: calcular mês a partir de birth_date existente
UPDATE public.clients
SET birth_month = CASE
    WHEN birth_date ~ '^\d{4}-\d{2}-\d{2}$' THEN
        EXTRACT(MONTH FROM birth_date::DATE)::SMALLINT
    ELSE NULL
END
WHERE birth_month IS NULL AND birth_date IS NOT NULL;

-- Índice para filtro de aniversariantes (CRM)
CREATE INDEX IF NOT EXISTS idx_clients_birth_month
    ON public.clients (tenant_id, birth_month)
    WHERE birth_month IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────
-- 3. CRIAR TABELA client_rewards (recompensas disponíveis por cliente)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_rewards (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    client_phone  TEXT,
    reward_type   TEXT NOT NULL CHECK (reward_type IN ('service', 'product')),
    reward_ref_id UUID,
    status        TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'redeemed', 'expired')),
    granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    redeemed_at   TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ,
    notes         TEXT
);

-- RLS
ALTER TABLE public.client_rewards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS client_rewards_tenant_isolation ON public.client_rewards;
    CREATE POLICY client_rewards_tenant_isolation ON public.client_rewards
        FOR ALL TO authenticated
        USING (
            tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
            OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
        )
        WITH CHECK (
            tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
            OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
        );
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_client_rewards_client_status
    ON public.client_rewards (client_id, status);

CREATE INDEX IF NOT EXISTS idx_client_rewards_tenant_status
    ON public.client_rewards (tenant_id, status, granted_at DESC);

-- ──────────────────────────────────────────────────────────────────
-- 4. ÍNDICES DE PERFORMANCE PARA FILTROS CRM
-- ──────────────────────────────────────────────────────────────────

-- Filtro Churn Risk (clientes inativos)
CREATE INDEX IF NOT EXISTS idx_clients_last_visit
    ON public.clients (tenant_id, last_visit ASC)
    WHERE last_visit IS NOT NULL;

-- Filtro VIP (maior gasto)
CREATE INDEX IF NOT EXISTS idx_clients_total_spent
    ON public.clients (tenant_id, total_spent DESC)
    WHERE total_spent IS NOT NULL AND total_spent > 0;

-- Base Total paginada
CREATE INDEX IF NOT EXISTS idx_clients_created_at
    ON public.clients (tenant_id, created_at DESC);

COMMIT;

-- ================================================================
-- 🔍 VALIDAÇÃO (Rodar após migration):
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'client_loyalty';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'clients';
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'client_rewards';
-- ================================================================
