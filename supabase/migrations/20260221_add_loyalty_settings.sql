-- ================================================================
-- 🏆 ADIÇÃO DE CONFIGURAÇÕES DE FIDELIDADE AO TENANT
-- ================================================================

BEGIN;

-- 1. Adicionar colunas de controle de fidelidade
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS loyalty_target INTEGER DEFAULT 5;

COMMIT;
