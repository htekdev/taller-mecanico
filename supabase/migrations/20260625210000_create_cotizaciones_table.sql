-- Migration: 20260625210000_create_cotizaciones_table
-- Creates the cotizaciones (quotes) table for Supabase.
-- Previously stored in localStorage only — this enables cloud persistence.

CREATE TABLE IF NOT EXISTS cotizaciones (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id           UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  numero_cotizacion   TEXT NOT NULL,
  plantilla           TEXT DEFAULT 'general' CHECK (plantilla IN ('ayuntamiento', 'red_ambiental', 'general')),
  -- Cliente / Vehículo
  cliente_id          UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nombre      TEXT NOT NULL DEFAULT '',
  vehiculo_id         UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
  marca               TEXT DEFAULT '',
  modelo              TEXT DEFAULT '',
  anio                TEXT DEFAULT '',
  placas              TEXT DEFAULT '',
  kms                 TEXT DEFAULT '',
  -- Datos de cotización
  fecha               DATE NOT NULL,
  trabajo             TEXT DEFAULT '',
  observaciones       TEXT DEFAULT '',
  incluir_iva         BOOLEAN DEFAULT false,
  autorizado_por      TEXT DEFAULT '',
  -- Ayuntamiento fields
  inventario          TEXT DEFAULT '',
  orden_servicio      TEXT DEFAULT '',
  departamento        TEXT DEFAULT '',
  -- Items (JSONB arrays of {id, descripcion, cantidad, precioUnitario})
  refacciones_items   JSONB DEFAULT '[]',
  mano_de_obra_items  JSONB DEFAULT '[]',
  -- Totals (computed on save for query efficiency)
  subtotal            DECIMAL(12,2) DEFAULT 0,
  iva                 DECIMAL(12,2) DEFAULT 0,
  total               DECIMAL(12,2) DEFAULT 0,
  -- Status flags
  cancelada           BOOLEAN DEFAULT false,
  editada             BOOLEAN DEFAULT false,
  convertida          BOOLEAN DEFAULT false,
  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by taller
CREATE INDEX IF NOT EXISTS idx_cotizaciones_taller ON cotizaciones(taller_id);

-- Index for finding by numero
CREATE INDEX IF NOT EXISTS idx_cotizaciones_numero ON cotizaciones(taller_id, numero_cotizacion);

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crud_cotizaciones" ON cotizaciones;
CREATE POLICY "crud_cotizaciones" ON cotizaciones
  FOR ALL USING (is_taller_member(taller_id))
  WITH CHECK (is_taller_member(taller_id));
