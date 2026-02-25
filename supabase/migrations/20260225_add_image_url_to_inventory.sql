-- ================================================================
-- 📦 MIGRATION: ADICIONAR COLUNA DE IMAGEM AO ESTOQUE
-- ================================================================

-- 1. ADICIONAR image_url À TABELA products
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. ADICIONAR image_url À TABELA supplies
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMIT;
