-- ================================================================
-- ROBUST TENANT DELETE CASCADE V4 (ATOMIC & ORDERED)
-- ================================================================
-- This version specifically handles cross-table dependencies like
-- stock_transactions (pointing to profiles/products) being deleted 
-- BEFORE the profiles/products records.

CREATE OR REPLACE FUNCTION delete_tenant_cascade(target_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    stmt TEXT;
BEGIN
    -- PHASE 0: LOGGING
    RAISE NOTICE 'Starting Robust Atomic Deletion for Tenant: %', target_tenant_id;

    -- PHASE 1: Nuclear cleanup of intermediate dependencies (The culprits)
    -- These are tables that reference profiles, products, services, or clients
    -- and might block Phase 3 if they are processed in the wrong order.
    
    -- 1.1. Clear Stock Transactions (Blocks Profiles & Products)
    DELETE FROM stock_transactions WHERE tenant_id = target_tenant_id;
    
    -- 1.2. Clear Service Materials/Products (Blocks Products & Services)
    DELETE FROM service_materials WHERE tenant_id = target_tenant_id;
    DELETE FROM service_products WHERE tenant_id = target_tenant_id;
    
    -- 1.3. Clear Campaign Items (Blocks Campaigns)
    DELETE FROM campaign_items WHERE campaign_id IN (SELECT id FROM campaigns WHERE tenant_id = target_tenant_id);

    -- PHASE 2: Clear children of 'orders' (Standard flow)
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

    -- PHASE 3: Delete orders
    DELETE FROM orders WHERE tenant_id = target_tenant_id;

    -- PHASE 4: Clear ALL direct children of 'tenants' (Now safe to delete profiles, products, etc.)
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
        -- Skip table 'tenants' itself if accidentally picked up (shouldn't be)
        IF r.table_name != 'tenants' THEN
            stmt := 'DELETE FROM "' || r.table_name || '" WHERE "' || r.column_name || '" = ' || quote_literal(target_tenant_id);
            EXECUTE stmt;
        END IF;
    END LOOP;

    -- PHASE 5: Finally, Excluir o Tenant root
    DELETE FROM tenants WHERE id = target_tenant_id;
    
    RAISE NOTICE 'Nuclear deletion completed successfully for Tenant: %', target_tenant_id;
END;
$$;
