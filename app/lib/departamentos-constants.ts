/**
 * Departamentos — shared constants.
 *
 * Both Trabajos and Cotizaciones read/write departamentos from the same
 * localStorage key so their department lists stay in sync. Defining the key
 * and defaults here prevents silent desync if either module renames them.
 */

/** localStorage key shared by all modules that manage departamentos. */
export const DEPTOS_KEY = 'taller_departamentos_ayuntamiento';

/** Fallback list when localStorage has no departamentos data. */
export const DEFAULT_DEPTOS: string[] = [
  'Obras públicas mantenimiento vial',
  'Servicios públicos aseo urbano poniente',
  'Servicios públicos aseo urbano oriente',
];
