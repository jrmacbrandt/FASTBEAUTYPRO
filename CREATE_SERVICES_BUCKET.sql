-- Criar bucket 'services' para imagens de serviços
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('services', 'services', true, 10485760, ARRAY['image/webp', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Remover políticas antigas se existirem para evitar conflito
DROP POLICY IF EXISTS "Public Services Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Services" ON storage.objects;
DROP POLICY IF EXISTS "Auth Manage Services" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Services" ON storage.objects;

-- Permitir acesso público de leitura
CREATE POLICY "Public Services Access" ON storage.objects
FOR SELECT
USING ( bucket_id = 'services' );

-- Permitir upload apenas para usuários autenticados
CREATE POLICY "Auth Upload Services" ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'services' AND
    auth.role() = 'authenticated'
);

-- Permitir update apenas para usuários autenticados
CREATE POLICY "Auth Update Services" ON storage.objects
FOR UPDATE
USING ( bucket_id = 'services' AND auth.role() = 'authenticated' );

-- Permitir delete apenas para usuários autenticados
CREATE POLICY "Auth Delete Services" ON storage.objects
FOR DELETE
USING ( bucket_id = 'services' AND auth.role() = 'authenticated' );
