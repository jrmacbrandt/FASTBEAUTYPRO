-- ================================================================
-- 🛡️ REPARO DEFINITIVO RLS (V2.0 - FIX RECURSÃO)
-- ================================================================
-- Finalidade: Eliminar loops de recursão nas políticas RLS e 
-- garantir que jrbrandt@hotmail.com e outros admins acessem 
-- seus painéis sem travamentos (infinite loading).
-- ================================================================

BEGIN;

-- 1. LIMPEZA TOTAL (RESET RADICAL PARA SEGURANÇA)
-- ================================================================
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

-- 2. FUNÇÕES DE APOIO (BYPASS DE RECURSÃO)
-- ================================================================

-- Verifica se é Master via JWT (Bypass imediato e sem recursão)
CREATE OR REPLACE FUNCTION public.is_master_v2()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Checa e-mail direto no JWT para bypass imediato
  SELECT (auth.jwt() ->> 'email') = 'jrmacbrandt@gmail.com' 
         OR EXISTS (
           SELECT 1 FROM profiles 
           WHERE id = auth.uid() 
           AND role IN ('master', 'admin_master')
         );
$$;

-- Obtém Tenant ID sem disparar RLS da profiles
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. POLÍTICAS DA TABELA PROFILES (A BASE DE TUDO)
-- ================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Usuário pode ler seu próprio perfil (Sem funções = Zero Loop)
CREATE POLICY "profiles_self_read" ON profiles FOR SELECT TO authenticated
USING (id = auth.uid());

-- Admin/Owner pode ler perfis do seu tenant
CREATE POLICY "profiles_tenant_read" ON profiles FOR SELECT TO authenticated
USING (tenant_id = public.get_auth_tenant_id());

-- Master pode fazer tudo
CREATE POLICY "profiles_master_bypass" ON profiles FOR ALL TO authenticated
USING (public.is_master_v2())
WITH CHECK (public.is_master_v2());

-- Usuário pode atualizar o próprio perfil
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 4. POLÍTICAS DA TABELA TENANTS
-- ================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_read_access" ON tenants FOR SELECT TO authenticated
USING (public.is_master_v2() OR id = public.get_auth_tenant_id());

CREATE POLICY "tenants_master_all" ON tenants FOR ALL TO authenticated
USING (public.is_master_v2());

-- 5. POLÍTICAS PARA TABELAS MULTI-TENANT (ESTRUTURA PADRONIZADA)
-- ================================================================
DO $$ 
DECLARE 
    tname TEXT;
BEGIN
    -- Tabelas com coluna tenant_id direta
    FOR tname IN SELECT unnest(ARRAY['appointments', 'orders', 'services', 'products', 'clients', 'stock_transactions', 'notifications', 'campaigns', 'client_loyalty', 'client_subscriptions'])
    LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tname) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tname);
            EXECUTE format('CREATE POLICY %I_isolation ON %I FOR ALL TO authenticated USING (public.is_master_v2() OR tenant_id = public.get_auth_tenant_id()) WITH CHECK (public.is_master_v2() OR tenant_id = public.get_auth_tenant_id())', 
                           tname, tname);
        END IF;
    END LOOP;

    -- Caso Especial: campaign_items (depende da tabela campaigns)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaign_items') THEN
        ALTER TABLE campaign_items ENABLE ROW LEVEL SECURITY;
        CREATE POLICY campaign_items_isolation ON campaign_items FOR ALL TO authenticated 
        USING (
            public.is_master_v2() OR 
            EXISTS (
                SELECT 1 FROM campaigns 
                WHERE campaigns.id = campaign_items.campaign_id 
                AND campaigns.tenant_id = public.get_auth_tenant_id()
            )
        )
        WITH CHECK (
            public.is_master_v2() OR 
            EXISTS (
                SELECT 1 FROM campaigns 
                WHERE campaigns.id = campaign_items.campaign_id 
                AND campaigns.tenant_id = public.get_auth_tenant_id()
            )
        );
    END IF;
END $$;

-- 6. GARANTIA DE ACESSO DO USUÁRIO JRBRANDT
-- ================================================================
UPDATE profiles 
SET role = 'owner'
WHERE email = 'jrbrandt@hotmail.com';

COMMIT;
