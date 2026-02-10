-- ================================================================
-- MIGRATION: 2026-02-10 - FIX DELETE CASCADE & ORDERS PERMISSIONS
-- ================================================================

-- 1. Permitir que Master delete/select na tabela ORDERS
-- (Caso ainda não tenha sido aplicado)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_master_delete_orders') THEN
        CREATE POLICY "allow_master_delete_orders" ON orders
        FOR DELETE
        TO authenticated
        USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_master_select_orders') THEN
        CREATE POLICY "allow_master_select_orders" ON orders
        FOR SELECT
        TO authenticated
        USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);
    END IF;
END $$;


-- 2. CRIAR FUNÇÃO DE EXCLUSÃO DINÂMICA (SUPREMA)
-- Deleta automaticamente dependências de Orders e Tenants
CREATE OR REPLACE FUNCTION delete_tenant_cascade(target_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    stmt TEXT;
BEGIN
    -- FASE 1: Limpar filhos de 'orders' (ex: order_items, pagamentos)
    FOR r IN 
        SELECT 
            tc.table_name, 
            kcu.column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'orders'
        AND tc.table_schema = 'public'
    LOOP
        stmt := 'DELETE FROM "' || r.table_name || '" WHERE "' || r.column_name || '" IN (SELECT id FROM orders WHERE tenant_id = ' || quote_literal(target_tenant_id) || ')';
        EXECUTE stmt;
    END LOOP;

    -- FASE 2: Deletar ordens
    DELETE FROM orders WHERE tenant_id = target_tenant_id;

    -- FASE 3: Limpar filhos diretos de 'tenants'
    FOR r IN 
        SELECT 
            tc.table_name, 
            kcu.column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'tenants'
        AND tc.table_schema = 'public'
    LOOP
        stmt := 'DELETE FROM "' || r.table_name || '" WHERE "' || r.column_name || '" = ' || quote_literal(target_tenant_id);
        EXECUTE stmt;
    END LOOP;

    -- FASE 4: Finalmente, Excluir o Tenant
    DELETE FROM tenants WHERE id = target_tenant_id;
END;
$$;
