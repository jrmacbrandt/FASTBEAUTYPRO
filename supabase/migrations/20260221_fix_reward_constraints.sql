-- ================================================================
-- 🛠️ CORREÇÃO DE CONSTRAINT UNIQUE PARA UPSERT DE PRÊMIOS
-- ================================================================
-- Finalidade: Garantir que as tabelas de recompensas tenham a 
-- constraint UNIQUE(tenant_id) necessária para o funcionamento do UPSERT.
-- ================================================================

BEGIN;

-- 1. Adicionar UNIQUE constraint para Serviços de Recompensa
-- Primeiro removemos caso já exista (prevenção) e adicionamos de forma explícita
ALTER TABLE public.loyalty_rewards_services 
DROP CONSTRAINT IF EXISTS loyalty_rewards_services_tenant_id_key;

ALTER TABLE public.loyalty_rewards_services 
ADD CONSTRAINT loyalty_rewards_services_tenant_id_key UNIQUE (tenant_id);

-- 2. Adicionar UNIQUE constraint para Produtos de Recompensa
ALTER TABLE public.loyalty_rewards_products 
DROP CONSTRAINT IF EXISTS loyalty_rewards_products_tenant_id_key;

ALTER TABLE public.loyalty_rewards_products 
ADD CONSTRAINT loyalty_rewards_products_tenant_id_key UNIQUE (tenant_id);

COMMIT;

-- 🔍 VALIDAÇÃO (Opcional)
-- Verifique se as constraints foram criadas com:
-- SELECT conname, contype FROM pg_constraint WHERE conrelid IN ('loyalty_rewards_services'::regclass, 'loyalty_rewards_products'::regclass);
