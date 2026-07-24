-- Migration: add factura_pdf_url column to trabajos
-- Allows storing a link to the uploaded invoice PDF in Supabase Storage

ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS factura_pdf_url TEXT;

-- Create storage bucket for invoice PDFs (public, PDF only, 10MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('facturas', 'facturas', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for invoice PDF storage
-- Path within bucket: {tallerId}/{trabajoId}/factura.pdf
-- taller-path isolation: only taller members may write

DO $pol$ BEGIN
  CREATE POLICY "Authenticated taller members can upload facturas"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'facturas'
      AND EXISTS (
        SELECT 1 FROM public.taller_members
        WHERE taller_id = (storage.foldername(name))[1]::uuid
          AND user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

DO $pol2$ BEGIN
  CREATE POLICY "Anyone can read facturas"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'facturas');
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol2$;

DO $pol3$ BEGIN
  CREATE POLICY "Authenticated taller members can update facturas"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'facturas'
      AND EXISTS (
        SELECT 1 FROM public.taller_members
        WHERE taller_id = (storage.foldername(name))[1]::uuid
          AND user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol3$;
