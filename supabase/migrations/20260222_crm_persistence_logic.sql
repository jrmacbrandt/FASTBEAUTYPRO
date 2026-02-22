
-- ================================================================
-- 🛠️ CRM PERSISTENCE & TOTALS (v1.0)
-- Objetivo: Garantir que estatísticas de fidelidade não sumam 
--           com a purgação de histórico.
-- ================================================================

BEGIN;

-- 1. Adicionar colunas de totais na tabela de clientes
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0;

-- 2. Backfill: Sincronizar total_visits atual com base nos agendamentos pagos existentes
UPDATE public.clients c
SET total_visits = (
    SELECT COUNT(*) 
    FROM public.appointments a 
    WHERE a.client_id = c.id AND a.status = 'paid'
);

-- 3. Atualizar RPC de Pagamento para incrementar total_visits automaticamente
-- Isso garante que as próximas visitas sejam computadas permanentemente.
CREATE OR REPLACE FUNCTION public.process_payment_and_loyalty(
    p_order_id         UUID,
    p_appointment_id   UUID,
    p_tenant_id        UUID,
    p_payment_method   TEXT,
    p_fee_services     DECIMAL DEFAULT 0,
    p_fee_products     DECIMAL DEFAULT 0
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
BEGIN
    -- 0. Validação de entrada
    IF p_order_id IS NULL OR p_appointment_id IS NULL OR p_tenant_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'Parâmetros obrigatórios ausentes.');
    END IF;

    -- 1. Garantir que a order pertence ao tenant
    IF NOT EXISTS (
        SELECT 1 FROM public.orders
        WHERE id = p_order_id AND tenant_id = p_tenant_id
    ) THEN
        RETURN json_build_object('success', FALSE, 'error', 'Acesso negado.');
    END IF;

    -- 2. Buscar configurações do Tenant
    SELECT loyalty_enabled, COALESCE(loyalty_target, 10), loyalty_reward_service_id, loyalty_reward_product_id
    INTO v_loyalty_enabled, v_loyalty_target, v_reward_service, v_reward_product
    FROM public.tenants WHERE id = p_tenant_id;

    -- 3. Marcar Order como PAGA
    UPDATE public.orders
    SET status = 'paid', payment_method = p_payment_method,
        fee_amount_services = COALESCE(p_fee_services, 0),
        fee_amount_products = COALESCE(p_fee_products, 0)
    WHERE id = p_order_id AND tenant_id = p_tenant_id
    RETURNING total_value INTO v_total_value;

    -- 4. Marcar Appointment como PAGO
    UPDATE public.appointments
    SET status = 'paid'
    WHERE id = p_appointment_id AND tenant_id = p_tenant_id
    RETURNING client_id, customer_whatsapp INTO v_client_id, v_client_phone;

    -- 5. ATUALIZAR CRM DO CLIENTE (Persistente)
    IF v_client_id IS NOT NULL THEN
        UPDATE public.clients
        SET
            last_visit   = NOW(),
            total_spent  = COALESCE(total_spent, 0) + COALESCE(v_total_value, 0),
            total_visits = COALESCE(total_visits, 0) + 1  -- INCREMENTO PERMANENTE
        WHERE id = v_client_id;

        -- 6. Lógica de Fidelidade de Selos (Baseada em phone para compatibilidade)
        IF v_loyalty_enabled = TRUE AND v_client_phone IS NOT NULL THEN
            INSERT INTO public.client_loyalty
                (tenant_id, client_id, client_phone, stamps_count, last_stamp_at)
            VALUES
                (p_tenant_id, v_client_id, v_client_phone, 1, NOW())
            ON CONFLICT (tenant_id, client_phone)
            DO UPDATE SET
                stamps_count  = public.client_loyalty.stamps_count + 1,
                client_id     = COALESCE(public.client_loyalty.client_id, EXCLUDED.client_id),
                last_stamp_at = NOW()
            RETURNING stamps_count INTO v_stamps;

            -- 7. Avaliar prêmio
            IF v_stamps >= v_loyalty_target THEN
                UPDATE public.client_loyalty SET stamps_count = GREATEST(0, v_stamps - v_loyalty_target)
                WHERE tenant_id = p_tenant_id AND client_phone = v_client_phone;

                IF v_reward_service IS NOT NULL THEN
                    v_reward_type := 'service'; v_reward_ref_id := v_reward_service;
                ELSIF v_reward_product IS NOT NULL THEN
                    v_reward_type := 'product'; v_reward_ref_id := v_reward_product;
                END IF;

                IF v_reward_type IS NOT NULL THEN
                    INSERT INTO public.client_rewards (tenant_id, client_id, client_phone, reward_type, reward_ref_id, status)
                    VALUES (p_tenant_id, v_client_id, v_client_phone, v_reward_type, v_reward_ref_id, 'available');
                    v_reward_granted := TRUE;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN json_build_object(
        'success', TRUE,
        'order_id', p_order_id,
        'stamps_after', COALESCE(v_stamps, 0),
        'reward_granted', v_reward_granted
    );
END;
$$;

COMMIT;
