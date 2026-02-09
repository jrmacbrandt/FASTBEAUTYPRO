-- ================================================================
-- SCRIPT COMPLETO DE CORREÇÃO MASTER
-- Execute TODO este script no SQL Editor do Supabase
-- ================================================================

-- PASSO 1: Verificar o role atual
-- ================================================================
SELECT 
    id,
    email,
    role,
    full_name,
    tenant_id,
    created_at
FROM profiles 
WHERE email = 'jrmacbrandt@gmail.com';

-- PASSO 2: Corrigir o role para 'master'
-- ================================================================
UPDATE profiles 
SET role = 'master',
    tenant_id = NULL  -- Master não deve ter tenant_id
WHERE email = 'jrmacbrandt@gmail.com';

-- PASSO 3: Verificar a correção
-- ================================================================
SELECT 
    id,
    email,
    role,
    full_name,
    tenant_id
FROM profiles 
WHERE email = 'jrmacbrandt@gmail.com';

-- PASSO 4: Criar políticas RLS para Master (TENANTS)
-- ================================================================
DROP POLICY IF EXISTS "master_all_access_tenants" ON tenants;

CREATE POLICY "master_all_access_tenants" 
ON tenants 
FOR ALL 
TO authenticated 
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
)
WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
);

-- PASSO 5: Criar políticas RLS para Master (PROFILES)
-- ================================================================
DROP POLICY IF EXISTS "master_all_access_profiles" ON profiles;

CREATE POLICY "master_all_access_profiles" 
ON profiles 
FOR ALL 
TO authenticated 
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
)
WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
);

-- PASSO 6: Criar políticas RLS para Master (APPOINTMENTS)
-- ================================================================
DROP POLICY IF EXISTS "master_all_access_appointments" ON appointments;

CREATE POLICY "master_all_access_appointments" 
ON appointments 
FOR ALL 
TO authenticated 
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
)
WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
);

-- PASSO 7: Criar políticas RLS para Master (PRODUCTS)
-- ================================================================
DROP POLICY IF EXISTS "master_all_access_products" ON products;

CREATE POLICY "master_all_access_products" 
ON products 
FOR ALL 
TO authenticated 
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
)
WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
);

-- PASSO 8: Criar políticas RLS para Master (SERVICES)
-- ================================================================
DROP POLICY IF EXISTS "master_all_access_services" ON services;

CREATE POLICY "master_all_access_services" 
ON services 
FOR ALL 
TO authenticated 
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
)
WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
);

-- PASSO 9: Verificar todas as políticas criadas
-- ================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE policyname LIKE '%master%'
ORDER BY tablename, policyname;

-- ================================================================
-- SCRIPT CONCLUÍDO
-- Após executar este script:
-- 1. Faça logout da aplicação
-- 2. Limpe o cache do navegador (Ctrl+Shift+Del)
-- 3. Faça login novamente em /login-master
-- 4. Você deve ser redirecionado para /admin-master
-- 5. Os botões de deletar e pausar devem funcionar
-- ================================================================
