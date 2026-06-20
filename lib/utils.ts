import type {
  Vehiculo,
  Trabajo,
  Compra,
  OrdenCompra,
  Factura,
  Refaccion,
  PricingIntel,
  EstadoPago,
} from './types';

// ─── Formatting ───────────────────────────────────────────────────────────────

export function fmt(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function labelVehiculo(v: Vehiculo): string {
  const base = [v.anio, v.marca, v.modelo].filter(Boolean).join(' ');
  return v.placa ? `${base} — ${v.placa}` : base;
}

// ─── Trabajo payment helpers ──────────────────────────────────────────────────

export function getMontoPagado(t: Trabajo): number {
  return (t.pagos ?? []).reduce((s, p) => s + p.monto, 0);
}

export function getEstadoPago(t: Trabajo): EstadoPago {
  const pagado = getMontoPagado(t);
  if (pagado <= 0) return 'pendiente';
  if (pagado >= t.total) return 'pagado';
  return 'parcial';
}

export function getSaldo(t: Trabajo): number {
  return Math.max(0, t.total - getMontoPagado(t));
}

// ─── Compra payment helpers (legacy) ──────────────────────────────────────────

export function getMontoPagadoCompra(c: Compra): number {
  return (c.pagos ?? []).reduce((s, p) => s + p.monto, 0);
}

export function getEstadoPagoCompra(c: Compra): EstadoPago {
  const p = getMontoPagadoCompra(c);
  if (p <= 0) return 'pendiente';
  if (p >= c.total) return 'pagado';
  return 'parcial';
}

export function getSaldoCompra(c: Compra): number {
  return Math.max(0, c.total - getMontoPagadoCompra(c));
}

// ─── Orden / Factura payment helpers ──────────────────────────────────────────

export function getMontoPagadoOrden(o: OrdenCompra): number {
  return (o.pagos ?? []).reduce((s, p) => s + p.monto, 0);
}

export function getEstadoPagoOrden(o: OrdenCompra): EstadoPago {
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

export function getEstadoPagoFactura(f: Factura): EstadoPago {
  const p = getMontoPagadoFactura(f);
  if (p <= 0) return 'pendiente';
  if (p >= f.total) return 'pagado';
  return 'parcial';
}

export function getSaldoFactura(f: Factura): number {
  return Math.max(0, f.total - getMontoPagadoFactura(f));
}

export function generarNumeroFactura(facturas: Factura[]): string {
  const year = new Date().getFullYear();
  const count = facturas.filter(f => f.numeroFactura.startsWith(`FAC-${year}`)).length + 1;
  return `FAC-${year}-${String(count).padStart(3, '0')}`;
}

export function generarNumeroOrden(ordenes: OrdenCompra[]): string {
  const year = new Date().getFullYear();
  const count = ordenes.filter(o => (o.numeroOrden ?? '').startsWith(`OC-${year}`)).length + 1;
  return `OC-${year}-${String(count).padStart(3, '0')}`;
}

// ─── Vehicle compatibility ────────────────────────────────────────────────────

export function isPartCompatibleWithVehiculo(
  r: Refaccion,
  vehiculo: Vehiculo | undefined
): boolean {
  if (!vehiculo) return true;
  if (!r.compatibilidad || r.compatibilidad.length === 0) return true;
  const marca = vehiculo.marca.toLowerCase().trim();
  const modelo = vehiculo.modelo.toLowerCase().trim();
  return r.compatibilidad.some(
    c =>
      c.marca.toLowerCase().trim() === marca &&
      c.modelos.some(m => m.toLowerCase().trim() === modelo)
  );
}

// ─── Pricing intelligence ─────────────────────────────────────────────────────

export function getPricingIntel(
  refaccionId: string,
  clienteId: string,
  precioCompra: number,
  trabajos: Trabajo[]
): PricingIntel {
  const markups = [30, 40, 50].map(pct => ({
    pct,
    price: Math.round((precioCompra / (1 - pct / 100)) * 100) / 100,
  }));

  const clientSales = trabajos
    .filter(t => t.clienteId === clienteId)
    .flatMap(t =>
      t.partes
        .filter(p => p.refaccionId === refaccionId && p.precioVenta > 0)
        .map(p => ({ precio: p.precioVenta, fecha: t.fecha }))
    )
    .sort((a, b) => b.precio - a.precio);

  const otherPrices = trabajos
    .filter(t => t.clienteId !== clienteId)
    .flatMap(t =>
      t.partes
        .filter(p => p.refaccionId === refaccionId && p.precioVenta > 0)
        .map(p => p.precioVenta)
    );

  return {
    cost: precioCompra,
    markups,
    clientLastSale: clientSales[0] ?? null,
    clientAllSales: clientSales,
    otherMin: otherPrices.length ? Math.min(...otherPrices) : null,
    otherMax: otherPrices.length ? Math.max(...otherPrices) : null,
  };
}

// ─── Monthly summary ──────────────────────────────────────────────────────────

export interface ResumenMensual {
  facturado: number;
  totalVentaRefacciones: number;
  totalCostoRefacciones: number;
  margenRefacciones: number;
  totalManoObra: number;
  ganancia: number;
  cantidad: number;
  cobradoEnMes: number;
  porCobrarDelMes: number;
}

export function calcularResumenMensual(
  trabajos: Trabajo[],
  mesActual: string
): ResumenMensual {
  const mes = trabajos.filter(t => t.fecha.startsWith(mesActual));

  const facturado = mes.reduce((s, t) => s + t.total, 0);
  const totalVentaRefacciones = mes.reduce((s, t) => s + t.refacciones, 0);
  const totalCostoRefacciones = mes.reduce((s, t) => s + (t.costoRefacciones ?? t.refacciones), 0);
  const totalManoObra = mes.reduce((s, t) => s + t.manoDeObra, 0);
  const margenRefacciones = totalVentaRefacciones - totalCostoRefacciones;
  const ganancia = totalManoObra + margenRefacciones;

  const cobradoEnMes = trabajos.reduce(
    (s, t) =>
      s +
      (t.pagos ?? [])
        .filter(p => p.fecha.startsWith(mesActual))
        .reduce((s2, p) => s2 + p.monto, 0),
    0
  );
  const porCobrarDelMes = mes.reduce((s, t) => s + getSaldo(t), 0);

  return {
    facturado,
    totalVentaRefacciones,
    totalCostoRefacciones,
    margenRefacciones,
    totalManoObra,
    ganancia,
    cantidad: mes.length,
    cobradoEnMes,
    porCobrarDelMes,
  };
}
