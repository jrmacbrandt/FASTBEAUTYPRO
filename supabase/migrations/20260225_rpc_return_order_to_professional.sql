-- ================================================================
-- 🛡️ [BLINDADO] RPC: return_order_to_professional
-- Data: 2026-02-25
-- Autor: AntiGravity (BLINDADO)
-- Objetivo: Garantir atomicidade na devolução da comanda.
-- Deleta a order e reverte o appointment para 'scheduled' em
-- uma única transação segura no banco, prevenindo falhas parciais.
-- ================================================================

CREATE OR REPLACE FUNCTION public.return_order_to_professional(
    p_order_id UUID,
    p_appointment_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validação Básica
    IF p_order_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'ID da comanda ausente.');
    END IF;

    -- Deletar a comanda
    DELETE FROM public.orders WHERE id = p_order_id;

    -- Se tiver agendamento associado, reverter para scheduled
    IF p_appointment_id IS NOT NULL THEN
        UPDATE public.appointments
        SET status = 'scheduled'
        WHERE id = p_appointment_id;
    END IF;

    RETURN json_build_object('success', TRUE);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.return_order_to_professional(UUID, UUID) TO authenticated, service_role;
