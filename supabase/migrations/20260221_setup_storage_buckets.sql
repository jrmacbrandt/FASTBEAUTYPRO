-- Ensure 'services' bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('services', 'services', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure 'products' bucket is public (usually exists, but just in case)
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public access to read files from these buckets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Public Access to Services and Products'
    ) THEN
        CREATE POLICY "Public Access to Services and Products"
        ON storage.objects FOR SELECT
        USING (bucket_id IN ('services', 'products'));
    END IF;
END $$;

-- Allow authenticated users to upload to these buckets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Authenticated Upload to Services and Products'
    ) THEN
        CREATE POLICY "Authenticated Upload to Services and Products"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id IN ('services', 'products') AND auth.role() = 'authenticated');
    END IF;
END $$;
