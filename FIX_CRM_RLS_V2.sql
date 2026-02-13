-- ================================================================
-- FIX CRM RLS V2: Simplificação Máxima para Resolver Erro de Inserção
-- ================================================================

-- 1. Desativar RLS temporariamente para limpar políticas conflitantes
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_items DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_manage_campaigns" ON campaigns;
DROP POLICY IF EXISTS "Tenant isolation campaigns" ON campaigns;
DROP POLICY IF EXISTS "master_bypass_tenants" ON campaigns;
DROP POLICY IF EXISTS "crm_manage_campaign_items" ON campaign_items;
DROP POLICY IF EXISTS "Tenant isolation campaign_items" ON campaign_items;

-- 2. Recriar política de Campanhas (Sem funções complexas para teste)
-- Usamos uma subquery direta que é altamente performática no PostgreSQL
CREATE POLICY "crm_campaigns_policy_v2" ON campaigns
FOR ALL 
TO authenticated
USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) 
    OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
)
WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) 
    OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
);

-- 3. Recriar política de Itens
CREATE POLICY "crm_items_policy_v2" ON campaign_items
FOR ALL
TO authenticated
USING (
    campaign_id IN (
        SELECT id FROM campaigns 
        WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
    )
)
WITH CHECK (
    campaign_id IN (
        SELECT id FROM campaigns 
        WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
    )
);

-- 4. Reativar RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_items ENABLE ROW LEVEL SECURITY;

-- 5. Garantir que as tabelas tenham as permissões corretas para o role authenticated
GRANT ALL ON TABLE campaigns TO authenticated;
GRANT ALL ON TABLE campaign_items TO authenticated;
GRANT ALL ON TABLE campaigns TO service_role;
GRANT ALL ON TABLE campaign_items TO service_role;
