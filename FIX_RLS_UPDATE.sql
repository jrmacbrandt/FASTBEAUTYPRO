
-- Permitir que usuários atualizem perfis do MESMO tenant
-- Isso permite que o Dono aprove (update status) o Barbeiro

CREATE POLICY "Users can update profiles in same tenant" 
ON profiles FOR UPDATE
USING ( 
    tenant_id = get_auth_tenant_id() 
);

-- Garantir que a função de segurança existe (caso não tenha rodado o anterior)
CREATE OR REPLACE FUNCTION get_auth_tenant_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM profiles WHERE id = auth.uid(); $$;
