-- ================================================================
-- CORREÇÃO URGENTE: Remover Recursão Infinita nas Políticas RLS
-- ================================================================
-- Execute TODO este script no SQL Editor do Supabase

-- PROBLEMA: As políticas estão consultando profiles dentro de policies de profiles
-- SOLUÇÃO: Usar auth.uid() diretamente e permitir usuários lerem seu próprio perfil

-- PASSO 1: Remover TODAS as políticas master que causam recursão
-- ================================================================
DROP POLICY IF EXISTS "master_all_access_tenants" ON tenants;
DROP POLICY IF EXISTS "master_all_access_profiles" ON profiles;
DROP POLICY IF EXISTS "master_all_access_appointments" ON appointments;
DROP POLICY IF EXISTS "master_all_access_products" ON products;
DROP POLICY IF EXISTS "master_all_access_services" ON services;

-- PASSO 2: Criar política para usuários lerem SEU PRÓPRIO perfil (sem recursão)
-- ================================================================
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile" ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- PASSO 3: Criar política para Master usando user_metadata do JWT
-- ================================================================
-- Primeiro, precisamos garantir que o role está no JWT metadata
-- (Isso requer um trigger ou uso de funções personalizadas)

-- Por enquanto, vamos criar uma função helper que usa cache
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- PASSO 4: Criar políticas Master usando a função (com cache)
-- ================================================================

-- Tenants
CREATE POLICY "master_manage_tenants" ON tenants
FOR ALL
TO authenticated
USING (auth.user_role() = 'master')
WITH CHECK (auth.user_role() = 'master');

-- Profiles (UPDATE e DELETE, SELECT já está coberto acima)
CREATE POLICY "master_manage_profiles" ON profiles
FOR ALL
TO authenticated
USING (auth.user_role() = 'master' OR id = auth.uid())
WITH CHECK (auth.user_role() = 'master' OR id = auth.uid());

-- Appointments
CREATE POLICY "master_manage_appointments" ON appointments
FOR ALL
TO authenticated
USING (auth.user_role() = 'master')
WITH CHECK (auth.user_role() = 'master');

-- Products
CREATE POLICY "master_manage_products" ON products
FOR ALL
TO authenticated
USING (auth.user_role() = 'master')
WITH CHECK (auth.user_role() = 'master');

-- Services
CREATE POLICY "master_manage_services" ON services
FOR ALL
TO authenticated
USING (auth.user_role() = 'master')
WITH CHECK (auth.user_role() = 'master');

-- PASSO 5: Verificar as políticas criadas
-- ================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename IN ('tenants', 'profiles', 'appointments', 'products', 'services')
ORDER BY tablename, policyname;

-- ================================================================
-- SCRIPT CONCLUÍDO
-- Após executar:
-- 1. Faça logout
-- 2. Limpe cache (Ctrl+Shift+Del)
-- 3. Tente fazer login novamente
-- ================================================================
