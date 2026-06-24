-- Migration: 2026-06-24 — Email en clientes + IVA en órdenes de compra
-- Run against the Supabase production database.

-- 1. Add email columns to clientes (nullable, backward-compatible)
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS email  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email2 TEXT DEFAULT NULL;

-- 2. Add IVA columns to ordenes_compra (nullable/default, backward-compatible)
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS subtotal_sin_iva DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_amount       DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS con_iva          BOOLEAN DEFAULT false;

-- Backfill existing orders: subtotal_sin_iva = total (they had no IVA)
UPDATE ordenes_compra
SET subtotal_sin_iva = total,
    iva_amount = 0,
    con_iva = false
WHERE subtotal_sin_iva = 0 OR subtotal_sin_iva IS NULL;
