-- ================================================================
-- 📊 RPCs DE SEGMENTAÇÃO CRM v7.0
-- Data: 2026-02-22
-- Objetivo: Criar 4 endpoints de segmentação de clientes para o
--           módulo de campanhas. Substitui filtros em memória.
-- Segurança: SECURITY DEFINER + tenant isolation
-- ================================================================

-- ──────────────────────────────────────────────────────────────────
-- FILTRO 1: BASE TOTAL (paginada, com contagem total)
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_crm_clients(
    p_tenant_id  UUID,
    p_page       INT DEFAULT 0,
    p_page_size  INT DEFAULT 50
)
RETURNS TABLE (
    id           UUID,
    name         TEXT,
    phone        TEXT,
    birth_month  SMALLINT,
    birth_date   TEXT,
    last_visit   TIMESTAMPTZ,
    total_spent  NUMERIC,
    stamps_count INTEGER,
    created_at   TIMESTAMPTZ,
    total_count  BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        c.id,
        c.name,
        c.phone,
        c.birth_month,
        c.birth_date,
        c.last_visit,
        COALESCE(c.total_spent, 0)       AS total_spent,
        COALESCE(cl.stamps_count, 0)     AS stamps_count,
        c.created_at,
        COUNT(*) OVER()                  AS total_count
    FROM public.clients c
    LEFT JOIN public.client_loyalty cl
        ON cl.tenant_id   = c.tenant_id
        AND cl.client_phone = c.phone
    WHERE c.tenant_id = p_tenant_id
    ORDER BY c.created_at DESC
    LIMIT  GREATEST(1, LEAST(p_page_size, 200))
    OFFSET (GREATEST(0, p_page) * GREATEST(1, LEAST(p_page_size, 200)));
$$;

-- ──────────────────────────────────────────────────────────────────
-- FILTRO 2: ANIVERSARIANTES DO MÊS
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_birthday_clients(
    p_tenant_id  UUID,
    p_month      SMALLINT DEFAULT NULL   -- NULL = mês atual do servidor
)
RETURNS TABLE (
    id           UUID,
    name         TEXT,
    phone        TEXT,
    birth_month  SMALLINT,
    birth_date   TEXT,
    total_spent  NUMERIC,
    last_visit   TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        c.id,
        c.name,
        c.phone,
        c.birth_month,
        c.birth_date,
        COALESCE(c.total_spent, 0) AS total_spent,
        c.last_visit
    FROM public.clients c
    WHERE c.tenant_id   = p_tenant_id
      AND c.birth_month = COALESCE(p_month, EXTRACT(MONTH FROM NOW())::SMALLINT)
    ORDER BY c.name ASC;
$$;

-- ──────────────────────────────────────────────────────────────────
-- FILTRO 3: RISCO DE EVASÃO (Churn Risk)
-- Usa crm_churn_days do tenant quando disponível
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_churn_risk_clients(
    p_tenant_id UUID,
    p_days      INT DEFAULT NULL         -- NULL = usa tenant.crm_churn_days (default 45)
)
RETURNS TABLE (
    id              UUID,
    name            TEXT,
    phone           TEXT,
    last_visit      TIMESTAMPTZ,
    days_inactive   INT,
    total_spent     NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH tenant_config AS (
        SELECT COALESCE(p_days, crm_churn_days, 45) AS churn_days
        FROM public.tenants
        WHERE id = p_tenant_id
    )
    SELECT
        c.id,
        c.name,
        c.phone,
        c.last_visit,
        EXTRACT(DAY FROM NOW() - c.last_visit)::INT AS days_inactive,
        COALESCE(c.total_spent, 0) AS total_spent
    FROM public.clients c, tenant_config tc
    WHERE c.tenant_id = p_tenant_id
      AND c.last_visit IS NOT NULL
      AND c.last_visit < NOW() - (tc.churn_days || ' days')::INTERVAL
    ORDER BY c.last_visit ASC;      -- Mais inativos primeiro
$$;

-- ──────────────────────────────────────────────────────────────────
-- FILTRO 4: CLIENTES VIP
-- Estratégia dupla: top 20% por total_spent OU acima do threshold
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_vip_clients(
    p_tenant_id UUID,
    p_threshold DECIMAL DEFAULT NULL    -- NULL = usa tenant.crm_vip_threshold (default 500)
)
RETURNS TABLE (
    id           UUID,
    name         TEXT,
    phone        TEXT,
    total_spent  NUMERIC,
    stamps_count INTEGER,
    vip_rank     INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH tenant_config AS (
        SELECT COALESCE(p_threshold, crm_vip_threshold, 500)::DECIMAL AS vip_threshold
        FROM public.tenants
        WHERE id = p_tenant_id
    ),
    ranked AS (
        SELECT
            c.id,
            c.name,
            c.phone,
            COALESCE(c.total_spent, 0)    AS total_spent,
            COALESCE(cl.stamps_count, 0)  AS stamps_count,
            NTILE(5) OVER (ORDER BY c.total_spent DESC NULLS LAST) AS quintile,
            ROW_NUMBER() OVER (ORDER BY c.total_spent DESC NULLS LAST) AS vip_rank
        FROM public.clients c
        LEFT JOIN public.client_loyalty cl
            ON cl.tenant_id    = c.tenant_id
            AND cl.client_phone = c.phone
        WHERE c.tenant_id  = p_tenant_id
          AND c.total_spent > 0
    )
    SELECT
        r.id,
        r.name,
        r.phone,
        r.total_spent,
        r.stamps_count,
        r.vip_rank::INT
    FROM ranked r, tenant_config tc
    WHERE r.quintile = 1                     -- Top 20%
       OR r.total_spent >= tc.vip_threshold  -- OU acima do limite configurado
    ORDER BY r.total_spent DESC;
$$;

-- ──────────────────────────────────────────────────────────────────
-- PERMISSÕES
-- ──────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.get_crm_clients(UUID, INT, INT)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_birthday_clients(UUID, SMALLINT)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_churn_risk_clients(UUID, INT)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vip_clients(UUID, DECIMAL)          TO authenticated;

-- ================================================================
-- 🔍 VALIDAÇÃO:
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_name LIKE 'get_%_clients' OR routine_name LIKE 'get_crm%';
-- ================================================================
