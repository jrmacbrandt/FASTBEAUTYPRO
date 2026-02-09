-- ============================================
-- DIAGNÓSTICO: Verificar Role do Usuário Master
-- ============================================
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar o role atual do usuário master
SELECT 
    id,
    email,
    role,
    full_name,
    created_at
FROM profiles 
WHERE email = 'jrmacbrandt@gmail.com';

-- 2. Se o role NÃO for 'master', execute a correção abaixo:
UPDATE profiles 
SET role = 'master' 
WHERE email = 'jrmacbrandt@gmail.com';

-- 3. Verificar se a atualização funcionou:
SELECT 
    id,
    email,
    role,
    full_name
FROM profiles 
WHERE email = 'jrmacbrandt@gmail.com';

-- ============================================
-- CORREÇÃO: Políticas RLS para Actions
-- ============================================

-- 4. Garantir que Master pode MODIFICAR tenants
DROP POLICY IF EXISTS "master_all_access" ON tenants;
CREATE POLICY "master_all_access" ON tenants 
FOR ALL TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'master')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'master');

-- 5. Garantir que Master pode MODIFICAR profiles
DROP POLICY IF EXISTS "master_all_access" ON profiles;
CREATE POLICY "master_all_access" ON profiles 
FOR ALL TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'master')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'master');

-- 6. Listar todas as políticas atuais para verificação
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('tenants', 'profiles')
ORDER BY tablename, policyname;
