-- ================================================================
-- ⚡ CORREÇÃO DE ESTOQUE: Atomic Stock Depletion Fix
-- Data: 2026-03-03
-- Objetivo: Prevenir subtração dupla e estoque negativo (-1)
-- ================================================================

-- 1. ATUALIZAR GATILHO (TRIGGER) PARA BLOQUEAR ESTOQUE NEGATIVO
CREATE OR REPLACE FUNCTION public.update_stock_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for ENTRADA (Compra), SOMAR
    IF UPPER(NEW.type) = 'IN' THEN
        UPDATE products SET current_stock = current_stock + NEW.quantity
        WHERE id = NEW.product_id;
    
    -- Se for SAÍDA (Uso/Venda), SUBTRAIR COM TRAVA MÍNIMA DE ZERO
    ELSIF UPPER(NEW.type) = 'OUT' THEN
        UPDATE products SET current_stock = GREATEST(0, current_stock - NEW.quantity)
        WHERE id = NEW.product_id;
        
    -- Ajustes Positivos
    ELSIF UPPER(NEW.type) = 'ADJUSTMENT_ADD' THEN
         UPDATE products SET current_stock = current_stock + NEW.quantity
         WHERE id = NEW.product_id;
         
    -- Ajustes Negativos
    ELSIF UPPER(NEW.type) = 'ADJUSTMENT_SUB' THEN
         UPDATE products SET current_stock = GREATEST(0, current_stock - NEW.quantity)
         WHERE id = NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ATUALIZAR RPC DE CHECKOUT PARA SER A ÚNICA FONTE DE VERDADE 
-- Removendo atualizacao manual na tabela products
CREATE OR REPLACE FUNCTION public.process_checkout_v2(
    p_order_id         UUID,
    p_appointment_id   UUID,
    p_tenant_id        UUID,
    p_payment_method   TEXT,
    p_fee_services     DECIMAL DEFAULT 0,
    p_fee_products     DECIMAL DEFAULT 0,
    p_products_json    JSONB DEFAULT '[]'::JSONB,
    p_created_by       UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client_id        UUID;
    v_client_phone     TEXT;
    v_total_value      DECIMAL;
    v_stamps           INTEGER;
    v_loyalty_target   INTEGER;
    v_loyalty_enabled  BOOLEAN;
    v_reward_service   UUID;
    v_reward_product   UUID;
    v_reward_granted   BOOLEAN := FALSE;
    v_reward_type      TEXT;
    v_reward_ref_id    UUID;
    v_product          RECORD;
    v_product_id       UUID;
    v_qty              INTEGER;
    v_current_stock    INTEGER;
    v_new_stock        INTEGER;
BEGIN
    IF p_order_id IS NULL OR p_appointment_id IS NULL OR p_tenant_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'Parâmetros obrigatórios ausentes.');
    END IF;
    IF p_payment_method IS NULL OR p_payment_method = '' THEN
        RETURN json_build_object('success', FALSE, 'error', 'Método de pagamento inválido.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.orders
        WHERE id = p_order_id AND tenant_id = p_tenant_id
    ) THEN
        RETURN json_build_object('success', FALSE, 'error', 'Acesso negado: order não pertence ao tenant.');
    END IF;

    SELECT
        loyalty_enabled,
        COALESCE(loyalty_target, 10),
        loyalty_reward_service_id,
        loyalty_reward_product_id
    INTO
        v_loyalty_enabled,
        v_loyalty_target,
        v_reward_service,
        v_reward_product
    FROM public.tenants
    WHERE id = p_tenant_id;

    -- Atualiza a Order e reflete no fluxo temporal do Dashboard Financeiro
    UPDATE public.orders
    SET
        status              = 'paid',
        payment_method      = p_payment_method,
        fee_amount_services = COALESCE(p_fee_services, 0),
        fee_amount_products = COALESCE(p_fee_products, 0),
        finalized_at        = NOW()
    WHERE id = p_order_id
      AND tenant_id = p_tenant_id
    RETURNING total_value INTO v_total_value;

    IF NOT FOUND THEN
        RETURN json_build_object('success', FALSE, 'error', 'Order não encontrada ou já processada.');
    END IF;

    UPDATE public.appointments
    SET status = 'paid'
    WHERE id = p_appointment_id
      AND tenant_id = p_tenant_id
    RETURNING client_id, customer_whatsapp INTO v_client_id, v_client_phone;

    IF v_client_id IS NOT NULL THEN
        UPDATE public.clients
        SET last_visit = NOW(), total_spent = COALESCE(total_spent, 0) + COALESCE(v_total_value, 0)
        WHERE id = v_client_id;

        IF v_loyalty_enabled AND v_client_phone IS NOT NULL THEN
            SELECT stamps_count INTO v_stamps
            FROM public.client_loyalty
            WHERE tenant_id = p_tenant_id AND client_phone = v_client_phone;

            IF v_stamps IS NULL THEN
                v_stamps := 0;
                INSERT INTO public.client_loyalty (tenant_id, client_phone, stamps_count)
                VALUES (p_tenant_id, v_client_phone, 1);
                v_stamps := 1;
            ELSE
                UPDATE public.client_loyalty
                SET stamps_count = stamps_count + 1, updated_at = NOW()
                WHERE tenant_id = p_tenant_id AND client_phone = v_client_phone
                RETURNING stamps_count INTO v_stamps;
            END IF;

            IF v_stamps >= v_loyalty_target THEN
                v_reward_granted := TRUE;
                UPDATE public.client_loyalty
                SET stamps_count = 0, updated_at = NOW()
                WHERE tenant_id = p_tenant_id AND client_phone = v_client_phone;

                IF v_reward_service IS NOT NULL THEN
                    v_reward_type := 'service';
                    v_reward_ref_id := v_reward_service;
                ELSIF v_reward_product IS NOT NULL THEN
                    v_reward_type := 'product';
                    v_reward_ref_id := v_reward_product;
                END IF;

                IF v_reward_type IS NOT NULL THEN
                    INSERT INTO public.loyalty_rewards (tenant_id, client_phone, reward_type, reward_reference_id, status, expires_at)
                    VALUES (p_tenant_id, v_client_phone, v_reward_type, v_reward_ref_id, 'available', NOW() + INTERVAL '30 days');
                END IF;
            END IF;
        END IF;
    END IF;

    -- ── PROCESSAMENTO DE ESTOQUE BLINDADO EM TRANSAÇÃO ÚNICA ── --
    IF jsonb_typeof(p_products_json) = 'array' AND jsonb_array_length(p_products_json) > 0 THEN
        FOR v_product IN SELECT * FROM jsonb_array_elements(p_products_json)
        LOOP
            v_product_id := (v_product.value->>'id')::UUID;
            v_qty := (v_product.value->>'qty')::INTEGER;
            
            IF v_qty > 0 THEN
                -- Apenas travamos a fileira para atomicidade, não atualizamos current_stock aqui.
                SELECT current_stock INTO v_current_stock
                FROM public.products
                WHERE id = v_product_id AND tenant_id = p_tenant_id
                FOR UPDATE;
                
                IF v_current_stock IS NOT NULL THEN
                    v_new_stock := GREATEST(0, v_current_stock - v_qty);
                    
                    -- A MAGIA ACONTECE AQUI: A Trigger se encarregará da subtração assim que essa linha for inserida.
                    INSERT INTO public.stock_transactions (
                        tenant_id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, created_by
                    ) VALUES (
                        p_tenant_id, v_product_id, 'OUT', v_qty, v_current_stock, v_new_stock, 'Sale via Checkout', p_order_id, p_created_by
                    );
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN json_build_object(
        'success',        TRUE,
        'order_id',       p_order_id,
        'client_id',      v_client_id,
        'stamps_count',   v_stamps,
        'reward_granted', v_reward_granted,
        'reward_type',    v_reward_type
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_checkout_v2(UUID, UUID, UUID, TEXT, DECIMAL, DECIMAL, JSONB, UUID) TO authenticated, service_role;
