-- ── Categorías de refacciones personalizadas ────────────────────────────────
-- Stores per-taller custom part categories so that categories typed via
-- "Otra (escribir)..." in purchase orders persist and appear in future dropdowns.
-- Default categories remain hardcoded in the app; this table holds user additions.

CREATE TABLE IF NOT EXISTS categorias_refacciones (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id    UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  nombre       TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT categorias_refacciones_unique UNIQUE (taller_id, nombre)
);

ALTER TABLE categorias_refacciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crud_categorias_refacciones" ON categorias_refacciones;
CREATE POLICY "crud_categorias_refacciones" ON categorias_refacciones
  FOR ALL USING (is_taller_member(taller_id))
  WITH CHECK (is_taller_member(taller_id));

CREATE INDEX IF NOT EXISTS idx_categorias_refacciones_taller
  ON categorias_refacciones (taller_id);
