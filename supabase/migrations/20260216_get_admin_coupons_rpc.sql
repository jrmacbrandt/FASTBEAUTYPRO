
-- ================================================================
-- ⚡ RPC DEFINITIVO: BUSCAR CUPONS (Bypass RLS Seguro)
-- ================================================================
-- Finalidade: Permitir que o Painel Master busque os cupons de forma
-- garantida, usando uma função de banco de dados que verifica
-- a permissão internamente e ignora as políticas da tabela.

CREATE OR REPLACE FUNCTION public.get_admin_coupons()
RETURNS SETOF public.coupons
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões de Superusuário (túnel seguro)
AS $$
BEGIN
    -- Verificação Dupla de Segurança (Role ou Email Específico)
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND (
            role IN ('master', 'admin_master') 
            OR email = 'jrmacbrandt@gmail.com'
        )
    ) THEN
        -- Retorna todos os dados se for Master
        RETURN QUERY SELECT * FROM public.coupons ORDER BY created_at DESC;
    ELSE
        -- Retorna erro se tentar acessar sem ser Master
        RAISE EXCEPTION 'Access Denied: Only Master Admin can view all coupons.';
    END IF;
END;
$$;

-- Permissão de execução para usuários logados
GRANT EXECUTE ON FUNCTION public.get_admin_coupons() TO authenticated;

-- Forçar atualização do cache de esquema
NOTIFY pgrst, 'reload schema';
