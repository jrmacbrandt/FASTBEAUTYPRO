-- ================================================================
-- NUCLEAR TENANT DELETE CASCADE V5 (DEFENSIVE & ATOMIC)
-- ================================================================
-- This version handles missing tables and cross-table dependencies
-- by using to_regclass() to verify existence before deletion.

CREATE OR REPLACE FUNCTION delete_tenant_cascade(target_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    stmt TEXT;
BEGIN
    RAISE NOTICE 'Starting Nuclear Atomic Deletion (V5) for Tenant: %', target_tenant_id;

    -- PHASE 1: DEFENSIVE CLEANUP of intermediate dependencies (IF THEY EXIST)
    -- We check for each table using to_regclass() to avoid "relation does not exist" errors.

    -- 1.1. Stock Transactions (Blocks Profiles & Products)
    IF to_regclass('public.stock_transactions') IS NOT NULL THEN
        DELETE FROM public.stock_transactions WHERE tenant_id = target_tenant_id;
    END IF;

    -- 1.2. Service Materials & Products (Blocks Products & Services)
    IF to_regclass('public.service_materials') IS NOT NULL THEN
        DELETE FROM public.service_materials WHERE tenant_id = target_tenant_id;
    END IF;
    IF to_regclass('public.service_products') IS NOT NULL THEN
        DELETE FROM public.service_products WHERE tenant_id = target_tenant_id;
    END IF;

    -- 1.3. CRM & Campaigns (Blocks Clients & Campaigns)
    IF to_regclass('public.campaign_items') IS NOT NULL THEN
        DELETE FROM public.campaign_items WHERE campaign_id IN (
            SELECT id FROM public.campaigns WHERE tenant_id = target_tenant_id
        );
    END IF;
    
    -- 1.4. Loyalty & VIP (Blocks Clients)
    IF to_regclass('public.loyalty_vouchers') IS NOT NULL THEN
        DELETE FROM public.loyalty_vouchers WHERE tenant_id = target_tenant_id;
    END IF;
    IF to_regclass('public.client_subscriptions') IS NOT NULL THEN
        DELETE FROM public.client_subscriptions WHERE tenant_id = target_tenant_id;
    END IF;

    -- PHASE 2: Dynamic cleanup of children of 'orders'
    -- We use information_schema to find all FKs pointing to orders.
    FOR r IN 
        SELECT tc.table_name, kcu.column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'orders' AND tc.table_schema = 'public'
    LOOP
        stmt := 'DELETE FROM public."' || r.table_name || '" WHERE "' || r.column_name || '" IN (SELECT id FROM public.orders WHERE tenant_id = ' || quote_literal(target_tenant_id) || ')';
        EXECUTE stmt;
    END LOOP;

    -- PHASE 3: Delete orders
    IF to_regclass('public.orders') IS NOT NULL THEN
        DELETE FROM public.orders WHERE tenant_id = target_tenant_id;
    END IF;

    -- PHASE 4: Dynamic cleanup of ALL direct children of 'tenants'
    -- This handles profiles, products, services, appointments, etc.
    FOR r IN 
        SELECT tc.table_name, kcu.column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'tenants' AND tc.table_schema = 'public'
    LOOP
        IF r.table_name != 'tenants' THEN
            stmt := 'DELETE FROM public."' || r.table_name || '" WHERE "' || r.column_name || '" = ' || quote_literal(target_tenant_id);
            EXECUTE stmt;
        END IF;
    END LOOP;

    -- PHASE 5: Excluir o Tenant root
    DELETE FROM public.tenants WHERE id = target_tenant_id;
    
    RAISE NOTICE 'Nuclear deletion (V5) completed successfully for Tenant: %', target_tenant_id;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Nuclear Delete Execution Failed: %', SQLERRM;
END;
$$;
