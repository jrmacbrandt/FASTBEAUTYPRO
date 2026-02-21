-- ================================================================
-- 🏆 ADIÇÃO DE CONFIGURAÇÃO DE PRÊMIOS DE FIDELIDADE
-- ================================================================
-- Finalidade: Armazenar as escolhas de serviço e produto que 
-- servirão como prêmios para o cartão fidelidade e campanhas.
-- ================================================================

BEGIN;

-- 1. Adicionar colunas para referenciar os prêmios
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS loyalty_reward_service_id UUID REFERENCES public.services(id),
ADD COLUMN IF NOT EXISTS loyalty_reward_product_id UUID REFERENCES public.products(id);

-- 2. Grant de permissões (garantir que o admin possa editar)
-- Geralmente os grants já estão por tabela, mas garantimos aqui se necessário.

COMMIT;

-- 🔍 VALIDAÇÃO
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'tenants' AND column_name LIKE 'loyalty_reward%';
