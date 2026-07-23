import type { Refaccion, Vehiculo } from '@/app/types';

/**
 * Determines whether a refaccion is compatible with the given vehiculo.
 *
 * Rules:
 * - No vehiculo supplied → compatible (universal context, no vehicle filter)
 * - Empty compatibilidad array → compatible with ALL vehicles (universal part)
 * - Matching marca entry AND (entry has no modelos, OR modelo matches) → compatible
 *
 * This is the canonical implementation — BuscadorRefacciones and any other
 * module that filters by vehicle compatibility should import from here.
 */
export function isCompatible(refaccion: Refaccion, vehiculo: Vehiculo | undefined): boolean {
  if (!vehiculo) return true;
  if (!refaccion.compatibilidad || refaccion.compatibilidad.length === 0) return true;
  const marca  = vehiculo.marca.toLowerCase().trim();
  const modelo = vehiculo.modelo.toLowerCase().trim();
  return refaccion.compatibilidad.some(c =>
    c.marca.toLowerCase().trim() === marca &&
    (c.modelos.length === 0 || c.modelos.some(m => m.toLowerCase().trim() === modelo))
  );
}
