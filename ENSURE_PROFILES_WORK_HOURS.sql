-- Adicionar coluna work_hours na tabela profiles se não existir
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_hours JSONB DEFAULT '{}'::jsonb;

-- Opcional: Atualizar o cache do schema
NOTIFY pgrst, 'reload config';
