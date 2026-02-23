-- ================================================================
-- ⚡ RPC: finalize_appointment_order
-- Data: 2026-02-23
-- Objetivo: Garantir o fechamento de um agendamento e o statud
-- da comanda para pending_payment na MESA TRANSACAO (Seguranca)
-- ================================================================

CREATE OR REPLACE FUNCTION public.finalize_appointment_order(
    p_appointment_id UUID,
    p_tenant_id      UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
BEGIN
    -- Validação
    IF p_appointment_id IS NULL OR p_tenant_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'Parâmetros obrigatórios ausentes.');
    END IF;

    -- Garantir que appointment pertence ao tenant via IDOR prev.
    IF NOT EXISTS (
        SELECT 1 FROM public.appointments
        WHERE id = p_appointment_id AND tenant_id = p_tenant_id
    ) THEN
        RETURN json_build_object('success', FALSE, 'error', 'Agendamento inválido ou acesso negado.');
    END IF;

    -- Atualiza Agendamento para Completed
    UPDATE public.appointments
    SET status = 'completed'
    WHERE id = p_appointment_id AND tenant_id = p_tenant_id;

    -- Atualiza Comanda (Order) e pega o ID para garantir finalização
    UPDATE public.orders
    SET status = 'pending_payment',
        finalized_at = NOW()
    WHERE appointment_id = p_appointment_id AND tenant_id = p_tenant_id
    RETURNING id INTO v_order_id;

    RETURN json_build_object('success', TRUE, 'appointment_id', p_appointment_id, 'order_id', v_order_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.finalize_appointment_order(UUID, UUID) TO authenticated, service_role;
