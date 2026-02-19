
-- ================================================================
-- 📦 MIGRATION: ADICIONAR COLUNAS DE COMISSÃO E ITENS v8.0
-- ================================================================

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN orders.commission_amount IS 'Valor total da comissão gerada para o profissional nesta comanda';
COMMENT ON COLUMN orders.items IS 'Cópia dos itens (serviços e produtos) incluídos no momento da finalização';
