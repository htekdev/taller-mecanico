-- Create Supabase Storage bucket for invoice PDF uploads (PRIVATE)
-- Path format: {tallerId}/{trabajoId}/factura.pdf
-- Access: only taller members can read/write their own PDFs
-- Reads: taller members generate 1-hour signed URLs via createSignedUrl()

-- Create PRIVATE bucket — access controlled via RLS + signed URLs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('facturas', 'facturas', false, 10485760, ARRAY['application/pdf']::text[])
  ON CONFLICT (id) DO NOTHING;

-- Allow taller members to read their own PDFs (for createSignedUrl)
DROP POLICY IF EXISTS "taller_members_read_facturas" ON storage.objects;
CREATE POLICY "taller_members_read_facturas" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'facturas'
    AND is_taller_member((storage.foldername(name))[1]::UUID)
  );

-- Allow taller members to upload PDFs (INSERT)
DROP POLICY IF EXISTS "taller_members_insert_facturas" ON storage.objects;
CREATE POLICY "taller_members_insert_facturas" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'facturas'
    AND is_taller_member((storage.foldername(name))[1]::UUID)
  );

-- Allow taller members to overwrite their PDFs via upsert (UPDATE)
DROP POLICY IF EXISTS "taller_members_update_facturas" ON storage.objects;
CREATE POLICY "taller_members_update_facturas" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'facturas'
    AND is_taller_member((storage.foldername(name))[1]::UUID)
  );

-- Allow taller members to delete their PDFs (DELETE)
DROP POLICY IF EXISTS "taller_members_delete_facturas" ON storage.objects;
CREATE POLICY "taller_members_delete_facturas" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'facturas'
    AND is_taller_member((storage.foldername(name))[1]::UUID)
  );
