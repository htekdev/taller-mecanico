import type { Trabajo, OrdenCompra, Factura, Vehiculo, ManoDeObraItem } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getMontoPagado(t: Trabajo): number {
  return (t.pagos ?? []).reduce((s, p) => s + p.monto, 0);
}
export function getEstadoPago(t: Trabajo): 'pendiente' | 'parcial' | 'pagado' {
  const pagado = getMontoPagado(t);
  if (pagado <= 0)        return 'pendiente';
  if (pagado >= t.total)  return 'pagado';
  return 'parcial';
}
export function getSaldo(t: Trabajo): number {
  return Math.max(0, t.total - getMontoPagado(t));
}

export function getMontoPagadoOrden(o: OrdenCompra): number {
  return (o.pagos ?? []).reduce((s, p) => s + p.monto, 0);
}
export function getEstadoPagoOrden(o: OrdenCompra): 'pendiente' | 'parcial' | 'pagado' {
  const p = getMontoPagadoOrden(o);
  if (p <= 0) return 'pendiente';
  if (p >= o.total) return 'pagado';
  return 'parcial';
}
export function getSaldoOrden(o: OrdenCompra): number {
  return Math.max(0, o.total - getMontoPagadoOrden(o));
}

export function getMontoPagadoFactura(f: Factura): number {
  return (f.pagos ?? []).reduce((s, p) => s + p.monto, 0);
}
export function getEstadoPagoFactura(f: Factura): 'pendiente' | 'parcial' | 'pagado' {
  const p = getMontoPagadoFactura(f);
  if (p <= 0) return 'pendiente';
  if (p >= f.total) return 'pagado';
  return 'parcial';
}
export function getSaldoFactura(f: Factura): number {
  return Math.max(0, f.total - getMontoPagadoFactura(f));
}

/** Auto-generate a factura number like FAC-2026-001 */
export function generarNumeroFactura(facturas: Factura[]): string {
  const year = new Date().getFullYear();
  const count = facturas.filter(f => f.numeroFactura.startsWith(`FAC-${year}`)).length + 1;
  return `FAC-${year}-${String(count).padStart(3, '0')}`;
}

/** Auto-generate a purchase order number like OC-2026-001 */
export function generarNumeroOrden(ordenes: OrdenCompra[]): string {
  const year = new Date().getFullYear();
  const count = ordenes.filter(o => (o.numeroOrden ?? '').startsWith(`OC-${year}`)).length + 1;
  return `OC-${year}-${String(count).padStart(3, '0')}`;
}

export function labelVehiculo(v: Vehiculo) {
  const base = [v.anio, v.marca, v.modelo].filter(Boolean).join(' ');
  return v.placa ? `${base} — ${v.placa}` : base;
}

export function fmt(n: number): string {
  const safe = Number(n);
  if (!isFinite(safe)) return '0.00';
  return safe.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Date Utilities ───────────────────────────────────────────────────────────
// IMPORTANT: Never use `new Date("YYYY-MM-DD").toLocaleDateString()` — JavaScript
// parses bare date strings as UTC midnight, which shifts the date back 1 day for
// users in UTC-5 (Mexico CDT). Always use these helpers instead.

/**
 * Formats a YYYY-MM-DD date string for display without UTC shift.
 * Parses the date as local time (year, month, day) to avoid the UTC midnight bug.
 */
export function formatearFecha(fechaStr: string | undefined | null): string {
  if (!fechaStr) return '';
  const parts = fechaStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return fechaStr;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day).toLocaleDateString('es-MX');
}

/**
 * Returns today's date as a YYYY-MM-DD string in the user's LOCAL timezone.
 * Use instead of `new Date().toISOString().split('T')[0]` which returns UTC date.
 */
export function getHoy(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the current month as a YYYY-MM string in the user's LOCAL timezone.
 * Use instead of `new Date().toISOString().slice(0, 7)` which returns UTC month.
 */
export function getMesActual(): string {
  return getHoy().slice(0, 7);
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CATEGORIAS = ['Filtros', 'Aceites', 'Frenos', 'Motor', 'Eléctrico', 'Transmisión', 'Suspensión', 'Otros'];
export const UNIDADES   = ['pza', 'lt', 'par', 'kg', 'metro', 'rollo', 'caja'];

export const BADGE_ESTADO: Record<'pendiente' | 'parcial' | 'pagado', { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-rose-100 text-rose-700' },
  parcial:   { label: 'Parcial',   cls: 'bg-amber-100 text-amber-700' },
  pagado:    { label: 'Pagado',    cls: 'bg-emerald-100 text-emerald-700' },
};

export const BADGE_ORDEN: Record<string, { label: string; cls: string }> = {
  pendiente: { label: '⏳ Pendiente de recibir', cls: 'bg-amber-100 text-amber-700' },
  recibida:  { label: '✅ Recibida',             cls: 'bg-emerald-100 text-emerald-700' },
  cancelada: { label: '✗ Cancelada',             cls: 'bg-slate-100 text-slate-500' },
};

export type FiltroCuenta = 'todos' | 'pendiente' | 'parcial' | 'pagado';

// ─── Servicios Externos — helpers ─────────────────────────────────────────────

export function getMontoPagadoServicio(item: ManoDeObraItem): number {
  return (item.pagosServicio ?? []).reduce((s, p) => s + p.monto, 0);
}

export function getSaldoServicio(item: ManoDeObraItem): number {
  return Math.max(0, (item.costoTaller ?? 0) - getMontoPagadoServicio(item));
}

export function getEstadoServicio(item: ManoDeObraItem): 'pendiente' | 'parcial' | 'pagado' {
  const costo  = item.costoTaller ?? 0;
  const pagado = getMontoPagadoServicio(item);
  if (costo <= 0 || pagado >= costo) return 'pagado';
  if (pagado > 0)                    return 'parcial';
  return 'pendiente';
}
