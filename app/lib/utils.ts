import type { Trabajo, OrdenCompra, Factura, Vehiculo } from '../types';

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
