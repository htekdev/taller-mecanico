import type {
  Vehiculo,
  Trabajo,
  Compra,
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

// ─── Compra payment helpers ───────────────────────────────────────────────────

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

// ─── Vehicle compatibility ────────────────────────────────────────────────────

/**
 * Returns true if the refaccion is compatible with the given vehicle.
 * Universal parts (no compatibilidad) are always compatible.
 */
export function isPartCompatibleWithVehiculo(
  r: Refaccion,
  vehiculo: Vehiculo | undefined
): boolean {
  if (!vehiculo) return true;
  if (!r.compatibilidad || r.compatibilidad.length === 0) return true; // universal
  const marca  = vehiculo.marca.toLowerCase().trim();
  const modelo = vehiculo.modelo.toLowerCase().trim();
  return r.compatibilidad.some(
    c =>
      c.marca.toLowerCase().trim() === marca &&
      c.modelos.some(m => m.toLowerCase().trim() === modelo)
  );
}

// ─── Pricing intelligence ─────────────────────────────────────────────────────

/**
 * Computes pricing suggestions and historical context for a part + client combo.
 * Uses highest price ever charged to this client as the price floor.
 */
export function getPricingIntel(
  refaccionId: string,
  clienteId: string,
  precioCompra: number,
  trabajos: Trabajo[]
): PricingIntel {
  // Margin-on-sale formula: sale = cost / (1 - margin%)
  const markups = [30, 40, 50].map(pct => ({
    pct,
    price: Math.round((precioCompra / (1 - pct / 100)) * 100) / 100,
  }));

  // All sales of this part to THIS client — highest price first
  const clientSales = trabajos
    .filter(t => t.clienteId === clienteId)
    .flatMap(t =>
      t.partes
        .filter(p => p.refaccionId === refaccionId && p.precioVenta > 0)
        .map(p => ({ precio: p.precioVenta, fecha: t.fecha }))
    )
    .sort((a, b) => b.precio - a.precio); // highest first

  // Prices to OTHER clients
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

  const facturado             = mes.reduce((s, t) => s + t.total, 0);
  const totalVentaRefacciones = mes.reduce((s, t) => s + t.refacciones, 0);
  const totalCostoRefacciones = mes.reduce((s, t) => s + (t.costoRefacciones ?? t.refacciones), 0);
  const totalManoObra         = mes.reduce((s, t) => s + t.manoDeObra, 0);
  const margenRefacciones     = totalVentaRefacciones - totalCostoRefacciones;
  const ganancia              = totalManoObra + margenRefacciones;

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
