-- ================================================================
-- SOLUÇÃO FOCADA: Permitir DELETE e UPDATE para Master
-- ================================================================
-- Apenas permissões de escrita, sem consultas recursivas

-- Passo 1: Confirmar role
SELECT id, email, role FROM profiles WHERE email = 'jrmacbrandt@gmail.com';
-- UUID esperado: 2a898476-328c-4cd8-9d21-4778ec48c6ab

-- Passo 2: Criar políticas usando UUID direto (sem recursão)
-- ================================================================
-- IMPORTANTE: Substitua o UUID abaixo pelo que apareceu no SELECT acima

-- Tenants - permitir DELETE e UPDATE para Master
CREATE POLICY "allow_master_delete_tenants" ON tenants
FOR DELETE
TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

CREATE POLICY "allow_master_update_tenants" ON tenants
FOR UPDATE
TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid)
WITH CHECK (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

-- Appointments - permitir DELETE para Master
CREATE POLICY "allow_master_delete_appointments" ON appointments
FOR DELETE
TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

-- Products - permitir DELETE para Master
CREATE POLICY "allow_master_delete_products" ON products
FOR DELETE
TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

-- Services - permitir DELETE para Master
CREATE POLICY "allow_master_delete_services" ON services
FOR DELETE
TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

-- Profiles - permitir DELETE para Master
CREATE POLICY "allow_master_delete_profiles" ON profiles
FOR DELETE
TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

-- Verificar políticas criadas
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE policyname LIKE '%master%'
ORDER BY tablename;

-- ================================================================
-- RESULTADO ESPERADO:
-- - 6 políticas criadas (delete em 5 tabelas + update em tenants)
-- - Todas usando UUID direto (sem recursão)
-- - Delete e pause devem funcionar no painel Master
-- ================================================================
