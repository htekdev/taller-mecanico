-- Migration: email en clientes + IVA en órdenes de compra
-- Applied by Supabase branching on PR preview branches.
-- Also applied on production via Drizzle (0002_foamy_hairball.sql).

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
