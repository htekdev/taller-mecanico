-- Migration: add pendiente_refacciones fields to trabajos
-- Allows jobs to be created without all parts in inventory, marked as pending

ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS pendiente_refacciones BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refacciones_pendientes_nombres TEXT[] NOT NULL DEFAULT '{}';
