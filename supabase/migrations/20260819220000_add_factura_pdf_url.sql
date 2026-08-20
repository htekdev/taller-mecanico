-- Add factura_pdf_url column to trabajos table
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS factura_pdf_url TEXT;
