-- Add image_url column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for services if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('services', 'services', true) 
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload to services bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'services');

-- Policy to allow public to view services images
CREATE POLICY "Allow public viewing" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'services');

-- Policy to allow authenticated users to update their own uploads (or all for now since RLS on objects is tricky without metadata)
-- For simplicity in this context, we allow authenticated users to update/delete in this bucket
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'services');

CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'services');
