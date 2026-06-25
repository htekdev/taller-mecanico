-- Migration: Add km column to trabajos
-- Sequential number: 005
-- Description: Stores vehicle odometer reading (km) at time of service.
--              The app field is called 'kilometraje' but maps to this 'km' column.
--              Note: 20260624_add_kilometraje_to_trabajos.sql was a previous attempt
--              that used a timestamp name format not picked up by Vercel migrations.

ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS km INTEGER;

COMMENT ON COLUMN trabajos.km IS 'Kilometraje (odómetro) del vehículo al ingresar al taller';
