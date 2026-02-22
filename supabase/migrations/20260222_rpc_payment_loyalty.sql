-- ================================================================
-- ⚡ RPC: process_payment_and_loyalty
-- Data: 2026-02-22
-- Objetivo: Processar pagamento + CRM + fidelidade em uma única
--           transação atômica (tudo ou nada).
-- Segurança: SECURITY DEFINER + verificação de tenant_id
-- ================================================================

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
    -- ── 0. Validação de entrada ────────────────────────────────
    IF p_order_id IS NULL OR p_appointment_id IS NULL OR p_tenant_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'Parâmetros obrigatórios ausentes.');
    END IF;
    IF p_payment_method IS NULL OR p_payment_method = '' THEN
        RETURN json_build_object('success', FALSE, 'error', 'Método de pagamento inválido.');
    END IF;

    -- ── 1. Garantir que a order pertence ao tenant (IDOR prevention) ──
    IF NOT EXISTS (
        SELECT 1 FROM public.orders
        WHERE id = p_order_id AND tenant_id = p_tenant_id
    ) THEN
        RETURN json_build_object('success', FALSE, 'error', 'Acesso negado: order não pertence ao tenant.');
    END IF;

    -- ── 2. Buscar configurações do Tenant ──────────────────────
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

    -- ── 3. Marcar Order como PAGA ──────────────────────────────
    UPDATE public.orders
    SET
        status              = 'paid',
        payment_method      = p_payment_method,
        fee_amount_services = COALESCE(p_fee_services, 0),
        fee_amount_products = COALESCE(p_fee_products, 0)
    WHERE id = p_order_id
      AND tenant_id = p_tenant_id
    RETURNING total_value INTO v_total_value;

    IF NOT FOUND THEN
        RETURN json_build_object('success', FALSE, 'error', 'Order não encontrada ou já processada.');
    END IF;

    -- ── 4. Marcar Appointment como PAGO ───────────────────────
    UPDATE public.appointments
    SET status = 'paid'
    WHERE id = p_appointment_id
      AND tenant_id = p_tenant_id
    RETURNING client_id, customer_whatsapp
    INTO v_client_id, v_client_phone;

    -- ── 5. Atualizar CRM do Cliente (se vinculado) ─────────────
    IF v_client_id IS NOT NULL THEN

        -- Ação 1: Atualiza last_visit | Ação 2: Incrementa total_spent
        UPDATE public.clients
        SET
            last_visit   = NOW(),
            total_spent  = COALESCE(total_spent, 0) + COALESCE(v_total_value, 0)
        WHERE id = v_client_id;

        -- ── 6. Lógica de Fidelidade ────────────────────────────
        IF v_loyalty_enabled = TRUE AND v_client_phone IS NOT NULL THEN

            -- Ação 3: Upsert do saldo de selos (+1 selo atômico)
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

            -- Ação 4 (Condicional): Avaliar meta de fidelidade
            IF v_stamps >= v_loyalty_target THEN

                -- Zerar saldo (suporta "ciclo infinito" subtraindo meta)
                UPDATE public.client_loyalty
                SET stamps_count = GREATEST(0, v_stamps - v_loyalty_target)
                WHERE tenant_id   = p_tenant_id
                  AND client_phone = v_client_phone;

                -- Determinar tipo de recompensa configurada pelo tenant
                IF v_reward_service IS NOT NULL THEN
                    v_reward_type   := 'service';
                    v_reward_ref_id := v_reward_service;
                ELSIF v_reward_product IS NOT NULL THEN
                    v_reward_type   := 'product';
                    v_reward_ref_id := v_reward_product;
                END IF;

                -- Inserir recompensa disponível em client_rewards
                IF v_reward_type IS NOT NULL THEN
                    INSERT INTO public.client_rewards
                        (tenant_id, client_id, client_phone, reward_type, reward_ref_id, status)
                    VALUES
                        (p_tenant_id, v_client_id, v_client_phone, v_reward_type, v_reward_ref_id, 'available');

                    v_reward_granted := TRUE;
                END IF;
            END IF;
        END IF;
    END IF;

    -- ── 7. Retornar resultado ──────────────────────────────────
    RETURN json_build_object(
        'success',        TRUE,
        'order_id',       p_order_id,
        'client_id',      v_client_id,
        'total_value',    v_total_value,
        'stamps_after',   COALESCE(v_stamps, 0),
        'loyalty_target', v_loyalty_target,
        'reward_granted', v_reward_granted,
        'reward_type',    v_reward_type
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', FALSE,
            'error',   SQLERRM
        );
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.process_payment_and_loyalty(UUID, UUID, UUID, TEXT, DECIMAL, DECIMAL)
    TO authenticated, service_role;

-- ================================================================
-- 🔍 VALIDAÇÃO:
-- SELECT routine_name FROM information_schema.routines WHERE routine_name = 'process_payment_and_loyalty';
-- ================================================================
