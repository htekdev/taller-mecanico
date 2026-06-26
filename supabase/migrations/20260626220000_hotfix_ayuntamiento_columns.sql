-- Hotfix: ensure all ayuntamiento/TFT columns exist on trabajos table.
-- Migration 005_ayuntamiento_fields.sql was never applied to production.
-- All statements use IF NOT EXISTS so this is fully idempotent.

ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS tipo_cliente       TEXT    DEFAULT 'general' CHECK (tipo_cliente IN ('general', 'ayuntamiento'));
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS departamento       TEXT;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS inventario_num     TEXT;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS orden_servicio_gob TEXT;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS tft_numero         TEXT;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS tft_estado         TEXT    DEFAULT 'sin_tft' CHECK (tft_estado IN ('sin_tft', 'con_tft'));
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS fecha_entrada      DATE;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS fecha_salida       DATE;
