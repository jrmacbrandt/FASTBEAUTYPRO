-- ================================================================
-- 🎟️ RPC: VALIDAR CUPOM PARA APROVAÇÃO (Bypass RLS Seguro)
-- ================================================================
-- Finalidade: Permitir que o Painel Master valide cupons de forma
-- garantida para o fluxo de aprovação de lojas.

CREATE OR REPLACE FUNCTION public.validate_admin_coupon(p_code TEXT)
RETURNS public.coupons
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões administrativas internas
AS $$
DECLARE
    v_coupon public.coupons;
BEGIN
    -- 1. Verificação de Segurança Interna (Apenas Master)
    -- Usa a função is_master() existente que já valida role e email
    IF NOT public.is_master() THEN
        RAISE EXCEPTION 'Access Denied: Only Master Admin can validate coupons for approval.';
    END IF;

    -- 2. Busca o cupom (Case-Insensitive e Trimmed)
    SELECT * INTO v_coupon 
    FROM public.coupons 
    WHERE UPPER(code) = UPPER(TRIM(p_code))
    AND active = true
    LIMIT 1;

    -- 3. Feedback se não encontrado
    IF v_coupon.id IS NULL THEN
        RAISE EXCEPTION 'Cupom inválido ou não encontrado.';
    END IF;

    RETURN v_coupon;
END;
$$;

-- Permissão de execução para usuários autenticados (a função checa o role internamente)
GRANT EXECUTE ON FUNCTION public.validate_admin_coupon(TEXT) TO authenticated;

-- Forçar atualização do cache do PostgREST
NOTIFY pgrst, 'reload schema';
