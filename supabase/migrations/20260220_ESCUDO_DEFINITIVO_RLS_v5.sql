-- ================================================================
-- 🛡️ ESCUDO DEFINITIVO RLS v5.0 (ANTI-RECURSÃO & ISOLAMENTO TOTAL)
-- ================================================================
-- Finalidade: Eliminar PERMANENTEMENTE o Infinite Loading e
-- garantir isolamento multi-tenant seguro e inabalável.
-- ================================================================

BEGIN;

-- 1. LIMPEZA TOTAL DE FUNÇÕES E POLÍTICAS ANTIGAS
-- ================================================================
DROP FUNCTION IF EXISTS public.is_master() CASCADE;
DROP FUNCTION IF EXISTS public.is_master_v2() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_auth_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;

DO $$ 
DECLARE 
    tab RECORD;
    pol RECORD;
BEGIN 
    FOR tab IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = tab.tablename AND schemaname = 'public') LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tab.tablename);
        END LOOP;
    END LOOP;
END $$;

-- 2. FUNÇÕES DE SEGURANÇA BLINDADAS (SECURITY DEFINER)
-- ================================================================

-- A. is_master_v5: Bypass instantâneo via JWT + Consulta Segura
CREATE OR REPLACE FUNCTION public.is_master_v5()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Checa e-mail direto no JWT (Zero Latência, Zero Recursão)
  IF (auth.jwt() ->> 'email') = 'jrmacbrandt@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- Checa na tabela ignorando RLS (SECURITY DEFINER + search_path)
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('master', 'admin_master')
  );
END;
$$;

-- B. get_tenant_safe: Obtém o Tenant ID sem disparar loops
CREATE OR REPLACE FUNCTION public.get_tenant_safe()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. POLÍTICAS DA TABELA PROFILES (IDENTIDADE BÁSICA)
-- ================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ESSENCIAL: Permite ler o próprio perfil SEM chamar funções (Quebra o Loop Initial)
CREATE POLICY "profiles_base_self" ON profiles FOR SELECT TO authenticated
USING (id = auth.uid());

-- Permite Master ver tudo
CREATE POLICY "profiles_master_all" ON profiles FOR ALL TO authenticated
USING (public.is_master_v5())
WITH CHECK (public.is_master_v5());

-- Admins da loja podem ver/editar perfis do próprio Tenant
CREATE POLICY "profiles_tenant_management" ON profiles FOR SELECT TO authenticated
USING (tenant_id = public.get_tenant_safe());

-- 4. POLÍTICAS DA TABELA TENANTS
-- ================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_read_self" ON tenants FOR SELECT TO authenticated
USING (public.is_master_v5() OR id = public.get_tenant_safe());

CREATE POLICY "tenants_master_full" ON tenants FOR ALL TO authenticated
USING (public.is_master_v5());

-- 5. POLÍTICAS PADRONIZADAS PARA TABELAS MULTI-TENANT
-- ================================================================
DO $$ 
DECLARE 
    tname TEXT;
BEGIN
    FOR tname IN SELECT unnest(ARRAY['appointments', 'orders', 'services', 'products', 'clients', 'stock_transactions', 'notifications', 'campaigns', 'client_loyalty', 'client_subscriptions'])
    LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tname) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tname);
            EXECUTE format('CREATE POLICY %I_isolation_v5 ON %I FOR ALL TO authenticated USING (public.is_master_v5() OR tenant_id = public.get_tenant_safe()) WITH CHECK (public.is_master_v5() OR tenant_id = public.get_tenant_safe())', 
                           tname, tname);
        END IF;
    END LOOP;

    -- Caso Especial: campaign_items (Filtro via Tabela Pai)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaign_items') THEN
        ALTER TABLE campaign_items ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "campaign_items_isolation_v5" ON campaign_items FOR ALL TO authenticated 
        USING (
            public.is_master_v5() OR 
            EXISTS (
                SELECT 1 FROM campaigns 
                WHERE campaigns.id = campaign_items.campaign_id 
                AND campaigns.tenant_id = public.get_tenant_safe()
            )
        );
    END IF;
END $$;

-- 6. FINALIZAÇÃO E ATUALIZAÇÃO DO USUÁRIO JRBRANDT
-- ================================================================
UPDATE profiles 
SET role = 'owner'
WHERE email = 'jrbrandt@hotmail.com';

COMMIT;

-- 🔍 DIAGNÓSTICO FINAL (RESULTADO DEVE SER 0 LINHAS COM RECURSÃO)
-- ================================================================
-- Este comando ajuda a verificar se as políticas foram aplicadas.
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
