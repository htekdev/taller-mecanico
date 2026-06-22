-- ============================================================
-- Migration 002: Member email display + role update support
-- Run in Supabase SQL Editor (Dashboard → SQL)
-- ============================================================

-- 1. Add email column to taller_members
--    Stores the user's email for readable display (populated on member create)
ALTER TABLE taller_members ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Helper: is current user an OWNER of a given taller?
CREATE OR REPLACE FUNCTION is_taller_owner(tid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM taller_members
    WHERE taller_id = tid AND user_id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Allow taller owners to update member roles
--    Multiple owners are supported — no single-owner constraint
DROP POLICY IF EXISTS "owner_update_member_role" ON taller_members;
CREATE POLICY "owner_update_member_role" ON taller_members
  FOR UPDATE USING (is_taller_owner(taller_id))
  WITH CHECK (is_taller_owner(taller_id));
