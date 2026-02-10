-- ================================================================
-- CORREÇÃO CRÍTICA: ADICIONAR COLUNA 'ACTIVE'
-- ================================================================
-- O recurso de Pausar/Despausar não estava funcionando porque
-- a coluna 'active' não existia na tabela 'tenants'.

-- 1. Adiciona a coluna se não existir
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 2. Garante que todos os tenants atuais estejam ativos
UPDATE tenants SET active = true WHERE active IS NULL;

-- 3. Confirmação (Opcional, apenas visualização)
-- SELECT id, name, active FROM tenants;
