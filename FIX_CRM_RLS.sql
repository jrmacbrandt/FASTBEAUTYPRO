-- ================================================================
-- FIX CRM RLS: Correção de políticas para Campanhas e Itens
-- ================================================================

-- 1. Campanhas: Simplificar e robustecer a política (Com bypass para Master)
DROP POLICY IF EXISTS "Tenant isolation campaigns" ON campaigns;
CREATE POLICY "Tenant isolation campaigns" ON campaigns 
    FOR ALL 
    TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' OR
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' OR
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- 2. Itens de Campanha: Simplificar a política
DROP POLICY IF EXISTS "Tenant isolation campaign_items" ON campaign_items;
CREATE POLICY "Tenant isolation campaign_items" ON campaign_items 
    FOR ALL 
    TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' OR
        campaign_id IN (
            SELECT id FROM campaigns 
            WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'master' OR
        campaign_id IN (
            SELECT id FROM campaigns 
            WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        )
    );

-- 3. Garantir que as tabelas tenham RLS ativado (Double Check)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_items ENABLE ROW LEVEL SECURITY;
