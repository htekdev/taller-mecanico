-- Migration 005: Add kilometraje column to trabajos
-- Sequential naming so Supabase branching applies it (date-prefixed
-- migration 20260624_add_kilometraje_to_trabajos.sql was skipped).
-- IF NOT EXISTS is safe if that migration was somehow manually applied.

ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS kilometraje INTEGER;

COMMENT ON COLUMN trabajos.kilometraje IS 'Kilometraje (odómetro) del vehículo al ingresar al taller';
