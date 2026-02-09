-- ================================================================
-- CORREÇÃO FINAL: RLS sem recursão e sem schema auth
-- ================================================================
-- Execute TODO este script no SQL Editor do Supabase

-- PASSO 1: Remover políticas recursivas antigas
-- ================================================================
DROP POLICY IF EXISTS "master_all_access_tenants" ON tenants;
DROP POLICY IF EXISTS "master_all_access_profiles" ON profiles;
DROP POLICY IF EXISTS "master_all_access_appointments" ON appointments;
DROP POLICY IF EXISTS "master_all_access_products" ON products;
DROP POLICY IF EXISTS "master_all_access_services" ON services;
DROP POLICY IF EXISTS "master_manage_tenants" ON tenants;
DROP POLICY IF EXISTS "master_manage_profiles" ON profiles;
DROP POLICY IF EXISTS "master_manage_appointments" ON appointments;
DROP POLICY IF EXISTS "master_manage_products" ON products;
DROP POLICY IF EXISTS "master_manage_services" ON services;

-- PASSO 2: Criar função helper no schema PUBLIC (sem permissões especiais)
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- PASSO 3: Política para usuários lerem SEU PRÓPRIO perfil
-- ================================================================
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile" ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- PASSO 4: Políticas Master usando a função
-- ================================================================

-- Tenants
CREATE POLICY "master_full_access_tenants" ON tenants
FOR ALL
TO authenticated
USING (public.get_user_role() = 'master')
WITH CHECK (public.get_user_role() = 'master');

-- Profiles
CREATE POLICY "master_full_access_profiles" ON profiles
FOR ALL
TO authenticated
USING (public.get_user_role() = 'master' OR id = auth.uid())
WITH CHECK (public.get_user_role() = 'master' OR id = auth.uid());

-- Appointments
CREATE POLICY "master_full_access_appointments" ON appointments
FOR ALL
TO authenticated
USING (public.get_user_role() = 'master')
WITH CHECK (public.get_user_role() = 'master');

-- Products
CREATE POLICY "master_full_access_products" ON products
FOR ALL
TO authenticated
USING (public.get_user_role() = 'master')
WITH CHECK (public.get_user_role() = 'master');

-- Services
CREATE POLICY "master_full_access_services" ON services
FOR ALL
TO authenticated
USING (public.get_user_role() = 'master')
WITH CHECK (public.get_user_role() = 'master');

-- PASSO 5: Verificar criação
-- ================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('tenants', 'profiles', 'appointments', 'products', 'services')
ORDER BY tablename, policyname;

-- ================================================================
-- CONCLUÍDO! Agora teste o login.
-- ================================================================
