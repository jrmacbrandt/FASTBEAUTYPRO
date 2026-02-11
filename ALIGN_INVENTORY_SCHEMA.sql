-- ================================================================
-- ALIGNMENT MIGRATION: PRODUCTS & TRIGGERS
-- ================================================================

-- 1. ALINHAR TABELA PRODUCTS (Suporte a Legado)
-- Renomear colunas antigas se existirem, ou criar novas se faltarem

DO $$
BEGIN
    -- Se existir 'min_stock' e não 'min_threshold', renomear
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='min_stock') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='min_threshold') THEN
        ALTER TABLE products RENAME COLUMN min_stock TO min_threshold;
    END IF;

    -- Se existir 'price' e não 'sale_price', renomear
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='sale_price') THEN
        ALTER TABLE products RENAME COLUMN price TO sale_price;
    END IF;

    -- Se existir 'image_url' e não 'photo_url', renomear
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_url') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='photo_url') THEN
        ALTER TABLE products RENAME COLUMN image_url TO photo_url;
    END IF;
END $$;

-- Adicionar colunas novas se não existirem
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'un';
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;

-- Garantir existência de stock_transactions (já criado no passo anterior, mas reforçando)
CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. GATILHO DE VENDA (Checkout -> Estoque)
-- Quando um item de pedido é criado, se for um produto, gerar transação de SAÍDA.
-- OBS: Assumindo que 'order_items' tem 'product_id' não nulo para produtos.

CREATE OR REPLACE FUNCTION deduct_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- Apenas se for produto (product_id não nulo)
    IF NEW.product_id IS NOT NULL THEN
        INSERT INTO stock_transactions (tenant_id, product_id, type, quantity, reason)
        VALUES (
            (SELECT tenant_id FROM orders WHERE id = NEW.order_id), -- Buscar Tenant da Order
            NEW.product_id,
            'OUT',
            NEW.quantity,
            'Venda: Pedido ' || NEW.order_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- O gatilho dispara ao inserir no order_items? 
-- Risco: Se o pedido for cancelado ou for apenas um "Carrinho" não pago.
-- Melhor: Disparar apenas quando o PEDIDO mudar para 'PAID'.

DROP TRIGGER IF EXISTS trigger_deduct_stock_item ON order_items;
-- (Não vamos usar trigger no item direto por enquanto para evitar baixa em carrinho abandonado)


-- LÓGICA CONFIRMADA: Trigger na tabela ORDERS quando status mudar para 'paid'
CREATE OR REPLACE FUNCTION process_order_stock_deduction()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    -- Se status mudou para 'completed' (finalizado/pago) e antes não era
    IF (NEW.status = 'completed') AND (OLD.status <> 'completed') THEN
        
        -- Loop nos itens do pedido
        FOR item IN SELECT * FROM order_items WHERE order_id = NEW.id LOOP
            IF item.product_id IS NOT NULL THEN
                INSERT INTO stock_transactions (tenant_id, product_id, type, quantity, reason, created_by)
                VALUES (
                    NEW.tenant_id,
                    item.product_id,
                    'OUT',
                    item.quantity,
                    'Venda Finalizada: ' || NEW.id,
                    NEW.barber_id -- ou quem fechou
                );
            END IF;
        END LOOP;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_process_stock_sale ON orders;
CREATE TRIGGER trigger_process_stock_sale
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION process_order_stock_deduction();

