-- Create private bucket for factura PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'facturas',
  'facturas',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: taller members can manage their own PDFs
-- Path pattern: {taller_id}/{trabajo_id}/factura.pdf
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'taller_members_manage_facturas_pdfs'
  ) THEN
    CREATE POLICY "taller_members_manage_facturas_pdfs"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
      bucket_id = 'facturas'
      AND EXISTS (
        SELECT 1 FROM taller_members
        WHERE taller_id = (string_to_array(storage.objects.name, '/'))[1]::uuid
        AND user_id = auth.uid()
      )
    )
    WITH CHECK (
      bucket_id = 'facturas'
      AND EXISTS (
        SELECT 1 FROM taller_members
        WHERE taller_id = (string_to_array(storage.objects.name, '/'))[1]::uuid
        AND user_id = auth.uid()
      )
    );
  END IF;
END
$$;
