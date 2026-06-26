-- Create cotizaciones table + counter (previously only in localStorage)
-- Fixes: cotizaciones were browser-local, not visible across devices/users.

CREATE TABLE IF NOT EXISTS cotizaciones (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id           UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  numero_cotizacion   TEXT NOT NULL,
  plantilla           TEXT NOT NULL DEFAULT 'general'
                        CHECK (plantilla IN ('general', 'ayuntamiento', 'red_ambiental')),
  cliente             TEXT NOT NULL DEFAULT '',
  fecha               DATE,
  total               DECIMAL(12,2) DEFAULT 0,
  cancelada           BOOLEAN DEFAULT false,
  editada             BOOLEAN DEFAULT false,
  convertida          BOOLEAN DEFAULT false,
  form                JSONB NOT NULL DEFAULT '{}',
  saved_at            TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_taller_id
  ON cotizaciones (taller_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cotizacion_counter (
  taller_id   UUID REFERENCES talleres(id) ON DELETE CASCADE PRIMARY KEY,
  last_number INTEGER DEFAULT 0
);

ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_counter ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crud_cotizaciones" ON cotizaciones;
CREATE POLICY "crud_cotizaciones" ON cotizaciones
  FOR ALL
  USING (is_taller_member(taller_id))
  WITH CHECK (is_taller_member(taller_id));

DROP POLICY IF EXISTS "crud_cotizacion_counter" ON cotizacion_counter;
CREATE POLICY "crud_cotizacion_counter" ON cotizacion_counter
  FOR ALL
  USING (is_taller_member(taller_id))
  WITH CHECK (is_taller_member(taller_id));
