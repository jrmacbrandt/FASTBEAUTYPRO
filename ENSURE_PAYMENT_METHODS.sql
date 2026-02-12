-- Adicionar coluna payment_methods na tabela tenants se não existir
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '["PIX", "DINHEIRO", "CARTÃO", "DÉBITO"]'::jsonb;

-- Opcional: Atualizar o cache do schema
NOTIFY pgrst, 'reload config';
