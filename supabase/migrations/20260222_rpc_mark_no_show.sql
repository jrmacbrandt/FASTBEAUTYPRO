CREATE OR REPLACE FUNCTION public.mark_appointment_no_show(
    p_appointment_id UUID,
    p_tenant_id        UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client_phone     TEXT;
    v_stamps_before    INTEGER;
    v_stamps_after     INTEGER;
BEGIN
    -- 1. Update appointment status to 'no_show'
    UPDATE public.appointments
    SET status = 'no_show'
    WHERE id = p_appointment_id 
      AND tenant_id = p_tenant_id
    RETURNING customer_whatsapp INTO v_client_phone;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Agendamento não encontrado ou acesso Negado.'
        );
    END IF;

    -- 2. Decrement stamps if client has a loyalty record
    IF v_client_phone IS NOT NULL THEN
        UPDATE public.client_loyalty
        SET stamps_count = GREATEST(0, stamps_count - 1),
            updated_at = NOW()
        WHERE tenant_id = p_tenant_id 
          AND client_phone = v_client_phone
        RETURNING stamps_count INTO v_stamps_after;
    END IF;

    RETURN json_build_object(
        'success', TRUE,
        'appointment_id', p_appointment_id,
        'stamps_after', COALESCE(v_stamps_after, 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_appointment_no_show(UUID, UUID) TO authenticated;
