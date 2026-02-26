-- ================================================================
-- 🛡️ [BLINDADO] MIGRATION: FIX RLS INSUMOS (SUPPLIES) v5.1
-- ================================================================
-- Alvo: Tabela 'supplies'
-- Motivo: A tabela foi criada mas suas políticas foram removidas 
-- no reset de segurança global e não foram re-aplicadas.
-- ================================================================

BEGIN;

ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplies_universal_access" ON supplies;
DROP POLICY IF EXISTS "supplies_isolation_v5" ON supplies;

CREATE POLICY "supplies_isolation_v5" ON supplies 
FOR ALL 
TO authenticated 
USING (
    public.is_master_v5() 
    OR tenant_id = public.get_tenant_safe()
) 
WITH CHECK (
    public.is_master_v5() 
    OR tenant_id = public.get_tenant_safe()
);

NOTIFY pgrst, 'reload schema';

COMMIT;
