-- ── Gastos (Operating Expenses) ──────────────────────────────────────────────
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
