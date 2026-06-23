-- Migration 002: Member email display + role update support
-- Adds email column to taller_members and RLS policy for owner role editing

ALTER TABLE "taller_members" ADD COLUMN IF NOT EXISTS "email" text;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION is_taller_owner(tid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM taller_members
    WHERE taller_id = tid AND user_id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER;
--> statement-breakpoint
DROP POLICY IF EXISTS "owner_update_member_role" ON taller_members;
--> statement-breakpoint
CREATE POLICY "owner_update_member_role" ON taller_members
  FOR UPDATE USING (is_taller_owner(taller_id))
  WITH CHECK (is_taller_owner(taller_id));
