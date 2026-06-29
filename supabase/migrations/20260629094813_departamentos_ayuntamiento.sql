-- ── Departamentos Ayuntamiento ──────────────────────────────────────────────
-- Migrates the per-device localStorage list of ayuntamiento departments
-- to a shared Supabase table scoped to taller_id.
--
-- Each taller has its own ordered list of department names used when
-- creating Ayuntamiento work orders.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS departamentos_ayuntamiento (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id  UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  nombre     TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(taller_id, nombre)
);

ALTER TABLE departamentos_ayuntamiento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crud_departamentos_ayuntamiento" ON departamentos_ayuntamiento;
CREATE POLICY "crud_departamentos_ayuntamiento" ON departamentos_ayuntamiento
  FOR ALL USING (is_taller_member(taller_id))
  WITH CHECK (is_taller_member(taller_id));

CREATE INDEX IF NOT EXISTS idx_depto_aya_taller_order
  ON departamentos_ayuntamiento(taller_id, sort_order);
