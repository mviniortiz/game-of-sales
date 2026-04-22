-- Bucket público para logos de empresa (2MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152,
  ARRAY['image/png','image/jpeg','image/jpg','image/svg+xml','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Leitura pública (o bucket já é public, mas policies explícitas ajudam)
DROP POLICY IF EXISTS "company logos public read" ON storage.objects;
CREATE POLICY "company logos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');

-- Upload/update/delete apenas para admins da própria empresa
-- O path é sempre <company_id>/<filename>
DROP POLICY IF EXISTS "company logos admin write" ON storage.objects;
CREATE POLICY "company logos admin write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "company logos admin update" ON storage.objects;
CREATE POLICY "company logos admin update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "company logos admin delete" ON storage.objects;
CREATE POLICY "company logos admin delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
