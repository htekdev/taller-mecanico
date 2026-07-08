import { describe, it, expect } from 'vitest';
import {
  formatearFecha,
  getHoy,
  getMesActual,
  getMontoPagadoServicio,
  getSaldoServicio,
  getEstadoServicio,
} from '@/app/lib/utils';
import type { ManoDeObraItem } from '@/app/types';

// ─────────────────────────────────────────────────────────────────────────────
// formatearFecha — UTC-shift bug fix (CRITICAL)
//
// The bug: new Date("2026-06-01").toLocaleDateString() parses as UTC midnight,
// which shifts the date back by 1 day for users in UTC-5 (Mexico CDT).
// formatearFecha() always parses as LOCAL date (year, month, day) to prevent this.
// ─────────────────────────────────────────────────────────────────────────────

describe('formatearFecha — date display without UTC shift', () => {
  it('returns empty string for undefined', () => {
    expect(formatearFecha(undefined)).toBe('');
  });

  it('returns empty string for null', () => {
    expect(formatearFecha(null)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatearFecha('')).toBe('');
  });

  it('returns original string for invalid date format', () => {
    // Non-YYYY-MM-DD strings pass through as-is
    expect(formatearFecha('not-a-date')).toBe('not-a-date');
  });

  it('returns original string for partial date strings', () => {
    expect(formatearFecha('2026-06')).toBe('2026-06');
  });

  it('formats 2026-06-01 as a valid Spanish locale date string', () => {
    const result = formatearFecha('2026-06-01');
    // Must contain "1" (the day), "6" or "jun" (the month), "2026" (the year)
    expect(result).toBeTruthy();
    expect(result).toContain('2026');
    expect(result.length).toBeGreaterThan(4);
  });

  it('preserves the day — not off by one (no UTC shift)', () => {
    // The critical regression: "2026-06-01" must NOT display as May 31
    const result = formatearFecha('2026-06-01');
    // Spanish locale formats: dd/mm/yyyy → "1/6/2026" or "01/06/2026"
    // It must contain "1" as the day part (June 1st, not May 31st)
    expect(result).not.toMatch(/31/); // Must NOT show "31" (the UTC-shifted date)
  });

  it('formats 2026-12-31 correctly — year boundary date', () => {
    const result = formatearFecha('2026-12-31');
    expect(result).toContain('2026');
    expect(result).not.toMatch(/2027/); // Must NOT roll over to next year
  });

  it('formats 2026-01-01 correctly — start of year', () => {
    const result = formatearFecha('2026-01-01');
    expect(result).toContain('2026');
    expect(result).not.toMatch(/2025/); // Must NOT roll back to previous year
  });

  it('handles single-digit month and day (YYYY-MM-DD still valid)', () => {
    // Standard ISO format always uses zero-padded months/days
    const result = formatearFecha('2026-03-05');
    expect(result).toBeTruthy();
    expect(result).toContain('2026');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getHoy — current date in local timezone (YYYY-MM-DD)
// ─────────────────────────────────────────────────────────────────────────────

describe('getHoy — local YYYY-MM-DD date', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    const result = getHoy();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches the current year', () => {
    const result = getHoy();
    const year = new Date().getFullYear().toString();
    expect(result.startsWith(year)).toBe(true);
  });

  it('month is a valid value (01–12)', () => {
    const result = getHoy();
    const month = parseInt(result.split('-')[1], 10);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
  });

  it('day is a valid value (01–31)', () => {
    const result = getHoy();
    const day = parseInt(result.split('-')[2], 10);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMesActual — current month in local timezone (YYYY-MM)
// ─────────────────────────────────────────────────────────────────────────────

describe('getMesActual — local YYYY-MM month', () => {
  it('returns a YYYY-MM formatted string', () => {
    const result = getMesActual();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });

  it('equals the first 7 chars of getHoy()', () => {
    // getMesActual() must always be consistent with getHoy()
    const hoy = getHoy();
    const mes = getMesActual();
    expect(mes).toBe(hoy.slice(0, 7));
  });

  it('contains the current year', () => {
    const result = getMesActual();
    const year = new Date().getFullYear().toString();
    expect(result.startsWith(year)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMontoPagadoServicio — sum payments to external service provider
// ─────────────────────────────────────────────────────────────────────────────

describe('getMontoPagadoServicio — external service payment total', () => {
  const baseItem: ManoDeObraItem = {
    id: 'mo1',
    concepto: 'Cambio de aceite externo',
    precio: 400,
    tipo: 'externo',
    proveedorId: 'pv1',
    proveedorNombre: 'Taller Aliado',
    costoTaller: 300,
  };

  it('returns 0 when pagosServicio is undefined', () => {
    expect(getMontoPagadoServicio(baseItem)).toBe(0);
  });

  it('returns 0 when pagosServicio is empty array', () => {
    const item = { ...baseItem, pagosServicio: [] };
    expect(getMontoPagadoServicio(item)).toBe(0);
  });

  it('returns payment amount for single payment', () => {
    const item: ManoDeObraItem = {
      ...baseItem,
      pagosServicio: [{ id: 'ps1', fecha: '2026-06-01', monto: 150 }],
    };
    expect(getMontoPagadoServicio(item)).toBe(150);
  });

  it('sums multiple payments correctly', () => {
    const item: ManoDeObraItem = {
      ...baseItem,
      pagosServicio: [
        { id: 'ps1', fecha: '2026-06-01', monto: 100 },
        { id: 'ps2', fecha: '2026-06-05', monto: 75 },
        { id: 'ps3', fecha: '2026-06-10', monto: 125 },
      ],
    };
    expect(getMontoPagadoServicio(item)).toBe(300);
  });

  it('handles decimal payments without rounding errors', () => {
    const item: ManoDeObraItem = {
      ...baseItem,
      pagosServicio: [
        { id: 'ps1', fecha: '2026-06-01', monto: 100.50 },
        { id: 'ps2', fecha: '2026-06-05', monto: 99.75 },
      ],
    };
    expect(getMontoPagadoServicio(item)).toBeCloseTo(200.25, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSaldoServicio — remaining balance owed to external service provider
// ─────────────────────────────────────────────────────────────────────────────

describe('getSaldoServicio — external service remaining balance', () => {
  const baseItem: ManoDeObraItem = {
    id: 'mo2',
    concepto: 'Servicio externo soldadura',
    precio: 500,
    tipo: 'externo',
    costoTaller: 300,
  };

  it('returns full costoTaller when no payments', () => {
    const item = { ...baseItem, pagosServicio: [] };
    expect(getSaldoServicio(item)).toBe(300);
  });

  it('returns remaining balance after partial payment', () => {
    const item: ManoDeObraItem = {
      ...baseItem,
      pagosServicio: [{ id: 'ps1', fecha: '2026-06-01', monto: 100 }],
    };
    expect(getSaldoServicio(item)).toBe(200);
  });

  it('returns 0 when fully paid', () => {
    const item: ManoDeObraItem = {
      ...baseItem,
      pagosServicio: [{ id: 'ps1', fecha: '2026-06-01', monto: 300 }],
    };
    expect(getSaldoServicio(item)).toBe(0);
  });

  it('returns 0 (never negative) when overpaid', () => {
    const item: ManoDeObraItem = {
      ...baseItem,
      pagosServicio: [{ id: 'ps1', fecha: '2026-06-01', monto: 500 }],
    };
    // Overpaid by 200 — but balance should be clamped at 0
    expect(getSaldoServicio(item)).toBe(0);
  });

  it('returns 0 when costoTaller is undefined (internal service)', () => {
    // Internal services have no costoTaller — saldo should be 0
    const item: ManoDeObraItem = {
      id: 'mo3',
      concepto: 'Servicio interno',
      precio: 300,
      tipo: 'interno',
      // costoTaller is undefined
    };
    expect(getSaldoServicio(item)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getEstadoServicio — payment state for external service (pendiente/parcial/pagado)
// ─────────────────────────────────────────────────────────────────────────────

describe('getEstadoServicio — external service payment state', () => {
  const baseItem: ManoDeObraItem = {
    id: 'mo4',
    concepto: 'Servicio externo pintura',
    precio: 600,
    tipo: 'externo',
    costoTaller: 400,
  };

  it('returns pagado when costoTaller is 0 (free service)', () => {
    const item: ManoDeObraItem = {
      ...baseItem,
      costoTaller: 0,
      pagosServicio: [],
    };
    // If cost is 0, there's nothing to pay — treat as pagado
    expect(getEstadoServicio(item)).toBe('pagado');
  });

  it('returns pagado when costoTaller is undefined (internal service)', () => {
    const item: ManoDeObraItem = {
      id: 'mo5',
      concepto: 'Trabajo interno',
      precio: 300,
      tipo: 'interno',
      // costoTaller undefined — not an external service
    };
    expect(getEstadoServicio(item)).toBe('pagado');
  });

  it('returns pendiente when costo > 0 and no payments made', () => {
    const item = { ...baseItem, pagosServicio: [] };
    expect(getEstadoServicio(item)).toBe('pendiente');
  });

  it('returns parcial when partially paid', () => {
    const item: ManoDeObraItem = {
      ...baseItem,
      pagosServicio: [{ id: 'ps1', fecha: '2026-06-01', monto: 200 }],
    };
    // 200 paid of 400 total → parcial
    expect(getEstadoServicio(item)).toBe('parcial');
  });

  it('returns pagado when fully paid', () => {
    const item: ManoDeObraItem = {
      ...baseItem,
      pagosServicio: [
        { id: 'ps1', fecha: '2026-06-01', monto: 200 },
        { id: 'ps2', fecha: '2026-06-05', monto: 200 },
      ],
    };
    expect(getEstadoServicio(item)).toBe('pagado');
  });

  it('returns pagado when overpaid', () => {
    const item: ManoDeObraItem = {
      ...baseItem,
      pagosServicio: [{ id: 'ps1', fecha: '2026-06-01', monto: 999 }],
    };
    // pagado >= costoTaller → pagado (no negatives)
    expect(getEstadoServicio(item)).toBe('pagado');
  });
});
