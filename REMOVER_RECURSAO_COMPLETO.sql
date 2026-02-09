-- ================================================================
-- SOLUÇÃO DEFINITIVA: Remover Recursão Completamente
-- ================================================================
-- O problema: Qualquer função que consulta profiles causa recursão
-- A solução: Remover políticas RLS para Master e fazer verificação no código

-- PASSO 1: Remover TODAS as políticas Master que causam recursão
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

-- PASSO 2: Remover a função recursiva
-- ================================================================
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS auth.user_role();

-- PASSO 3: Garantir que usuários possam ler SEU PRÓPRIO perfil (SEM recursão)
-- ================================================================
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile" ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- PASSO 4: Criar políticas Master SIMPLES usando auth.uid() diretamente
-- ================================================================
-- Estas políticas verificam se o auth.uid() = ID do Master
-- Você precisa pegar o UUID do seu usuário master do banco

-- Primeiro, vamos pegar seu UUID:
SELECT id, email, role FROM profiles WHERE email = 'jrmacbrandt@gmail.com';

-- COPIE o UUID que aparecer e cole abaixo substituindo 'COLE_SEU_UUID_AQUI'
-- Exemplo: '2a898476-328c-4cd8-9d21-4778ec48c6ab'

-- Depois de colar o UUID, descomente e execute as políticas:

/*
-- Tenants
CREATE POLICY "master_bypass_tenants" ON tenants
FOR ALL
TO authenticated
USING (auth.uid() = 'COLE_SEU_UUID_AQUI'::uuid)
WITH CHECK (auth.uid() = 'COLE_SEU_UUID_AQUI'::uuid);

-- Profiles  
CREATE POLICY "master_bypass_profiles" ON profiles
FOR ALL
TO authenticated
USING (auth.uid() = 'COLE_SEU_UUID_AQUI'::uuid OR id = auth.uid())
WITH CHECK (auth.uid() = 'COLE_SEU_UUID_AQUI'::uuid OR id = auth.uid());

-- Appointments
CREATE POLICY "master_bypass_appointments" ON appointments
FOR ALL
TO authenticated
USING (auth.uid() = 'COLE_SEU_UUID_AQUI'::uuid)
WITH CHECK (auth.uid() = 'COLE_SEU_UUID_AQUI'::uuid);

-- Products
CREATE POLICY "master_bypass_products" ON products
FOR ALL
TO authenticated
USING (auth.uid() = 'COLE_SEU_UUID_AQUI'::uuid)
WITH CHECK (auth.uid() = 'COLE_SEU_UUID_AQUI'::uuid);

-- Services
CREATE POLICY "master_bypass_services" ON services
FOR ALL
TO authenticated
USING (auth.uid() = 'COLE_SEU_UUID_AQUI'::uuid)
WITH CHECK (auth.uid() = 'COLE_SEU_UUID_AQUI'::uuid);
*/

-- PASSO 5: Verificar políticas restantes
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
-- INSTRUÇÕES:
-- 1. Execute até o PASSO 3 primeiro (vai remover as recursivas)
-- 2. Copie o UUID do SELECT do PASSO 4
-- 3. Cole substituindo 'COLE_SEU_UUID_AQUI' no código comentado
-- 4. Descomente as políticas (remova /* e */)
-- 5. Execute as políticas
-- 6. Teste o login
-- ================================================================
