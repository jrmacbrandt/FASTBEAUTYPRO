-- ================================================================
-- VERIFICATION SCRIPT: INVENTORY & STOCK LOGIC (V5.0 - FIXED)
-- ================================================================
-- Uses DELETE for cleanup to avoid Transaction Block errors.

DO $$
DECLARE
    v_tenant_id UUID := '00000000-0000-0000-0000-000000000000'; -- Mock
    v_product_id UUID;
    v_order_id UUID;
    v_initial_stock INT := 100;
    v_sale_qty INT := 5;
    v_final_stock INT;
BEGIN
    RAISE NOTICE '🚀 Starting Verification (Clean Mode)...';

    -- 1. Create Test Product
    INSERT INTO products (name, current_stock, sale_price, min_threshold)
    VALUES ('Tesoura de Teste Verificacao', v_initial_stock, 50.00, 10)
    RETURNING id INTO v_product_id;

    -- 2. Create Order (Pending)
    INSERT INTO orders (total_value, status, finalized_at)
    VALUES (250.00, 'awaiting_payment', now())
    RETURNING id INTO v_order_id;
    
    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    VALUES (v_order_id, v_product_id, v_sale_qty, 50.00);

    -- 3. Verify Initial State (Stock should be 100)
    SELECT current_stock INTO v_final_stock FROM products WHERE id = v_product_id;
    IF v_final_stock <> v_initial_stock THEN
        RAISE EXCEPTION '❌ Error: Stock changed prematurely! Found: %, Expected: %', v_final_stock, v_initial_stock;
    END IF;

    -- 4. Confirm Payment (Trigger Execution)
    UPDATE orders SET status = 'completed' WHERE id = v_order_id;

    -- 5. Verify Final State (Stock should be 95)
    SELECT current_stock INTO v_final_stock FROM products WHERE id = v_product_id;
    
    IF v_final_stock = (v_initial_stock - v_sale_qty) THEN
        RAISE NOTICE '✅ Logic Check Passed: Stock deducted correctly from % to %.', v_initial_stock, v_final_stock;
    ELSE
        RAISE EXCEPTION '❌ FAILURE: Stock mismatch! Found: %, Expected: %', v_final_stock, (v_initial_stock - v_sale_qty);
    END IF;

    -- 6. Cleanup (Delete Test Data)
    -- Delete items first (in case of no cascade)
    DELETE FROM order_items WHERE order_id = v_order_id;
    DELETE FROM orders WHERE id = v_order_id;
    -- Delete product (should cascade to transactions)
    DELETE FROM products WHERE id = v_product_id;

    RAISE NOTICE '✨ Verification Completed Successfully & Data Cleaned.';

EXCEPTION WHEN OTHERS THEN
    -- Emergency Cleanup on Failure
    IF v_order_id IS NOT NULL THEN
        DELETE FROM order_items WHERE order_id = v_order_id;
        DELETE FROM orders WHERE id = v_order_id;
    END IF;
    IF v_product_id IS NOT NULL THEN
        DELETE FROM products WHERE id = v_product_id;
    END IF;
    RAISE EXCEPTION 'Verification Failed: %', SQLERRM;
END $$;
