-- ================================================================
-- FIX RLS DYNAMIC: Substituir UUIDs hardcoded por verificação de Role
-- ================================================================

-- 1. Remover políticas antigas (hardcoded ou incorretas)
DROP POLICY IF EXISTS "allow_master_delete_tenants" ON tenants;
DROP POLICY IF EXISTS "allow_master_update_tenants" ON tenants;
DROP POLICY IF EXISTS "allow_master_select_tenants" ON tenants;
DROP POLICY IF EXISTS "Master manage tenants" ON tenants;

-- 2. Criar políticas dinâmicas baseadas na coluna 'role' da tabela 'profiles'

-- A. SELECT: Master pode ver TUDO. Outros veem apenas o próprio tenant (ou publico se necessário)
CREATE POLICY "Master select all tenants" ON tenants
FOR SELECT TO authenticated
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
    OR
    id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) -- Opcional: ver seu próprio tenant
);

-- B. UPDATE: Apenas Master pode editar status/plano
CREATE POLICY "Master update tenants" ON tenants
FOR UPDATE TO authenticated
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
)
WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
);

-- C. DELETE: Apenas Master pode deletar
CREATE POLICY "Master delete tenants" ON tenants
FOR DELETE TO authenticated
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
);

-- 3. Garantir acesso a Profiles para o Select acima funcionar (se já não existir)
-- (O usuário logado precisa conseguir ler seu próprio profile para checar a role)
CREATE POLICY "Read own profile" ON profiles
FOR SELECT TO authenticated
USING (
    id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
);
