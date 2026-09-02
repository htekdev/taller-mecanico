-- ============================================================
-- Migration: 20260902180000_add_historial_compras_refaccion
-- Purpose:   Add purchase history table per inventory part
-- Feature:   Feat #222 — historial de compras por pieza
-- ============================================================

-- ── historial_compras_refaccion ──────────────────────────────────────────────
-- One row per purchase entry for a specific part (refaccion).
-- Sofia requested: quién compró, cuándo, cuánto y a qué precio.
CREATE TABLE IF NOT EXISTS historial_compras_refaccion (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id        UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  refaccion_id     UUID REFERENCES refacciones(id) ON DELETE CASCADE NOT NULL,
  -- Supplier info (proveedor_id is optional — may not be in the system yet)
  proveedor_id     UUID REFERENCES proveedores(id) ON DELETE SET NULL,
  proveedor_nombre TEXT NOT NULL DEFAULT '',   -- snapshot so history survives proveedor deletion
  -- Purchase details
  fecha            DATE NOT NULL,
  cantidad         INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario  DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (precio_unitario >= 0),
  total            DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index: queries always filter by taller_id + refaccion_id, ordered by fecha DESC
CREATE INDEX IF NOT EXISTS idx_historial_compras_refaccion_lookup
  ON historial_compras_refaccion (taller_id, refaccion_id, fecha DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE historial_compras_refaccion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crud_historial_compras_refaccion" ON historial_compras_refaccion;
CREATE POLICY "crud_historial_compras_refaccion"
  ON historial_compras_refaccion
  FOR ALL
  USING (is_taller_member(taller_id))
  WITH CHECK (is_taller_member(taller_id));
