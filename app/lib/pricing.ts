import type { PricingIntel, Trabajo } from '../types';

export function getPricingIntel(
  refaccionId: string,
  clienteId: string,
  precioCompra: number,
  trabajos: Trabajo[]
): PricingIntel {
  const markups = [30, 40, 50].map(pct => ({
    pct,
    // Margen sobre venta: sale = cost / (1 - margin%)
    // Guarantees profit is `pct`% of the sale price, not of cost
    price: Math.round((precioCompra / (1 - pct / 100)) * 100) / 100,
  }));

  // All sales of this part to THIS client — sorted highest price first
  // (we want the max price ever charged, not the most recent, per Hector's rule:
  //  "never charge less than the highest you've ever charged this client")
  const clientSales = trabajos
    .filter(t => t.clienteId === clienteId)
    .flatMap(t =>
      t.partes
        .filter(p => p.refaccionId === refaccionId && p.precioVenta > 0)
        .map(p => ({ precio: p.precioVenta, fecha: t.fecha }))
    )
    .sort((a, b) => b.precio - a.precio);  // highest price first

  // Prices charged to OTHER clients
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
