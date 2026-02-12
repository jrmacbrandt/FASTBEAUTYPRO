-- Check if product_commission column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'product_commission') THEN
        ALTER TABLE profiles ADD COLUMN product_commission NUMERIC DEFAULT 0;
    END IF;
END $$;
