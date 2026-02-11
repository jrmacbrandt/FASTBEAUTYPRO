-- ================================================================
-- FIX: REMOVE DUPLICATE TRIGGER (DOUBLE DEDUCTION)
-- ================================================================

BEGIN;

-- 1. Drop the old conflicting trigger
DROP TRIGGER IF EXISTS trg_stock_reduction ON orders;

-- 2. Drop the old conflicting function
DROP FUNCTION IF EXISTS handle_stock_reduction();

-- 3. Verify that only OUR trigger remains
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_stock_reduction') THEN
        RAISE EXCEPTION '❌ Failed to drop trg_stock_reduction!';
    ELSE
        RAISE NOTICE '✅ Trigger trg_stock_reduction successfully removed.';
    END IF;
END $$;

COMMIT;
