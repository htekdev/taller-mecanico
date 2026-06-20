// ─── Shared constants for Taller Mecánico ────────────────────────────────────

export const CATEGORIAS = [
  'Filtros',
  'Aceites',
  'Frenos',
  'Motor',
  'Eléctrico',
  'Transmisión',
  'Suspensión',
  'Otros',
] as const;

export const UNIDADES = [
  'pza',
  'lt',
  'par',
  'kg',
  'metro',
  'rollo',
  'caja',
] as const;

export const BADGE_ESTADO = {
  pendiente: { label: 'Pendiente', cls: 'bg-rose-100 text-rose-700' },
  parcial:   { label: 'Parcial',   cls: 'bg-amber-100 text-amber-700' },
  pagado:    { label: 'Pagado',    cls: 'bg-emerald-100 text-emerald-700' },
} as const;
