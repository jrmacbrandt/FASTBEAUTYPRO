
-- Liberar a pesquisa de lojas para o cadastro (Público)
-- Isso permite que usuários "anonimos" (na tela de registro) busquem o nome da loja

DROP POLICY IF EXISTS "Public read access for tenants" ON tenants;
DROP POLICY IF EXISTS "Enable read access for all users" ON tenants;

CREATE POLICY "Public read access for tenants" 
ON tenants FOR SELECT 
USING (true);

-- Garantir que RLS está ativo
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
