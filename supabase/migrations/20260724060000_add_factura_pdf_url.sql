-- Add factura_pdf_url column to trabajos for storing uploaded invoice PDF URLs
ALTER TABLE public.trabajos
  ADD COLUMN IF NOT EXISTS factura_pdf_url TEXT;
