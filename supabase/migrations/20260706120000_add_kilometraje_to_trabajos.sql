-- Migration: Add kilometraje column to trabajos table
-- Created: 2026-07-06 (fresh file — previous migration was never applied by Supabase Branching)
-- Reason: The INSERT in app/lib/db.ts includes 'kilometraje' when provided,
--          but the column does not exist in the production 'trabajos' table,
--          causing "column kilometraje of relation trabajos does not exist" errors.
--
-- IF NOT EXISTS makes this idempotent — safe to run even if the column was
-- manually added via the Supabase dashboard.

ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS kilometraje INTEGER;

COMMENT ON COLUMN trabajos.kilometraje IS 'Kilometraje (odómetro) del vehículo al ingresar al taller';
