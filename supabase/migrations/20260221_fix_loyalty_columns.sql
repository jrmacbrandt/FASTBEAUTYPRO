-- ================================================================
-- 🛠️ CORREÇÃO DE COLUNAS PARA PRÊMIOS DE FIDELIDADE
-- ================================================================
-- Finalidade: Adicionar colunas faltantes em 'services' e 'products'
-- para suportar imagens e identificação de prêmios.
-- ================================================================

BEGIN;

-- 1. Adicionar flag de recompensa (opcional, mas útil para filtros)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_reward BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_reward BOOLEAN DEFAULT FALSE;
ALTER TABLE public.supplies ADD COLUMN IF NOT EXISTS is_reward BOOLEAN DEFAULT FALSE;

-- 2. Garantir coluna de imagem em produtos e insumos (parece estar faltando em alguns ambientes)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.supplies ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMIT;

-- 🔍 NOTA: Se o erro persistir, execute 'NOTIFY pgrst, ''reload schema'';' no editor SQL do Supabase.
