-- Migration 006: Cotizaciones table (shared across all taller members)
-- Renamed from 005 → 006 because 005_ayuntamiento_fields.sql already claims
-- version "005" in schema_migrations. The duplicate version prevented this
-- migration from ever running on production or preview branches.
--
-- Fixes: cotizaciones were stored in localStorage per-browser, so only the
-- user who created them on a given device could see them. This migrates to
-- Supabase so all taller members (owner + mechanics) share the same data.

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cotizaciones (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id           UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  numero_cotizacion   TEXT NOT NULL,          -- e.g. "COT-001"
  plantilla           TEXT NOT NULL DEFAULT 'general'
                        CHECK (plantilla IN ('general', 'ayuntamiento', 'red_ambiental')),
  cliente             TEXT NOT NULL DEFAULT '',
  fecha               DATE,
  total               DECIMAL(12,2) DEFAULT 0,
  cancelada           BOOLEAN DEFAULT false,
  editada             BOOLEAN DEFAULT false,
  convertida          BOOLEAN DEFAULT false,
  form                JSONB NOT NULL DEFAULT '{}',  -- full FormCotizacion snapshot
  saved_at            TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-taller lookups sorted by date
CREATE INDEX IF NOT EXISTS idx_cotizaciones_taller_id
  ON cotizaciones (taller_id, created_at DESC);

-- ── Cotización counter (one row per taller) ───────────────────────────────────
-- Replaces the localStorage 'taller_cot_counter' key.

CREATE TABLE IF NOT EXISTS cotizacion_counter (
  taller_id   UUID REFERENCES talleres(id) ON DELETE CASCADE PRIMARY KEY,
  last_number INTEGER DEFAULT 0
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE cotizaciones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_counter ENABLE ROW LEVEL SECURITY;

-- Any taller member can read/write cotizaciones for their taller
DROP POLICY IF EXISTS "crud_cotizaciones" ON cotizaciones;
CREATE POLICY "crud_cotizaciones" ON cotizaciones
  FOR ALL
  USING      (is_taller_member(taller_id))
  WITH CHECK (is_taller_member(taller_id));

-- Any taller member can read/upsert the counter for their taller
DROP POLICY IF EXISTS "crud_cotizacion_counter" ON cotizacion_counter;
CREATE POLICY "crud_cotizacion_counter" ON cotizacion_counter
  FOR ALL
  USING      (is_taller_member(taller_id))
  WITH CHECK (is_taller_member(taller_id));
