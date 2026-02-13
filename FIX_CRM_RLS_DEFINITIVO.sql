-- ================================================================
-- FIX FINAL CRM RLS: Solução Robusta para Campanhas
-- ================================================================

-- PASSO 1: Criar função helper com SECURITY DEFINER para evitar problemas de RLS/Recursão
CREATE OR REPLACE FUNCTION public.is_tenant_admin(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role = 'master' OR tenant_id = target_tenant_id)
  );
END;
$$;

-- PASSO 2: Aplicar políticas à tabela de Campanhas
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation campaigns" ON campaigns;
DROP POLICY IF EXISTS "master_bypass_tenants" ON campaigns;

CREATE POLICY "crm_manage_campaigns" ON campaigns
FOR ALL
TO authenticated
USING (public.is_tenant_admin(tenant_id))
WITH CHECK (public.is_tenant_admin(tenant_id));

-- PASSO 3: Aplicar políticas à tabela de Itens de Campanha
ALTER TABLE campaign_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation campaign_items" ON campaign_items;

CREATE POLICY "crm_manage_campaign_items" ON campaign_items
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM campaigns 
        WHERE campaigns.id = campaign_items.campaign_id 
        AND public.is_tenant_admin(campaigns.tenant_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM campaigns 
        WHERE campaigns.id = campaign_items.campaign_id 
        AND public.is_tenant_admin(campaigns.tenant_id)
    )
);

-- PASSO 4: Garantir permissões de execução na função
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID) TO service_role;
