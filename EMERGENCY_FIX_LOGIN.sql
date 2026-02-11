-- ================================================================
-- EMERGENCY FIX: RESTAURAR ACESSO AO LOGIN (CORREÇÃO DE RECURSÃO)
-- ================================================================

-- O problema foi causado por uma política recursiva (checar role na própria tabela profiles).
-- Voltaremos para o método SEGURO (Hardcoded UUID) para o Master, que é infalível.

-- 1. Limpar Políticas de PROFILES (Onde ocorre o erro de Login)
DROP POLICY IF EXISTS "Read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Master read all profiles" ON profiles;
DROP POLICY IF EXISTS "allow_master_select_profiles" ON profiles;
DROP POLICY IF EXISTS "allow_master_delete_profiles" ON profiles;

-- 2. Criar Política SIMPLES para Profiles (Qualquer um lê a si mesmo - SEM RECURSÃO)
CREATE POLICY "Users can read own profile" ON profiles
FOR SELECT TO authenticated
USING (
    auth.uid() = id
);

-- 3. Criar Política MASTER para Profiles (Baseada no ID fixo do Master - SEM RECURSÃO)
CREATE POLICY "Master read all profiles" ON profiles
FOR SELECT TO authenticated
USING (
    auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid -- ID DO SEU USUÁRIO MASTER
);

-- 4. Corrigir Políticas de TENANTS (Para permitir a aprovação)
-- Removemos a dinâmica e voltamos para a fixa

DROP POLICY IF EXISTS "Master select all tenants" ON tenants;
DROP POLICY IF EXISTS "Master update tenants" ON tenants;
DROP POLICY IF EXISTS "Master delete tenants" ON tenants;

-- SELECT (Master vê tudo)
CREATE POLICY "Master select all tenants" ON tenants
FOR SELECT TO authenticated
USING (
    auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid
    OR
    id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- UPDATE (Master aprova tudo)
CREATE POLICY "Master update tenants" ON tenants
FOR UPDATE TO authenticated
USING (
    auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid
)
WITH CHECK (
    auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid
);

-- DELETE (Master deleta tudo)
CREATE POLICY "Master delete tenants" ON tenants
FOR DELETE TO authenticated
USING (
    auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid
);
