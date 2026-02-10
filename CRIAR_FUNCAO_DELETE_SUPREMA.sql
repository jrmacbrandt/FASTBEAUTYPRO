-- ================================================================
-- SOLUÇÃO SUPREMA: EXCLUSÃO DINÂMICA (DETECTA TABELAS SOZINHO)
-- ================================================================
-- Esta função é inteligente: ela olha o banco de dados, descobre
-- quem depende de 'tenants' e 'orders' e deleta tudo automaticamente.
-- Não precisamos mais adivinhar o nome das tabelas ocultas.

CREATE OR REPLACE FUNCTION delete_tenant_cascade(target_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    stmt TEXT;
BEGIN
    -- 1. FASE 1: Limpar filhos de 'orders' (ex: order_items, pagamentos)
    -- Descobre qualquer tabela que aponte para 'orders'
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
        AND ccu.table_name = 'orders' -- Alvo: filhos de orders
        AND tc.table_schema = 'public'
    LOOP
        -- Monta comando: DELETE FROM tabela WHERE coluna IN (SELECT id FROM orders WHERE tenant_id = ...)
        stmt := 'DELETE FROM "' || r.table_name || '" WHERE "' || r.column_name || '" IN (SELECT id FROM orders WHERE tenant_id = ' || quote_literal(target_tenant_id) || ')';
        RAISE NOTICE 'Executando: %', stmt;
        EXECUTE stmt;
    END LOOP;

    -- 2. FASE 2: Deletar ordens
    DELETE FROM orders WHERE tenant_id = target_tenant_id;

    -- 3. FASE 3: Limpar filhos diretos de 'tenants' (profiles, products, services, appointments, etc)
    -- Descobre qualquer tabela que aponte para 'tenants'
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
        AND ccu.table_name = 'tenants' -- Alvo: filhos de tenants
        AND tc.table_schema = 'public'
    LOOP
        -- Monta comando: DELETE FROM tabela WHERE coluna = tenant_id
        stmt := 'DELETE FROM "' || r.table_name || '" WHERE "' || r.column_name || '" = ' || quote_literal(target_tenant_id);
        RAISE NOTICE 'Executando: %', stmt;
        EXECUTE stmt;
    END LOOP;

    -- 4. FASE 4: Finalmente, Excluir o Tenant
    DELETE FROM tenants WHERE id = target_tenant_id;
END;
$$;
