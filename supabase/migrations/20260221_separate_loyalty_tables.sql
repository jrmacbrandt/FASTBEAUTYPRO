-- ================================================================
-- 🏆 SEPARAÇÃO DE TABELAS DE PRÊMIOS DE FIDELIDADE (CORTESIA)
-- ================================================================
-- Finalidade: Criar tabelas independentes para Serviços e Produtos 
-- de recompensa, garantindo que não se misturem com o catálogo principal.
-- ================================================================

BEGIN;

-- 1. Tabela Separada para Serviços de Recompensa
CREATE TABLE IF NOT EXISTS public.loyalty_rewards_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 0,
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela Separada para Produtos de Recompensa
CREATE TABLE IF NOT EXISTS public.loyalty_rewards_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    barcode TEXT,
    current_stock INTEGER DEFAULT 0,
    min_threshold INTEGER DEFAULT 0,
    unit_type TEXT DEFAULT 'un',
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Atualizar a tabela tenants para referenciar as novas tabelas
-- Removemos as antigas (se existirem) e criamos as novas referências
ALTER TABLE public.tenants 
DROP COLUMN IF EXISTS loyalty_reward_service_id,
DROP COLUMN IF EXISTS loyalty_reward_product_id;

ALTER TABLE public.tenants 
ADD COLUMN loyalty_reward_service_id UUID REFERENCES public.loyalty_rewards_services(id) ON DELETE SET NULL,
ADD COLUMN loyalty_reward_product_id UUID REFERENCES public.loyalty_rewards_products(id) ON DELETE SET NULL;

-- 4. Habilitar RLS e criar políticas de isolamento
ALTER TABLE public.loyalty_rewards_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards_products ENABLE ROW LEVEL SECURITY;

-- Políticas para Serviços de Recompensa
CREATE POLICY loyalty_rewards_services_isolation ON public.loyalty_rewards_services 
FOR ALL TO authenticated 
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'master')
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'master');

-- Políticas para Produtos de Recompensa
CREATE POLICY loyalty_rewards_products_isolation ON public.loyalty_rewards_products 
FOR ALL TO authenticated 
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'master')
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'master');

COMMIT;

-- 🔍 VALIDAÇÃO
-- SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'loyalty_rewards%';
