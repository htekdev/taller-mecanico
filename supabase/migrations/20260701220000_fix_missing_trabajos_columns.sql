-- ══════════════════════════════════════════════════════════════════════════════
-- CRITICAL HOTFIX: Add ALL columns missing from production trabajos table
-- 
-- Investigation (2026-07-01): Production DB (fzondawpxhkojszrwgck) is missing
-- columns that prevent core app functionality:
--   - tipo_documento     → updateTrabajoFinalizar fails silently (estado stays 'pendiente')
--   - fecha_finalizacion → updateTrabajoFinalizar fails silently
--   - kilometraje        → updateTrabajo fails on any edit
--   - tipo_cliente       → insertTrabajo fails for ayuntamiento jobs
--   - pendiente_refacciones → insertTrabajo fails when parts are pending
--   - refacciones_pendientes_nombres → same
--
-- All statements use IF NOT EXISTS — safe to re-run idempotently.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Columns from initial schema that were never applied ──────────────────────
-- (tipo_documento and fecha_finalizacion are defined in 000_initial_schema.sql
--  but the production DB was set up from an older version of the file)

ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS tipo_documento     TEXT CHECK (tipo_documento IN ('factura', 'nota'));

ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS fecha_finalizacion TIMESTAMPTZ;

-- ── Migration 005_ayuntamiento_fields.sql ────────────────────────────────────
ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS tipo_cliente       TEXT DEFAULT 'general'
    CHECK (tipo_cliente IN ('general', 'ayuntamiento'));

ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS departamento       TEXT;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS inventario_num     TEXT;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS orden_servicio_gob TEXT;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS tft_numero         TEXT;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS tft_estado         TEXT DEFAULT 'sin_tft'
  CHECK (tft_estado IN ('sin_tft', 'con_tft'));
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS fecha_entrada      DATE;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS fecha_salida       DATE;

-- ── Migration 20260626150000_pendiente_refacciones ───────────────────────────
ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS pendiente_refacciones          BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS refacciones_pendientes_nombres TEXT[] NOT NULL DEFAULT '{}';

-- ── Migration 20260706120000_add_kilometraje ─────────────────────────────────
ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS kilometraje INTEGER;

COMMENT ON COLUMN trabajos.kilometraje
  IS 'Kilometraje (odómetro) del vehículo al ingresar al taller';

-- ── numero_orden (referenced in Trabajo type but never in DB) ────────────────
-- Adding it now so the app can persist it when PR #103 is merged
ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS numero_orden TEXT;
