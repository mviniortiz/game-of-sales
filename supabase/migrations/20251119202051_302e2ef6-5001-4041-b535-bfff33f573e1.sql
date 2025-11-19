-- Criar bucket de avatars se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que usuários vejam todos os avatars (bucket público)
CREATE POLICY "Avatars são publicamente acessíveis"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Política para permitir que usuários façam upload de seus próprios avatars
CREATE POLICY "Usuários podem fazer upload de seus próprios avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir que usuários atualizem seus próprios avatars
CREATE POLICY "Usuários podem atualizar seus próprios avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir que usuários deletem seus próprios avatars
CREATE POLICY "Usuários podem deletar seus próprios avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);