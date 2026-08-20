-- ============================================================
-- Fix: refacciones.stock column from INTEGER to NUMERIC
--
-- Bug: Oil and liquid items use decimal quantities (e.g. 2.5L).
-- The INTEGER column caused Postgres to reject decimal stock
-- updates, silently preventing any inventory deduction for
-- fractional quantities.
--
-- SAFE migration: all existing integer values are exactly
-- representable as NUMERIC(12,4) — no data loss.
-- ============================================================

ALTER TABLE refacciones
  ALTER COLUMN stock      TYPE NUMERIC(12,4),
  ALTER COLUMN stock_minimo TYPE NUMERIC(12,4);
