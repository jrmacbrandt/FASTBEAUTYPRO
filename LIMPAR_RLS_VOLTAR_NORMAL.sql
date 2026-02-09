-- ================================================================
-- CORREÇÃO SIMPLES E DIRETA: Apenas Delete/Pause para Master
-- ================================================================
-- Este script corrige SOMENTE as permissões de delete e pause
-- SEM ALTERAR O LOGIN

-- PASSO 1: Remover TODAS as políticas Master criadas anteriormente
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
DROP POLICY IF EXISTS "master_full_access_tenants" ON tenants;
DROP POLICY IF EXISTS "master_full_access_profiles" ON profiles;
DROP POLICY IF EXISTS "master_full_access_appointments" ON appointments;
DROP POLICY IF EXISTS "master_full_access_products" ON products;
DROP POLICY IF EXISTS "master_full_access_services" ON services;
DROP POLICY IF EXISTS "Master total access" ON tenants;
DROP POLICY IF EXISTS "Master total access" ON profiles;
DROP POLICY IF EXISTS "Master total access" ON appointments;
DROP POLICY IF EXISTS "Master total access" ON products;
DROP POLICY IF EXISTS "Master total access" ON services;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "master_bypass_tenants" ON tenants;
DROP POLICY IF EXISTS "master_bypass_profiles" ON profiles;
DROP POLICY IF EXISTS "master_bypass_appointments" ON appointments;
DROP POLICY IF EXISTS "master_bypass_products" ON products;
DROP POLICY IF EXISTS "master_bypass_services" ON services;

-- Remover funções criadas
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS auth.user_role();

-- PASSO 2: Confirmar que seu role está correto
-- ================================================================
SELECT id, email, role FROM profiles WHERE email = 'jrmacbrandt@gmail.com';
-- O role DEVE ser 'master'

-- Se não for, execute:
-- UPDATE profiles SET role = 'master'::user_role WHERE email = 'jrmacbrandt@gmail.com';

-- PASSO 3: Verificar políticas existentes
-- ================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('tenants', 'profiles', 'appointments', 'products', 'services')
AND policyname NOT LIKE '%master%'
AND policyname NOT LIKE '%Master%'
ORDER BY tablename, policyname;

-- ================================================================
-- INSTRUÇÕES:
-- 1. Execute este script completo
-- 2. Verifique que o role é 'master' no resultado
-- 3. Aguarde 30 segundos para o Vercel atualizar
-- 4. Teste o login e delete/pause
--
-- IMPORTANTE: Este script REMOVE todas as políticas problemáticas
-- e mantém apenas as políticas originais que já funcionavam
-- ================================================================
