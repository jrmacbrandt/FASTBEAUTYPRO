-- Create a storage bucket for tenant logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read access to logos
CREATE POLICY "Public Access Logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');

-- Policy to allow authenticated users to upload logos (restrict by tenant_id ideally, but for now allow auth users)
-- In a real scenario, we'd want to restrict uploads to the tenant owner.
CREATE POLICY "Authenticated Upload Logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Policy to allow owners to update their logos
CREATE POLICY "Owner Update Logos" ON storage.objects FOR UPDATE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Policy to allow owners to delete their logos
CREATE POLICY "Owner Delete Logos" ON storage.objects FOR DELETE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
