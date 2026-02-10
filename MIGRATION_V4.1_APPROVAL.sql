-- ================================================================
-- MIGRATION V4.1: SISTEMA DE APROVAÇÃO, CUPONS E PLANOS
-- ================================================================

-- 1. ESTRUTURA DE CUPONS
-- Permite liberar acesso via código promocional
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- ex: "ESTUDANTE2024", "VIP", "FREELA"
    discount_type TEXT NOT NULL, -- "percentage", "fixed", "free_trial", "full_access"
    discount_value NUMERIC DEFAULT 0, -- 10 (%), 50 (R$), 30 (dias), 0 (se full_access)
    duration_months INT DEFAULT 0, -- 0 = Vitalício/Indeterminado
    max_uses INT DEFAULT 999999,
    used_count INT DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    active BOOLEAN DEFAULT true
);

-- RLS Coupons (Apenas Master pode criar, qualquer auth pode ler se tiver o código)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Master CRUD coupons" ON coupons;
CREATE POLICY "Master CRUD coupons" ON coupons 
    FOR ALL 
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
    );

DROP POLICY IF EXISTS "Public read active coupons" ON coupons;
CREATE POLICY "Public read active coupons" ON coupons 
    FOR SELECT 
    USING (active = true);


-- 2. ATUALIZAÇÃO DA TABELA TENANTS
-- Adiciona colunas para controle de status e assinatura
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_approval'; -- pending_approval, active, suspended
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'trial'; -- trial, pro, unlimited
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS coupon_used TEXT;

-- Atualizar tenants existentes para ACTIVE e UNLIMITED (Regra de Ouro: Sem regressão)
UPDATE tenants 
SET status = 'active', 
    subscription_plan = 'unlimited' 
WHERE status IS NULL OR status = 'pending_approval' OR status = '';

-- INDEX para performance
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
