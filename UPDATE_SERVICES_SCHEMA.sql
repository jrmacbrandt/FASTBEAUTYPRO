-- Adicionar coluna image_url na tabela services se não existir
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Opcional: Atualizar o cache do schema (o Supabase faz isso automaticamente na maioria das vezes, mas forçar um reload pode ajudar)
NOTIFY pgrst, 'reload config';
