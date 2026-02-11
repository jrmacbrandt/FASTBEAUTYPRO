-- ================================================================
-- MIGRATION V5.0: GESTÃO DE ESTOQUE E INVENTÁRIO (MODULAR)
-- ================================================================

-- 1. TABELA DE PRODUTOS (ESTOQUE ATUAL)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    barcode TEXT, -- Código de barras EAN/UPC
    cost_price NUMERIC(10, 2) DEFAULT 0, -- Preço de Custo
    sale_price NUMERIC(10, 2) DEFAULT 0, -- Preço de Revenda (Opcional)
    current_stock INTEGER DEFAULT 0, -- Quantidade Atual
    min_threshold INTEGER DEFAULT 5, -- Estoque Mínimo para Alerta
    unit_type TEXT DEFAULT 'un', -- un, ml, g, kg, lt
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Produtos
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation products" ON products;
CREATE POLICY "Tenant isolation products" ON products
    FOR ALL
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));


-- 2. TABELA DE TRANSAÇÕES (AUDIT LOG - HISTÓRICO)
CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'IN' (Entrada), 'OUT' (Saída/Uso), 'ADJUSTMENT' (Correção)
    quantity INTEGER NOT NULL, -- Sempre positivo. O tipo define se soma ou subtrai.
    reason TEXT, -- 'Compra', 'Uso no Serviço #123', 'Quebra', 'Correção'
    cost_at_time NUMERIC(10, 2), -- Custo no momento da transação (para média ponderada futura)
    created_by UUID REFERENCES profiles(id), -- Quem fez a ação
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Transações
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation stock_transactions" ON stock_transactions;
CREATE POLICY "Tenant isolation stock_transactions" ON stock_transactions
    FOR ALL
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));


-- 3. GATILHO: ATUALIZAÇÃO ATÔMICA DE ESTOQUE
-- Garante que o 'current_stock' na tabela produtos seja sempre a soma das transações
CREATE OR REPLACE FUNCTION update_stock_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for ENTRADA (Compra), SOMAR
    IF NEW.type = 'IN' THEN
        UPDATE products SET current_stock = current_stock + NEW.quantity
        WHERE id = NEW.product_id;
    
    -- Se for SAÍDA (Uso), SUBTRAIR
    ELSIF NEW.type = 'OUT' THEN
        UPDATE products SET current_stock = current_stock - NEW.quantity
        WHERE id = NEW.product_id;
        
    -- Se for AJUSTE (Inventário), o comportamento depende da lógica. 
    -- Vamos assumir que AJUSTE soma (se positivo) ou subtrai (se negativo, embora quantity seja int, type define).
    -- Para simplificar: AJUSTE segue a mesma lógica de entrada/saída manualmente ou implementamos 'RESET'.
    -- V1: Vamos tratar ADJUSTMENT como uma correção que SOMA (ex: achou produto perdido) ou temos que colocar negativo?
    -- MELHORIA: Vamos forçar ADUSTMENT_ADD e ADJUSTMENT_SUB no Frontend.
    -- Por padrão, se for genérico, vamos assumir que o sistema manda a diferença.
    ELSIF NEW.type = 'ADJUSTMENT_ADD' THEN
         UPDATE products SET current_stock = current_stock + NEW.quantity
         WHERE id = NEW.product_id;
    ELSIF NEW.type = 'ADJUSTMENT_SUB' THEN
         UPDATE products SET current_stock = current_stock - NEW.quantity
         WHERE id = NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock ON stock_transactions;
CREATE TRIGGER trigger_update_stock
AFTER INSERT ON stock_transactions
FOR EACH ROW
EXECUTE FUNCTION update_stock_level();


-- 4. GATILHO: ALERTA DE ESTOQUE BAIXO
-- Se cair abaixo do mínimo, insere notificação (Se a tabela notifications existir)
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
DECLARE
    curr_stock INTEGER;
    min_thresh INTEGER;
    prod_name TEXT;
    ten_id UUID;
BEGIN
    SELECT current_stock, min_threshold, name, tenant_id INTO curr_stock, min_thresh, prod_name, ten_id
    FROM products WHERE id = NEW.product_id;

    IF curr_stock <= min_thresh THEN
        -- Tenta inserir na tabela de notificações se ela existir (Falha silenciosa se não existir para não travar venda)
        BEGIN
            INSERT INTO notifications (tenant_id, title, message, type, priority, receiver_id)
            SELECT 
                ten_id,
                'Alerta de Estoque: ' || prod_name,
                'O produto ' || prod_name || ' atingiu o nível crítico (' || curr_stock || ').',
                'stock_alert',
                'high',
                id -- Enviar para todos os Admins/Owners da loja
            FROM profiles 
            WHERE tenant_id = ten_id AND (role = 'owner' OR role = 'admin');
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar erro se tabela notifications não existir
            RAISE NOTICE 'Tabela notifications não encontrada ou erro ao inserir alerta.';
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_low_stock_alert ON stock_transactions;
CREATE TRIGGER trigger_low_stock_alert
AFTER INSERT ON stock_transactions
FOR EACH ROW
EXECUTE FUNCTION check_low_stock();
