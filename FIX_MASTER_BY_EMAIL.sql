-- ================================================================
-- FIX MASTER FINAL (ESTRATÉGIA POR EMAIL)
-- ================================================================
-- Este script garante acesso total ao usuário 'jrmacbrandt@gmail.com'
-- independente do UUID (que pode ter mudado).

-- 1. GARANTIR QUE O PERFIL É MASTER
UPDATE profiles 
SET role = 'master' 
WHERE email = 'jrmacbrandt@gmail.com';

-- 2. LIMPAR POLÍTICAS ANTIGAS DOS TENANTS
DROP POLICY IF EXISTS "Master select all tenants" ON tenants;
DROP POLICY IF EXISTS "Master update tenants" ON tenants;
DROP POLICY IF EXISTS "Master delete tenants" ON tenants;
DROP POLICY IF EXISTS "allow_master_delete_tenants" ON tenants;

-- 3. CRIAR POLÍTICAS INDESTRUTÍVEIS (Por Email)

-- SELECT: Master (por email) vê tudo. Outros veem se forem donos.
CREATE POLICY "Master or Owner select tenants" ON tenants
FOR SELECT TO authenticated
USING (
    (auth.jwt() ->> 'email' = 'jrmacbrandt@gmail.com') -- MASTER SUPREMO
    OR
    id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) -- DONO
);

-- UPDATE: Apenas o email do Master altera status
CREATE POLICY "Master update tenants" ON tenants
FOR UPDATE TO authenticated
USING (
    auth.jwt() ->> 'email' = 'jrmacbrandt@gmail.com'
)
WITH CHECK (
    auth.jwt() ->> 'email' = 'jrmacbrandt@gmail.com'
);

-- DELETE: Apenas o email do Master deleta
CREATE POLICY "Master delete tenants" ON tenants
FOR DELETE TO authenticated
USING (
    auth.jwt() ->> 'email' = 'jrmacbrandt@gmail.com'
);

-- 4. PERMISSÃO PARA LER TODOS OS PERFIS (Para o Dashboard funcionar)
DROP POLICY IF EXISTS "Master read all profiles" ON profiles;
CREATE POLICY "Master read all profiles" ON profiles
FOR SELECT TO authenticated
USING (
    (auth.jwt() ->> 'email' = 'jrmacbrandt@gmail.com')
    OR
    auth.uid() = id
);
