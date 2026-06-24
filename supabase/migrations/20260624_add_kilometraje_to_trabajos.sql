-- Migration: Add kilometraje column to trabajos
-- Date: 2026-06-24
-- Description: Stores mileage (km) per work order so the shop can track
--              the vehicle's odometer reading at each service visit.

ALTER TABLE trabajos
  ADD COLUMN IF NOT EXISTS kilometraje INTEGER;

COMMENT ON COLUMN trabajos.kilometraje IS 'Kilometraje (odómetro) del vehículo al ingresar al taller';
