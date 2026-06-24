-- Migration 003: email en clientes + IVA en órdenes de compra
-- Follows sequential naming (003_) to avoid version conflicts with
-- date-prefixed migrations (e.g. 20260624_add_kilometraje...).
-- Applied by Supabase branching on PR preview branches.

-- 1. Clientes: correo electrónico (2 campos opcionales)
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS email  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email2 TEXT DEFAULT NULL;

-- 2. Órdenes de compra: desglose IVA (retrocompatible — defaults a 0/false)
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS subtotal_sin_iva DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_amount       DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS con_iva          BOOLEAN DEFAULT false;

-- Backfill existing orders: subtotal_sin_iva = total (no tenían IVA separado)
UPDATE ordenes_compra
   SET subtotal_sin_iva = total,
       iva_amount = 0,
       con_iva = false
 WHERE subtotal_sin_iva IS NULL OR subtotal_sin_iva = 0;
