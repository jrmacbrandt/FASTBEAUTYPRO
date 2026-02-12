-- Adicionar coluna loyalty_target na tabela tenants se não existir
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS loyalty_target INTEGER DEFAULT 5;

-- Opcional: Atualizar o cache do schema
NOTIFY pgrst, 'reload config';
