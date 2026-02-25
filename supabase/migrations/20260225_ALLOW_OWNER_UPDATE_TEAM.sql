-- ================================================================
-- ⚡ CORREÇÃO RLS: PERMITIR OWNERS ATUALIZAREM PERFIS DA EQUIPE
-- ================================================================
-- O usuário solicitou que o dono da loja possa atualizar os 
-- dados (incluindo avatar) dos membros da sua própria equipe 
-- via frontend, sem precisar de uma rota de API separada.
-- ================================================================

BEGIN;

-- 1. Removemos a política antiga se existir
DROP POLICY IF EXISTS "profiles_update_self_v6" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles in same tenant" ON profiles;
DROP POLICY IF EXISTS "profiles_update_owner_team" ON profiles;

-- 2. Criamos uma política combinada mais robusta
-- Permitir UPDATE SE:
-- A) For o próprio usuário (id = auth.uid()) OR
-- B) O usuário logado for 'owner' E estiver no mesmo tenant do perfil sendo alterado
CREATE POLICY "profiles_update_owner_team" ON profiles FOR UPDATE TO authenticated
USING (
    id = auth.uid() 
    OR 
    (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1)
        AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
    )
)
WITH CHECK (
    id = auth.uid() 
    OR 
    (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1)
        AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
    )
);

COMMIT;

-- VERIFICAÇÃO
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles' 
  AND cmd = 'UPDATE';
