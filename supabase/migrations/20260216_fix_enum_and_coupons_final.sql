
-- ================================================================
-- 🛡️ EMERGENCIA: CORREÇÃO DE ENUM E RLS MASTER v4.4
-- ================================================================
-- Finalidade: Resolver o erro "invalid input value for enum user_role"
-- e restaurar a visibilidade da tabela de cupons.

BEGIN;

-- 1. ADICIONAR 'admin_master' AO ENUM user_role (SE NÃO EXISTIR)
-- Nota: ALTER TYPE ADD VALUE não pode ser executado dentro de uma transação 
-- em algumas versões do Postgres, mas no Supabase (Postgres 15+) costuma funcionar 
-- ou deve ser feito individualmente.
-- Se falhar no Editor SQL, tente remover o BEGIN/COMMIT.

DO $$ 
BEGIN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin_master';
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Value admin_master already exists in enum user_role';
END $$;

-- 2. REESTRUTURAR FUNÇÃO is_master PARA SER À PROVA DE ERROS
-- Usamos casting para TEXT para evitar erros se o enum não reconhecer o valor imediatamente.
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role::text INTO v_role FROM public.profiles WHERE id = auth.uid();
    
    RETURN (
        v_role IN ('master', 'admin_master') 
        OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'jrmacbrandt@gmail.com')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. LIMPEZA E REARQUITEUTURA DE POLÍTICAS NA TABELA COUPONS
-- Removemos qualquer política residual que possa causar bloqueio ou erro.
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coupons') THEN
        FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'coupons' AND schemaname = 'public') LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.coupons', pol.policyname);
        END LOOP;
    END IF;
END $$;

-- Política Definitiva Master (Sem recursão, usando a nova função)
CREATE POLICY "coupons_master_sovereign" ON public.coupons
    FOR ALL 
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

-- Política de Leitura Pública (Necessária para o fluxo de registro)
CREATE POLICY "coupons_read_public" ON public.coupons
    FOR SELECT
    TO authenticated
    USING (active = true);

-- 4. FORÇAR ATUALIZAÇÃO DO CACHE
NOTIFY pgrst, 'reload schema';

COMMIT;
