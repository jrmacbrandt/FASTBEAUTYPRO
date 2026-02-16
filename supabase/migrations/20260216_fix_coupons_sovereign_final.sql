
-- ================================================================
-- 🎟️ FIX: SOBERANIA MASTER TOTAL EM CUPONS v5.0
-- ================================================================
-- Finalidade: Garantir acesso total e irrestrito ao Master Admin
-- independente de conflitos de RLS ou erros de Enum.

-- Nota: Executar este script sem BEGIN/COMMIT se houver erro de 
-- ALTER TYPE ou transação pendente no Supabase.

-- 1. DESATIVAR RLS TEMPORARIAMENTE PARA LIMPEZA (Garante reset limpo)
ALTER TABLE public.coupons DISABLE ROW LEVEL SECURITY;

-- 2. LIMPAR TODAS AS REGRAS ANTIGAS (ELIMINAR CONFLITOS RESIDUAIS)
DROP POLICY IF EXISTS "master_god_mode" ON public.coupons;
DROP POLICY IF EXISTS "master_universal_v5" ON public.coupons;
DROP POLICY IF EXISTS "coupons_master_bypass_final" ON public.coupons;
DROP POLICY IF EXISTS "master_sovereign_access" ON public.coupons;
DROP POLICY IF EXISTS "anyone_authenticated_can_see_coupons" ON public.coupons;
DROP POLICY IF EXISTS "coupons_master_sovereign" ON public.coupons;
DROP POLICY IF EXISTS "coupons_read_public" ON public.coupons;

-- 3. REATIVAR RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 4. REGRA DE OURO (SOBERANIA): Master Admin ou Email do Dono vê TUDO.
CREATE POLICY "sovereign_master_access" ON public.coupons
    FOR ALL 
    TO authenticated
    USING (
        (auth.jwt() ->> 'email' = 'jrmacbrandt@gmail.com')
        OR ((SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('master', 'admin_master'))
    )
    WITH CHECK (
        (auth.jwt() ->> 'email' = 'jrmacbrandt@gmail.com')
        OR ((SELECT role::text FROM public.profiles WHERE id = auth.uid()) IN ('master', 'admin_master'))
    );

-- 5. VISIBILIDADE PÚBLICA (Checkout): Apenas cupons ativos para o registro
CREATE POLICY "public_visibility" ON public.coupons
    FOR SELECT 
    TO authenticated
    USING (active = true);

-- 6. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
