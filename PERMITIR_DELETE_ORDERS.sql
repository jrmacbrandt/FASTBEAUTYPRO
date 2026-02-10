-- ================================================================
-- CORREÇÃO: PERMITIR EXCLUSÃO DA TABELA ORDERS
-- ================================================================
-- O diagnóstico mostrou que a tabela 'orders' tem vínculo com tenants.
-- Precisamos permitir que o Master exclua ordens também.

-- 1. Política de DELETE para Orders
CREATE POLICY "allow_master_delete_orders" ON orders
FOR DELETE
TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

-- 2. Política de SELECT para Orders (opcional, para garantir que o código consiga verificar)
CREATE POLICY "allow_master_select_orders" ON orders
FOR SELECT
TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);


-- ================================================================
-- DIAGNÓSTICO DO PAUSE (Verificação)
-- ================================================================
-- Vamos verificar se algumas unidades estão realmente pausadas no banco
SELECT id, name, active, created_at
FROM tenants
ORDER BY created_at DESC
LIMIT 5;

-- OBS: Se 'active' estiver 'false', e a tela mostra ATIVO, o problema é puramente visual (cache ou lógica de renderização).
