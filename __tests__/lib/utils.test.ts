import { describe, it, expect } from 'vitest';
import {
  getMontoPagado, getEstadoPago, getSaldo,
  getMontoPagadoOrden, getEstadoPagoOrden, getSaldoOrden,
  getMontoPagadoFactura, getEstadoPagoFactura, getSaldoFactura,
  generarNumeroFactura, generarNumeroOrden,
  labelVehiculo, fmt,
} from '@/app/lib/utils';
import {
  mockTrabajo, mockTrabajoConIVA, mockTrabajoPagado,
  mockOrden, mockOrdenRecibida, mockFactura,
  mockVehiculo, mockVehiculo2,
} from '../fixtures';
import type { Trabajo, OrdenCompra, Factura } from '@/app/types';

// ── getMontoPagado ──────────────────────────────────────────────────────────

describe('getMontoPagado', () => {
  it('returns 0 for empty pagos', () => {
    expect(getMontoPagado(mockTrabajo)).toBe(0);
  });

  it('returns sum of single pago', () => {
    expect(getMontoPagado(mockTrabajoConIVA)).toBe(500);
  });

  it('returns sum of multiple pagos', () => {
    const t: Trabajo = {
      ...mockTrabajo,
      pagos: [
        { id: 'p1', fecha: '2026-06-01', monto: 100 },
        { id: 'p2', fecha: '2026-06-02', monto: 200 },
        { id: 'p3', fecha: '2026-06-03', monto: 50.5 },
      ],
    };
    expect(getMontoPagado(t)).toBe(350.5);
  });

  it('handles undefined pagos gracefully', () => {
    const t = { ...mockTrabajo, pagos: undefined as unknown as [] };
    expect(getMontoPagado(t)).toBe(0);
  });
});

// ── getEstadoPago ───────────────────────────────────────────────────────────

describe('getEstadoPago', () => {
  it('returns pendiente when no payments', () => {
    expect(getEstadoPago(mockTrabajo)).toBe('pendiente');
  });

  it('returns parcial when partially paid', () => {
    // mockTrabajoConIVA: pagado=500, total=1276
    expect(getEstadoPago(mockTrabajoConIVA)).toBe('parcial');
  });

  it('returns pagado when fully paid', () => {
    // mockTrabajoPagado: pagado=400, total=400
    expect(getEstadoPago(mockTrabajoPagado)).toBe('pagado');
  });

  it('returns pagado when overpaid', () => {
    const t: Trabajo = {
      ...mockTrabajo,
      total: 400,
      pagos: [{ id: 'px', fecha: '2026-06-01', monto: 500 }],
    };
    expect(getEstadoPago(t)).toBe('pagado');
  });
});

// ── getSaldo ────────────────────────────────────────────────────────────────

describe('getSaldo', () => {
  it('returns full total when no payments', () => {
    expect(getSaldo(mockTrabajo)).toBe(400);
  });

  it('returns remaining balance', () => {
    // mockTrabajoConIVA: 1276 - 500 = 776
    expect(getSaldo(mockTrabajoConIVA)).toBe(776);
  });

  it('returns 0 when fully paid', () => {
    expect(getSaldo(mockTrabajoPagado)).toBe(0);
  });

  it('returns 0 (not negative) when overpaid', () => {
    const t: Trabajo = {
      ...mockTrabajo,
      total: 400,
      pagos: [{ id: 'px', fecha: '2026-06-01', monto: 500 }],
    };
    expect(getSaldo(t)).toBe(0);
  });
});

// ── OrdenCompra payment helpers ─────────────────────────────────────────────

describe('getMontoPagadoOrden', () => {
  it('returns 0 for pending order with no payments', () => {
    expect(getMontoPagadoOrden(mockOrden)).toBe(0);
  });

  it('returns payment amount for received order', () => {
    expect(getMontoPagadoOrden(mockOrdenRecibida)).toBe(1500);
  });
});

describe('getEstadoPagoOrden', () => {
  it('returns pendiente when no payments', () => {
    expect(getEstadoPagoOrden(mockOrden)).toBe('pendiente');
  });

  it('returns pagado when fully paid', () => {
    expect(getEstadoPagoOrden(mockOrdenRecibida)).toBe('pagado');
  });

  it('returns parcial when partially paid', () => {
    const o: OrdenCompra = {
      ...mockOrden,
      total: 3000,
      pagos: [{ id: 'pc1', fecha: '2026-06-01', monto: 1000 }],
    };
    expect(getEstadoPagoOrden(o)).toBe('parcial');
  });
});

describe('getSaldoOrden', () => {
  it('returns full total when no payments', () => {
    expect(getSaldoOrden(mockOrden)).toBe(1500);
  });

  it('returns 0 when fully paid', () => {
    expect(getSaldoOrden(mockOrdenRecibida)).toBe(0);
  });
});

// ── Factura payment helpers ─────────────────────────────────────────────────

describe('getMontoPagadoFactura', () => {
  it('returns 0 for unpaid invoice', () => {
    expect(getMontoPagadoFactura(mockFactura)).toBe(0);
  });

  it('sums multiple payments', () => {
    const f: Factura = {
      ...mockFactura,
      pagos: [
        { id: 'pf1', fecha: '2026-06-15', monto: 600, metodoPago: 'efectivo' },
        { id: 'pf2', fecha: '2026-06-20', monto: 400, metodoPago: 'transferencia' },
      ],
    };
    expect(getMontoPagadoFactura(f)).toBe(1000);
  });
});

describe('getEstadoPagoFactura', () => {
  it('returns pendiente for unpaid invoice', () => {
    expect(getEstadoPagoFactura(mockFactura)).toBe('pendiente');
  });

  it('returns pagado for fully paid invoice', () => {
    const f: Factura = {
      ...mockFactura,
      total: 1276,
      pagos: [{ id: 'pf1', fecha: '2026-06-15', monto: 1276, metodoPago: 'efectivo' }],
    };
    expect(getEstadoPagoFactura(f)).toBe('pagado');
  });

  it('returns parcial for partially paid invoice', () => {
    const f: Factura = {
      ...mockFactura,
      total: 1276,
      pagos: [{ id: 'pf1', fecha: '2026-06-15', monto: 500, metodoPago: 'efectivo' }],
    };
    expect(getEstadoPagoFactura(f)).toBe('parcial');
  });
});

describe('getSaldoFactura', () => {
  it('returns full total for unpaid invoice', () => {
    expect(getSaldoFactura(mockFactura)).toBe(1276);
  });

  it('returns 0 when fully paid', () => {
    const f: Factura = {
      ...mockFactura,
      total: 1276,
      pagos: [{ id: 'pf1', fecha: '2026-06-15', monto: 1276, metodoPago: 'efectivo' }],
    };
    expect(getSaldoFactura(f)).toBe(0);
  });
});

// ── generarNumeroFactura ────────────────────────────────────────────────────

describe('generarNumeroFactura', () => {
  const year = new Date().getFullYear();

  it('generates FAC-YEAR-001 for empty list', () => {
    expect(generarNumeroFactura([])).toBe(`FAC-${year}-001`);
  });

  it('increments when existing invoices in same year', () => {
    const existing = [
      { ...mockFactura, numeroFactura: `FAC-${year}-001` },
      { ...mockFactura, id: 'f2', numeroFactura: `FAC-${year}-002` },
    ];
    expect(generarNumeroFactura(existing)).toBe(`FAC-${year}-003`);
  });

  it('ignores invoices from other years', () => {
    const existing = [
      { ...mockFactura, numeroFactura: 'FAC-2025-001' },
      { ...mockFactura, id: 'f2', numeroFactura: 'FAC-2025-002' },
    ];
    expect(generarNumeroFactura(existing)).toBe(`FAC-${year}-001`);
  });

  it('pads number to 3 digits', () => {
    expect(generarNumeroFactura([])).toMatch(/FAC-\d{4}-\d{3}$/);
  });
});

// ── generarNumeroOrden ──────────────────────────────────────────────────────

describe('generarNumeroOrden', () => {
  const year = new Date().getFullYear();

  it('generates OC-YEAR-001 for empty list', () => {
    expect(generarNumeroOrden([])).toBe(`OC-${year}-001`);
  });

  it('increments for existing orders in same year', () => {
    const existing = [
      { ...mockOrden, numeroOrden: `OC-${year}-001` },
    ];
    expect(generarNumeroOrden(existing)).toBe(`OC-${year}-002`);
  });

  it('ignores orders from previous years', () => {
    const existing = [
      { ...mockOrden, numeroOrden: 'OC-2025-010' },
    ];
    expect(generarNumeroOrden(existing)).toBe(`OC-${year}-001`);
  });
});

// ── labelVehiculo ───────────────────────────────────────────────────────────

describe('labelVehiculo', () => {
  it('includes placa when present', () => {
    // mockVehiculo: Ford F-150 2020 ABC-123
    expect(labelVehiculo(mockVehiculo)).toBe('2020 Ford F-150 — ABC-123');
  });

  it('omits placa separator when placa is empty', () => {
    // mockVehiculo2: Volkswagen Jetta 2019 (no placa)
    expect(labelVehiculo(mockVehiculo2)).toBe('2019 Volkswagen Jetta');
  });

  it('handles vehicle with only marca', () => {
    const v = { id: 'vx', clienteId: 'c1', marca: 'Ford', modelo: '', anio: '', placa: '' };
    expect(labelVehiculo(v)).toBe('Ford');
  });
});

// ── fmt ─────────────────────────────────────────────────────────────────────

describe('fmt', () => {
  it('formats whole number with two decimals', () => {
    const result = fmt(1000);
    expect(result).toMatch(/1[,.]?000[.,]00/);
  });

  it('formats zero as 0.00', () => {
    const result = fmt(0);
    expect(result).toMatch(/0[.,]00/);
  });

  it('formats decimal number', () => {
    const result = fmt(1234.5);
    expect(result).toContain('1234' + result.slice(result.indexOf('1234') + 4, result.indexOf('1234') + 5));
  });

  it('returns string type', () => {
    expect(typeof fmt(100)).toBe('string');
  });
});