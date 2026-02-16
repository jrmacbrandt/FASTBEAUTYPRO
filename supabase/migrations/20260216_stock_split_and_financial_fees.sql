
-- ================================================================
-- 📦 MIGRATION: ESTOQUE DUPLO E TAXAS FINANCEIRAS v7.0
-- ================================================================

-- 1. ADICIONAR CONFIGURAÇÕES DE TAXAS AOS TENANTS
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS fee_percent_pix DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_percent_cash DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_percent_credit DECIMAL DEFAULT 4.99,
ADD COLUMN IF NOT EXISTS fee_percent_debit DECIMAL DEFAULT 1.99;

-- 2. DETALHAMENTO DE PEDIDOS (SERVIÇOS VS PRODUTOS + TAXAS)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS service_total DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS product_total DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS fee_amount_services DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_amount_products DECIMAL DEFAULT 0;

-- 3. CRIAR TABELA DE INSUMOS (SEPARADA DE PRODUTOS)
CREATE TABLE IF NOT EXISTS supplies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    unit_type TEXT DEFAULT 'un',
    current_stock INTEGER DEFAULT 0,
    min_threshold INTEGER DEFAULT 0,
    cost_price DECIMAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SEGURANÇA RLS PARA INSUMOS
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'supplies_universal_access') THEN
        CREATE POLICY "supplies_universal_access" ON supplies FOR ALL TO authenticated
        USING (public.is_master() OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (public.is_master() OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- 5. HISTÓRICO PARA INSUMOS
ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS supply_id UUID REFERENCES supplies(id) ON DELETE CASCADE;

COMMIT;
