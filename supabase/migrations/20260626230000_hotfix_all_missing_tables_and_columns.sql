-- ══════════════════════════════════════════════════════════════════════════════
-- Comprehensive idempotent migration to ensure ALL production tables and
-- columns exist. This consolidates migrations 004, 005, and 20260626150000
-- which were never applied to the fzondawpxhkojszrwgck production project.
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS.
--
-- NOTE: columns for ayuntamiento and pendiente_refacciones below are also
-- present in 20260626220000 and 20260626150000 on main. Consolidated here
-- as a safety net in case those were not applied to the production project.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. gastos table (was migration 004_gastos.sql) ───────────────────────────
CREATE TABLE IF NOT EXISTS gastos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id    UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  categoria    TEXT NOT NULL CHECK (categoria IN ('operativo','administrativo','impuesto','nomina')),
  subcategoria TEXT NOT NULL,
  concepto     TEXT NOT NULL,
  monto        DECIMAL(12,2) NOT NULL CHECK (monto > 0),
  fecha        DATE NOT NULL,
  notas        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crud_gastos" ON gastos;
CREATE POLICY "crud_gastos" ON gastos
  FOR ALL USING (is_taller_member(taller_id))
  WITH CHECK (is_taller_member(taller_id));

CREATE INDEX IF NOT EXISTS idx_gastos_taller_fecha ON gastos(taller_id, fecha);

-- ── 2. trabajos ayuntamiento columns (was migration 005_ayuntamiento_fields.sql) ──
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS tipo_cliente       TEXT DEFAULT 'general' CHECK (tipo_cliente IN ('general', 'ayuntamiento'));
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS departamento       TEXT;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS inventario_num     TEXT;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS orden_servicio_gob TEXT;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS tft_numero         TEXT;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS tft_estado         TEXT DEFAULT 'sin_tft' CHECK (tft_estado IN ('sin_tft', 'con_tft'));
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS fecha_entrada      DATE;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS fecha_salida       DATE;

-- ── 3. trabajos pendiente_refacciones (was migration 20260626150000) ─────────
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS pendiente_refacciones          BOOLEAN  NOT NULL DEFAULT FALSE;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS refacciones_pendientes_nombres TEXT[]   NOT NULL DEFAULT '{}';
