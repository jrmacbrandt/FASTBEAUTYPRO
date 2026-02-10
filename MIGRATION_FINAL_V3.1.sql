-- ================================================================
-- BIG BANG MIGRATION V3.1 - ESTABILIZAÇÃO & EXPANSÃO (FINAL)
-- ================================================================
-- Combina:
-- 1. Correção de colunas Tenants (status_pagamento)
-- 2. Tabelas de Fidelidade e Clube VIP
-- 3. Função de Exclusão em Cascata (Suprema)
-- 4. Políticas de Segurança (RLS)

-- A. CORREÇÃO DE ESTRUTURA (TENANTS)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'PENDENTE';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'barbearia';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- B. FUNÇÃO DE EXCLUSÃO
CREATE OR REPLACE FUNCTION delete_tenant_cascade(target_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    stmt TEXT;
BEGIN
    -- 1. FASE 1: Limpar filhos de 'orders'
    FOR r IN 
        SELECT 
            tc.table_name, 
            kcu.column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'orders'
        AND tc.table_schema = 'public'
    LOOP
        stmt := 'DELETE FROM "' || r.table_name || '" WHERE "' || r.column_name || '" IN (SELECT id FROM orders WHERE tenant_id = ' || quote_literal(target_tenant_id) || ')';
        EXECUTE stmt;
    END LOOP;

    -- 2. FASE 2: Deletar ordens
    DELETE FROM orders WHERE tenant_id = target_tenant_id;

    -- 3. FASE 3: Limpar filhos diretos de 'tenants'
    FOR r IN 
        SELECT 
            tc.table_name, 
            kcu.column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'tenants'
        AND tc.table_schema = 'public'
    LOOP
        stmt := 'DELETE FROM "' || r.table_name || '" WHERE "' || r.column_name || '" = ' || quote_literal(target_tenant_id);
        EXECUTE stmt;
    END LOOP;

    -- 4. FASE 4: Finalmente, Excluir o Tenant
    DELETE FROM tenants WHERE id = target_tenant_id;
END;
$$;

-- C. NOVAS TABELAS (LOYALTY & VIP)
CREATE TABLE IF NOT EXISTS client_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    client_phone TEXT,
    plan_name TEXT, -- ex: 'VIP Gold'
    status TEXT DEFAULT 'ATIVO',
    benefits JSONB, -- ex: {"corte": 2, "barba": 2}
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_loyalty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    client_phone TEXT,
    stamps_count INTEGER DEFAULT 0,
    service_id TEXT, -- Serviço que gerou o selo
    last_stamp_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- D. INDICES E SEGURANÇA
CREATE INDEX IF NOT EXISTS idx_subs_tenant ON client_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tenant ON client_loyalty(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subs_phone ON client_subscriptions(client_phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_phone ON client_loyalty(client_phone);

ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_loyalty ENABLE ROW LEVEL SECURITY;

-- E. POLÍTICAS RLS (CORRIGIDAS)
DROP POLICY IF EXISTS "Tenant isolation" ON client_subscriptions;
CREATE POLICY "Tenant isolation" ON client_subscriptions FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation loyalty" ON client_loyalty;
CREATE POLICY "Tenant isolation loyalty" ON client_loyalty FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- FIM DO SCRIPT
