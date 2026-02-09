-- ================================================================
-- CORREÇÃO FINAL DA UI: Permitir SELECT para Master
-- ================================================================
-- O update funcionou, mas a UI não atualiza porque o Master
-- não tem permissão explícita de SELECT nas unidades pausadas/inativas.

-- Passo 1: Confirmar UUID
-- UUID: 2a898476-328c-4cd8-9d21-4778ec48c6ab

-- Passo 2: Criar política de SELECT TOTAL para Master
-- ================================================================
CREATE POLICY "allow_master_select_tenants" ON tenants
FOR SELECT
TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

-- Passo 3: Criar política de SELECT TOTAL para Profiles (para ver donos)
-- ================================================================
CREATE POLICY "allow_master_select_profiles" ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

-- Verificar
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE policyname LIKE '%master%'
ORDER BY tablename, cmd;
