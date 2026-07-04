-- Migration: Add numero_orden column to trabajos table
-- Created: 2026-07-02
-- Reason: The trabajos form has a "Número de Orden" field (numeroOrden) defined in the
--         Trabajo type and displayed in the UI, but the column never existed in the DB.
--         insertTrabajo and updateTrabajo now send numero_orden when provided.
--         Additionally, the kilometraje column migration (20260706120000) may not have
--         been applied to production yet — this companion migration ensures both columns
--         are present together (both use IF NOT EXISTS, safe to re-run idempotently).

-- ── numero_orden (work order number assigned by the shop) ────────────────────
ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS numero_orden TEXT;

COMMENT ON COLUMN trabajos.numero_orden
  IS 'Número de orden de trabajo asignado por el taller (ej: OT-2026-001)';

-- ── kilometraje guard — ensures the column exists even if the July-6 migration
-- was not applied yet (idempotent, harmless if already present) ───────────────
ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS kilometraje INTEGER;

COMMENT ON COLUMN trabajos.kilometraje
  IS 'Kilometraje (odómetro) del vehículo al ingresar al taller';
