-- ══════════════════════════════════════════════════════════════════════════════
-- Ensure numero_orden and kilometraje columns exist on trabajos table.
--
-- These columns were added in earlier migrations (20260701220000 and
-- 20260706120000) that may not have been applied to all environments.
-- This migration ensures PR #103's E2E tests run against a Supabase Preview
-- branch that has both columns, so the insertTrabajo 42703 fallback is not
-- needed and E2E save tests pass.
--
-- Both statements are idempotent (IF NOT EXISTS) — safe to re-run.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS numero_orden TEXT;

COMMENT ON COLUMN trabajos.numero_orden IS 'Número de orden del cliente (ej. OT-001, código interno del taller)';

ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS kilometraje INTEGER;

COMMENT ON COLUMN trabajos.kilometraje IS 'Kilometraje (odómetro) del vehículo al ingresar al taller';
