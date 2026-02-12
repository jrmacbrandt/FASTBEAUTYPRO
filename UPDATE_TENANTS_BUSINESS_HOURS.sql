-- Adicionar coluna business_hours na tabela tenants se não existir
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}'::jsonb;

-- Opcional: Atualizar o cache do schema
NOTIFY pgrst, 'reload config';
