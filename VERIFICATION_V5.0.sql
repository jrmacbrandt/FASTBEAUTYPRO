-- ================================================================
-- VERIFICATION SCRIPT: INVENTORY & STOCK LOGIC (V5.0)
-- ================================================================
-- Use this script to validate if the Triggers and logic are working correctly.

BEGIN;

-- 1. Setup Test Tenant & User (Mock)
DO $$
DECLARE
    v_tenant_id UUID := '00000000-0000-0000-0000-000000000000'; -- Replace with valid if needed for RLS check
    v_product_id UUID;
    v_order_id UUID;
    v_initial_stock INT := 100;
    v_sale_qty INT := 5;
    v_final_stock INT;
BEGIN
    RAISE NOTICE '🚀 Starting Verification...';

    -- 2. Create Test Product
    INSERT INTO products (name, current_stock, sale_price, min_threshold)
    VALUES ('Tesoura de Teste', v_initial_stock, 50.00, 10)
    RETURNING id INTO v_product_id;

    RAISE NOTICE '✅ Product Created: % (Stock: %)', v_product_id, v_initial_stock;

    -- 3. Simulate Sale Order (Pending)
    INSERT INTO orders (total_value, status, finalized_at)
    VALUES (250.00, 'awaiting_payment', now())
    RETURNING id INTO v_order_id;
    
    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    VALUES (v_order_id, v_product_id, v_sale_qty, 50.00);

    RAISE NOTICE '✅ Order % Created (Pending). Stock should NOT change yet.', v_order_id;

    -- Check Stock (Should be 100)
    SELECT current_stock INTO v_final_stock FROM products WHERE id = v_product_id;
    IF v_final_stock <> v_initial_stock THEN
        RAISE EXCEPTION '❌ Error: Stock changed prematurely! Found: %, Expected: %', v_final_stock, v_initial_stock;
    END IF;

    -- 4. Confirm Payment (Trigger Execution)
    UPDATE orders SET status = 'completed' WHERE id = v_order_id;

    -- Check Stock (Should be 95)
    SELECT current_stock INTO v_final_stock FROM products WHERE id = v_product_id;
    
    IF v_final_stock = (v_initial_stock - v_sale_qty) THEN
        RAISE NOTICE '✅ SUCCESS: Stock deducted correctly! New Stock: %', v_final_stock;
    ELSE
        RAISE EXCEPTION '❌ FAILURE: Stock mismatch! Found: %, Expected: %', v_final_stock, (v_initial_stock - v_sale_qty);
    END IF;

    -- 5. Verify Transaction Log
    IF EXISTS (SELECT 1 FROM stock_transactions WHERE product_id = v_product_id AND type = 'OUT' AND quantity = v_sale_qty) THEN
        RAISE NOTICE '✅ SUCCESS: Audit Log found in stock_transactions.';
    ELSE
         RAISE EXCEPTION '❌ FAILURE: No Audit Log found!';
    END IF;

    -- Rollback everything to keep DB clean
    RAISE NOTICE '🧹 Cleaning up (Rollback)...';
    ROLLBACK;
    RAISE NOTICE '✨ Verification Completed Successfully (Changes Rolled Back).';
END $$;
