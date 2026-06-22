-- ============================================================
-- Migration 001: Fix taller_invites RLS for invite redemption
-- ============================================================
-- BUG: The original "ver_invitaciones" policy used FOR ALL with
--      is_taller_member(), which blocked invited users (who are
--      NOT yet members) from reading their own invite during the
--      /setup redemption flow. redeemInvite() always got null,
--      and the invited user saw "create taller" instead of auto-joining.
--
-- FIX: Split into 3 granular policies:
--   1. Members keep full CRUD on their taller's invites.
--   2. Invited user can SELECT their own invite (by email match).
--   3. Invited user can UPDATE their own invite (to mark used_at).
--
-- HOW TO APPLY: Run this SQL in the Supabase SQL Editor.
-- ============================================================

-- Remove the old blanket policy
DROP POLICY IF EXISTS "ver_invitaciones" ON taller_invites;

-- 1. Taller members: full CRUD on their taller's invites (create, cancel, view all)
CREATE POLICY "miembros_gestionar_invitaciones" ON taller_invites
  FOR ALL USING (is_taller_member(taller_id));

-- 2. Invited user: can SELECT their own pending invite (needed by redeemInvite)
--    This runs BEFORE they are a member, so is_taller_member would be false.
--    We use auth.email() to match the invite email safely.
CREATE POLICY "invitado_ver_su_invitacion" ON taller_invites
  FOR SELECT USING (lower(email) = lower(auth.email()));

-- 3. Invited user: can UPDATE their own invite (to set used_at during redemption)
--    After the INSERT into taller_members, the user becomes a member,
--    so policy #1 would also allow this — but this policy ensures it works
--    even if the membership insert races or fails.
CREATE POLICY "invitado_redimir_invitacion" ON taller_invites
  FOR UPDATE USING (lower(email) = lower(auth.email()));
