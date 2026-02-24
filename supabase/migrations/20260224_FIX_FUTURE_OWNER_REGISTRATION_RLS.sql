-- ================================================================
-- ⚡ CORREÇÃO RLS PARA CADASTRO DE FUTUROS PERFIS (OWNERS)
-- ================================================================
-- Restaurar as permissões vitais de UPDATE para owners
-- para que o LoginComponent consiga preencher os dados do tenant
-- e do profile após a trigger criá-los.
-- ================================================================

BEGIN;

-- 1. Políticas de UPDATE para Profiles
-- Permitir que o próprio usuário atualize seu perfil (necessário no onboarding)
CREATE POLICY "profiles_update_self_v6" ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 2. Políticas de UPDATE para Tenants
-- Permitir que o dono (owner) atualize o tenant ao qual ele pertence (onboarding de loja)
CREATE POLICY "tenants_update_owner_v6" ON tenants FOR UPDATE TO authenticated
USING (
    id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1) 
    AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
)
WITH CHECK (
    id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

COMMIT;

-- VERIFICAÇÃO FINAL
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'tenants') 
  AND cmd = 'UPDATE';
