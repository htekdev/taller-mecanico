-- Migration 004: tabla gastos (Operating Expenses)
-- Adds the gastos (gasto operativo) table used by app/lib/db.ts and app/modules/gastos/.
-- This table was added to the app code (PR #48) but never had a corresponding
-- Supabase migration — creating it here before removing Drizzle.

CREATE TABLE IF NOT EXISTS gastos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id    UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  categoria    TEXT NOT NULL CHECK (categoria IN ('operativo', 'administrativo', 'impuesto', 'nomina')),
  subcategoria TEXT NOT NULL DEFAULT '',
  concepto     TEXT NOT NULL DEFAULT '',
  monto        DECIMAL(12,2) NOT NULL DEFAULT 0,
  fecha        DATE NOT NULL,
  notas        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'crud_gastos' AND tablename = 'gastos') THEN
    CREATE POLICY "crud_gastos" ON gastos
      FOR ALL USING (is_taller_member(taller_id))
      WITH CHECK (is_taller_member(taller_id));
  END IF;
END $$;
