-- Fix: add UUID format guard to facturas storage RLS policy.
--
-- The original policy casts (string_to_array(name, '/'))[1] directly to ::uuid.
-- If any object path has a non-UUID first segment (malformed upload, admin tool,
-- future Supabase internal prefixes), PostgreSQL throws
-- "ERROR: invalid input syntax for type uuid" instead of evaluating to false.
-- This turns a routine access check into a 500 error.
--
-- Fix: test first segment against a UUID regex BEFORE the ::uuid cast so that
-- malformed paths return false cleanly, never raise an exception.

DO $$
BEGIN
  -- Drop old policy (created without UUID guard)
  DROP POLICY IF EXISTS "taller_members_manage_facturas_pdfs" ON storage.objects;

  -- Re-create with regex short-circuit before ::uuid cast
  CREATE POLICY "taller_members_manage_facturas_pdfs"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'facturas'
    AND (string_to_array(storage.objects.name, '/'))[1]
          ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1 FROM taller_members
      WHERE taller_id = ((string_to_array(storage.objects.name, '/'))[1])::uuid
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'facturas'
    AND (string_to_array(storage.objects.name, '/'))[1]
          ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1 FROM taller_members
      WHERE taller_id = ((string_to_array(storage.objects.name, '/'))[1])::uuid
      AND user_id = auth.uid()
    )
  );
END
$$;
