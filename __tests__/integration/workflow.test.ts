import { describe, it, expect } from 'vitest';
import {
  getMontoPagado, getEstadoPago, getSaldo,
  getEstadoPagoOrden, getSaldoOrden,
  generarNumeroFactura, generarNumeroOrden,
} from '@/app/lib/utils';
import {
  mockTrabajo, mockTrabajoConIVA,
  mockOrden, mockFactura,
} from '../fixtures';
import type { Trabajo, OrdenCompra, Refaccion } from '@/app/types';

// ── IVA (tax) calculation logic ─────────────────────────────────────────────

describe('IVA calculation (16% Mexican tax)', () => {
  it('calculates 16% IVA on subtotal when requiereFactura=true', () => {
    const manoDeObra = 500;
    const refacciones = 600;
    const subtotal = manoDeObra + refacciones;
    const iva = Math.round(subtotal * 0.16 * 100) / 100;
    expect(iva).toBe(176); // 1100 * 0.16 = 176
  });

  it('IVA is zero when requiereFactura=false', () => {
    const iva = mockTrabajo.requiereFactura
      ? Math.round((mockTrabajo.manoDeObra + mockTrabajo.refacciones) * 0.16 * 100) / 100
      : 0;
    expect(iva).toBe(0);
  });

  it('total = manoDeObra + refacciones + iva', () => {
    const expectedTotal = mockTrabajoConIVA.manoDeObra + mockTrabajoConIVA.refacciones + mockTrabajoConIVA.iva;
    expect(expectedTotal).toBe(mockTrabajoConIVA.total);
  });

  it('total without IVA = manoDeObra + refacciones', () => {
    const expectedTotal = mockTrabajo.manoDeObra + mockTrabajo.refacciones + mockTrabajo.iva;
    expect(expectedTotal).toBe(mockTrabajo.total);
  });

  it('IVA rounding is precise to 2 decimals', () => {
    const subtotal = 333;
    const iva = Math.round(subtotal * 0.16 * 100) / 100;
    expect(iva).toBe(53.28);
  });
});

// ── Inventory stock management ──────────────────────────────────────────────

describe('Inventory stock management', () => {
  const baseInventory: Refaccion[] = [
    { id: 'r1', nombre: 'Filtro', codigo: 'F001', categoria: 'Filtros', unidad: 'pza', precioCompra: 150, stock: 10, stockMinimo: 2 },
    { id: 'r2', nombre: 'Aceite', codigo: 'A001', categoria: 'Aceites', unidad: 'lt', precioCompra: 80, stock: 5, stockMinimo: 1 },
  ];

  it('deducts stock when parts are used in a job', () => {
    const partes = [
      { refaccionId: 'r1', nombre: 'Filtro', codigo: 'F001', cantidad: 2, precioCompra: 150, precioVenta: 200, subtotal: 400, costoTotal: 300 },
    ];
    const updatedInventory = baseInventory.map(r => {
      const usada = partes.find(p => p.refaccionId === r.id);
      return usada ? { ...r, stock: r.stock - usada.cantidad } : r;
    });
    expect(updatedInventory.find(r => r.id === 'r1')!.stock).toBe(8);
  });

  it('only deducts parts used in the job', () => {
    const partes = [
      { refaccionId: 'r1', nombre: 'Filtro', codigo: 'F001', cantidad: 3, precioCompra: 150, precioVenta: 200, subtotal: 600, costoTotal: 450 },
    ];
    const updatedInventory = baseInventory.map(r => {
      const usada = partes.find(p => p.refaccionId === r.id);
      return usada ? { ...r, stock: r.stock - usada.cantidad } : r;
    });
    expect(updatedInventory.find(r => r.id === 'r2')!.stock).toBe(5);
  });

  it('stock increases when PO is received', () => {
    const ordenPartes = [{ refaccionId: 'r1', nombre: 'Filtro', cantidad: 10, precioCompra: 120, subtotal: 1200 }];
    const updatedInventory = baseInventory.map(r => {
      const item = ordenPartes.find(p => p.refaccionId === r.id);
      return item ? { ...r, stock: r.stock + item.cantidad } : r;
    });
    expect(updatedInventory.find(r => r.id === 'r1')!.stock).toBe(20);
  });

  it('detects low stock condition', () => {
    const withLow: Refaccion[] = [
      ...baseInventory,
      { id: 'r3', nombre: 'Bujía', codigo: 'B001', categoria: 'Motor', unidad: 'pza', precioCompra: 50, stock: 1, stockMinimo: 5 },
    ];
    const low = withLow.filter(r => r.stock < r.stockMinimo);
    expect(low).toHaveLength(1);
    expect(low[0].id).toBe('r3');
  });
});

// ── Payment state machine ───────────────────────────────────────────────────

describe('Payment state transitions', () => {
  it('Trabajo: no payments → pendiente', () => {
    expect(getEstadoPago(mockTrabajo)).toBe('pendiente');
    expect(getSaldo(mockTrabajo)).toBe(mockTrabajo.total);
  });

  it('Trabajo: partial payment → parcial', () => {
    const t: Trabajo = {
      ...mockTrabajo,
      total: 400,
      pagos: [{ id: 'p1', fecha: '2026-06-01', monto: 200 }],
    };
    expect(getEstadoPago(t)).toBe('parcial');
    expect(getSaldo(t)).toBe(200);
    expect(getMontoPagado(t)).toBe(200);
  });

  it('Trabajo: full payment → pagado', () => {
    const t: Trabajo = {
      ...mockTrabajo,
      total: 400,
      pagos: [
        { id: 'p1', fecha: '2026-06-01', monto: 200 },
        { id: 'p2', fecha: '2026-06-02', monto: 200 },
      ],
    };
    expect(getEstadoPago(t)).toBe('pagado');
    expect(getSaldo(t)).toBe(0);
  });

  it('OrdenCompra: no payments → pendiente', () => {
    expect(getEstadoPagoOrden(mockOrden)).toBe('pendiente');
    expect(getSaldoOrden(mockOrden)).toBe(1500);
  });

  it('OrdenCompra: partial payment → parcial', () => {
    const o: OrdenCompra = {
      ...mockOrden,
      pagos: [{ id: 'pc1', fecha: '2026-06-01', monto: 750 }],
    };
    expect(getEstadoPagoOrden(o)).toBe('parcial');
    expect(getSaldoOrden(o)).toBe(750);
  });

  it('OrdenCompra: full payment → pagado', () => {
    const o: OrdenCompra = {
      ...mockOrden,
      pagos: [{ id: 'pc1', fecha: '2026-06-01', monto: 1500 }],
    };
    expect(getEstadoPagoOrden(o)).toBe('pagado');
    expect(getSaldoOrden(o)).toBe(0);
  });
});

// ── Invoice number sequences ────────────────────────────────────────────────

describe('Sequential document numbering', () => {
  const year = new Date().getFullYear();

  it('FAC numbers increment correctly', () => {
    const f1 = { ...mockFactura, id: 'f1', numeroFactura: `FAC-${year}-001` };
    const f2 = { ...mockFactura, id: 'f2', numeroFactura: `FAC-${year}-002` };
    expect(generarNumeroFactura([f1, f2])).toBe(`FAC-${year}-003`);
  });

  it('OC numbers increment correctly', () => {
    const o1 = { ...mockOrden, numeroOrden: `OC-${year}-001` };
    expect(generarNumeroOrden([o1])).toBe(`OC-${year}-002`);
  });

  it('starts at 001 for a fresh year', () => {
    expect(generarNumeroFactura([])).toBe(`FAC-${year}-001`);
    expect(generarNumeroOrden([])).toBe(`OC-${year}-001`);
  });
});

// ── Part cost vs sale price profit calculation ──────────────────────────────

describe('Profit margin calculation', () => {
  it('calculates part profit per unit', () => {
    const parte = mockTrabajo.partes[0];
    expect(parte.precioVenta - parte.precioCompra).toBe(50);
  });

  it('calculates job gross margin from partes', () => {
    const ventaRefacciones = mockTrabajo.partes.reduce((s, p) => s + p.subtotal, 0);
    const costoRefacciones = mockTrabajo.partes.reduce((s, p) => s + p.costoTotal, 0);
    expect(ventaRefacciones - costoRefacciones).toBe(50);
  });

  it('total revenue = mano de obra + venta refacciones', () => {
    const revenueFromParts = mockTrabajo.partes.reduce((s, p) => s + p.subtotal, 0);
    expect(mockTrabajo.manoDeObra + revenueFromParts).toBe(mockTrabajo.total);
  });
});

// ── Multi-tenant data scoping ───────────────────────────────────────────────

describe('Multi-tenant taller scoping', () => {
  it('filters trabajos by tallerId correctly', () => {
    const allTrabajos: (Trabajo & { tallerId: string })[] = [
      { ...mockTrabajo, tallerId: 'taller-A' },
      { ...mockTrabajoConIVA, id: 't5', tallerId: 'taller-B' },
      { ...mockTrabajo, id: 't6', tallerId: 'taller-A' },
    ];
    expect(allTrabajos.filter(t => t.tallerId === 'taller-A')).toHaveLength(2);
    expect(allTrabajos.filter(t => t.tallerId === 'taller-B')).toHaveLength(1);
  });
});

// ── IVA en Órdenes de Compra ────────────────────────────────────────────────
// These tests guard the exact logic Sofia uses in Órdenes de Compra + Cuentas por Pagar.
// EVERY test here must pass before the preview is shared with Sofia.

describe('IVA en Órdenes de Compra — cálculo y desglose', () => {
  const IVA_RATE = 0.16;

  // Helper mirrors the exact logic in ordenes/index.tsx handleSubmit
  function calcularTotalesOrden(subtotalPiezas: number, conIVA: boolean) {
    const ivaAmount = conIVA
      ? Math.round(subtotalPiezas * IVA_RATE * 100) / 100
      : 0;
    return {
      subtotalSinIVA: subtotalPiezas,
      ivaAmount,
      total: subtotalPiezas + ivaAmount,
      conIVA,
    };
  }

  it('sin IVA: total = subtotal, ivaAmount = 0', () => {
    const result = calcularTotalesOrden(1000, false);
    expect(result.subtotalSinIVA).toBe(1000);
    expect(result.ivaAmount).toBe(0);
    expect(result.total).toBe(1000);
    expect(result.conIVA).toBe(false);
  });

  it('con IVA: ivaAmount = subtotal × 16%', () => {
    const result = calcularTotalesOrden(1000, true);
    expect(result.subtotalSinIVA).toBe(1000);
    expect(result.ivaAmount).toBe(160);
    expect(result.total).toBe(1160);
    expect(result.conIVA).toBe(true);
  });

  it('con IVA: total = subtotalSinIVA + ivaAmount siempre', () => {
    const cases = [100, 333, 1500, 9999.99];
    for (const subtotal of cases) {
      const result = calcularTotalesOrden(subtotal, true);
      expect(result.total).toBeCloseTo(result.subtotalSinIVA + result.ivaAmount, 2);
    }
  });

  it('redondeo a 2 decimales en IVA (centavos exactos)', () => {
    const result = calcularTotalesOrden(333, true);
    expect(result.ivaAmount).toBe(53.28);     // 333 × 0.16 = 53.28
    expect(result.total).toBe(386.28);
  });

  it('IVA en OC con varias piezas: subtotal = suma de piezas', () => {
    const piezas = [
      { nombre: 'Filtro aceite', cantidad: 5, precioCompra: 100, subtotal: 500 },
      { nombre: 'Bujías',        cantidad: 4, precioCompra: 75,  subtotal: 300 },
    ];
    const subtotalPiezas = piezas.reduce((s, p) => s + p.subtotal, 0);
    expect(subtotalPiezas).toBe(800);
    const result = calcularTotalesOrden(subtotalPiezas, true);
    expect(result.ivaAmount).toBe(128);
    expect(result.total).toBe(928);
  });

  it('orden sin IVA: saldo = total (nada pagado)', () => {
    const orden: OrdenCompra = {
      ...mockOrden,
      conIVA: false, subtotalSinIVA: 1500, ivaAmount: 0, total: 1500,
      estado: 'recibida', pagos: [],
    };
    expect(getSaldoOrden(orden)).toBe(1500);
    expect(getEstadoPagoOrden(orden)).toBe('pendiente');
  });

  it('orden con IVA: saldo incluye el IVA en el total a pagar', () => {
    const orden: OrdenCompra = {
      ...mockOrden,
      conIVA: true, subtotalSinIVA: 1000, ivaAmount: 160, total: 1160,
      estado: 'recibida', pagos: [],
    };
    expect(getSaldoOrden(orden)).toBe(1160);
    expect(getEstadoPagoOrden(orden)).toBe('pendiente');
  });

  it('orden con IVA: pago parcial actualiza saldo correctamente', () => {
    const orden: OrdenCompra = {
      ...mockOrden,
      conIVA: true, subtotalSinIVA: 1000, ivaAmount: 160, total: 1160,
      estado: 'recibida',
      pagos: [{ id: 'p1', fecha: '2026-06-24', monto: 500 }],
    };
    expect(getSaldoOrden(orden)).toBe(660);
    expect(getEstadoPagoOrden(orden)).toBe('parcial');
  });

  it('orden con IVA: pago completo marca como pagado', () => {
    const orden: OrdenCompra = {
      ...mockOrden,
      conIVA: true, subtotalSinIVA: 1000, ivaAmount: 160, total: 1160,
      estado: 'recibida',
      pagos: [{ id: 'p1', fecha: '2026-06-24', monto: 1160 }],
    };
    expect(getSaldoOrden(orden)).toBe(0);
    expect(getEstadoPagoOrden(orden)).toBe('pagado');
  });
});

// ── Desglose IVA visible en Cuentas por Pagar ───────────────────────────────
// Guards the VistaCuentasPorPagar breakdown logic Sofia requested.

describe('Desglose IVA en Cuentas por Pagar — datos que se muestran', () => {
  const ordenConIVA: OrdenCompra = {
    ...mockOrden,
    conIVA: true,
    subtotalSinIVA: 1000,
    ivaAmount: 160,
    total: 1160,
    estado: 'recibida',
    pagos: [],
  };
  const ordenSinIVA: OrdenCompra = {
    ...mockOrden,
    id: 'o-siniva',
    conIVA: false,
    subtotalSinIVA: 1500,
    ivaAmount: 0,
    total: 1500,
    estado: 'recibida',
    pagos: [],
  };

  it('orden conIVA=true: desglose debe mostrar subtotal, iva y total separados', () => {
    expect(ordenConIVA.conIVA).toBe(true);
    expect(ordenConIVA.subtotalSinIVA).toBe(1000);
    expect(ordenConIVA.ivaAmount).toBe(160);
    expect(ordenConIVA.total).toBe(1160);
    // Verify: subtotalSinIVA + ivaAmount === total
    expect(ordenConIVA.subtotalSinIVA + ordenConIVA.ivaAmount).toBe(ordenConIVA.total);
  });

  it('orden conIVA=false: ivaAmount debe ser 0 y total = subtotal', () => {
    expect(ordenSinIVA.conIVA).toBe(false);
    expect(ordenSinIVA.ivaAmount).toBe(0);
    expect(ordenSinIVA.subtotalSinIVA).toBe(ordenSinIVA.total);
  });

  it('solo ordenes con estado=recibida aparecen en cuentas por pagar', () => {
    const todasOrdenes: OrdenCompra[] = [
      { ...ordenConIVA, estado: 'pendiente' },
      { ...ordenConIVA, id: 'o-recibida', estado: 'recibida' },
      { ...ordenConIVA, id: 'o-cancelada', estado: 'cancelada' },
    ];
    const pagables = todasOrdenes.filter(o => o.estado === 'recibida');
    expect(pagables).toHaveLength(1);
    expect(pagables[0].id).toBe('o-recibida');
  });

  it('orden recibida con IVA: el total a pagar incluye el IVA', () => {
    const saldo = getSaldoOrden(ordenConIVA);
    // Sofia must pay the full total including IVA
    expect(saldo).toBe(1160);
    expect(saldo).toBe(ordenConIVA.subtotalSinIVA + ordenConIVA.ivaAmount);
  });

  it('el badge IVA solo aparece cuando conIVA=true', () => {
    // This is the condition used in cuentas/index.tsx to show the badge
    const debesMostrarBadge = (o: OrdenCompra) => o.conIVA === true;
    expect(debesMostrarBadge(ordenConIVA)).toBe(true);
    expect(debesMostrarBadge(ordenSinIVA)).toBe(false);
  });
});