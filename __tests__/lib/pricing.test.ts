import { describe, it, expect } from 'vitest';
import { getPricingIntel } from '@/app/lib/pricing';
import type { Trabajo } from '@/app/types';
import { mockTrabajo, mockTrabajoConIVA } from '../fixtures';

// ── Markup calculations ─────────────────────────────────────────────────────

describe('getPricingIntel — markup calculations', () => {
  const noTrabajos: Trabajo[] = [];

  it('calculates 30% margin-on-sale markup correctly', () => {
    const { markups } = getPricingIntel('r1', 'c1', 100, noTrabajos);
    const m30 = markups.find(m => m.pct === 30)!;
    // 100 / (1 - 0.30) = 100 / 0.70 = 142.857... → 142.86
    expect(m30.price).toBe(142.86);
  });

  it('calculates 40% margin-on-sale markup correctly', () => {
    const { markups } = getPricingIntel('r1', 'c1', 100, noTrabajos);
    const m40 = markups.find(m => m.pct === 40)!;
    // 100 / (1 - 0.40) = 100 / 0.60 = 166.666... → 166.67
    expect(m40.price).toBe(166.67);
  });

  it('calculates 50% margin-on-sale markup correctly', () => {
    const { markups } = getPricingIntel('r1', 'c1', 100, noTrabajos);
    const m50 = markups.find(m => m.pct === 50)!;
    // 100 / (1 - 0.50) = 100 / 0.50 = 200
    expect(m50.price).toBe(200);
  });

  it('returns markups for pcts 30, 40, 50', () => {
    const { markups } = getPricingIntel('r1', 'c1', 100, noTrabajos);
    expect(markups.map(m => m.pct)).toEqual([30, 40, 50]);
  });

  it('reflects cost in markup object', () => {
    const { cost } = getPricingIntel('r1', 'c1', 150, noTrabajos);
    expect(cost).toBe(150);
  });

  it('markup price is always higher than cost', () => {
    const { markups } = getPricingIntel('r1', 'c1', 200, noTrabajos);
    markups.forEach(m => {
      expect(m.price).toBeGreaterThan(200);
    });
  });
});

// ── Client sales history ────────────────────────────────────────────────────

describe('getPricingIntel — client sales history', () => {
  it('returns null clientLastSale when no history', () => {
    const { clientLastSale } = getPricingIntel('r1', 'c1', 150, []);
    expect(clientLastSale).toBeNull();
  });

  it('returns empty clientAllSales when no history', () => {
    const { clientAllSales } = getPricingIntel('r1', 'c1', 150, []);
    expect(clientAllSales).toEqual([]);
  });

  it('finds sales of this part to this client', () => {
    // mockTrabajo: clienteId=c1, has r1 at precioVenta=200
    const { clientLastSale, clientAllSales } = getPricingIntel('r1', 'c1', 150, [mockTrabajo]);
    expect(clientLastSale).not.toBeNull();
    expect(clientLastSale?.precio).toBe(200);
    expect(clientAllSales).toHaveLength(1);
  });

  it('does not find sales of a different part', () => {
    // mockTrabajo has r1, asking for r2
    const { clientLastSale } = getPricingIntel('r2', 'c1', 150, [mockTrabajo]);
    expect(clientLastSale).toBeNull();
  });

  it('does not count sales to other clients as client history', () => {
    // mockTrabajoConIVA: clienteId=c2, has r2
    const { clientLastSale } = getPricingIntel('r2', 'c1', 150, [mockTrabajoConIVA]);
    // c1 never bought r2
    expect(clientLastSale).toBeNull();
  });

  it('sorts client sales by price descending (highest first)', () => {
    const t1: Trabajo = {
      ...mockTrabajo,
      id: 'tx1',
      fecha: '2026-01-01',
      partes: [{ ...mockTrabajo.partes[0], precioVenta: 180 }],
    };
    const t2: Trabajo = {
      ...mockTrabajo,
      id: 'tx2',
      fecha: '2026-03-01',
      partes: [{ ...mockTrabajo.partes[0], precioVenta: 250 }],
    };
    const t3: Trabajo = {
      ...mockTrabajo,
      id: 'tx3',
      fecha: '2026-05-01',
      partes: [{ ...mockTrabajo.partes[0], precioVenta: 220 }],
    };
    const { clientAllSales, clientLastSale } = getPricingIntel('r1', 'c1', 150, [t1, t2, t3]);
    expect(clientAllSales.map(s => s.precio)).toEqual([250, 220, 180]);
    // clientLastSale is the first = highest
    expect(clientLastSale?.precio).toBe(250);
  });

  it('excludes parts with precioVenta = 0', () => {
    const t: Trabajo = {
      ...mockTrabajo,
      partes: [{ ...mockTrabajo.partes[0], precioVenta: 0 }],
    };
    const { clientLastSale } = getPricingIntel('r1', 'c1', 150, [t]);
    expect(clientLastSale).toBeNull();
  });
});

// ── Other clients pricing ───────────────────────────────────────────────────

describe('getPricingIntel — other client pricing', () => {
  it('returns null otherMin/otherMax when no other clients', () => {
    const { otherMin, otherMax } = getPricingIntel('r1', 'c1', 150, [mockTrabajo]);
    expect(otherMin).toBeNull();
    expect(otherMax).toBeNull();
  });

  it('finds prices charged to other clients', () => {
    // mockTrabajoConIVA: clienteId=c2, has r2 at 300
    // Ask for r2 pricing for c1 — c2 is "other"
    const { otherMin, otherMax } = getPricingIntel('r2', 'c1', 150, [mockTrabajoConIVA]);
    expect(otherMin).toBe(300);
    expect(otherMax).toBe(300);
  });

  it('calculates correct min and max across multiple other clients', () => {
    const t1: Trabajo = {
      ...mockTrabajo,
      id: 'ta1',
      clienteId: 'c2',
      partes: [{ ...mockTrabajo.partes[0], refaccionId: 'r1', precioVenta: 180 }],
    };
    const t2: Trabajo = {
      ...mockTrabajo,
      id: 'ta2',
      clienteId: 'c3',
      partes: [{ ...mockTrabajo.partes[0], refaccionId: 'r1', precioVenta: 250 }],
    };
    const { otherMin, otherMax } = getPricingIntel('r1', 'c1', 150, [t1, t2]);
    expect(otherMin).toBe(180);
    expect(otherMax).toBe(250);
  });

  it('does not include current client in other prices', () => {
    const t1: Trabajo = {
      ...mockTrabajo,
      id: 'ta1',
      clienteId: 'c1',
      partes: [{ ...mockTrabajo.partes[0], refaccionId: 'r1', precioVenta: 180 }],
    };
    const t2: Trabajo = {
      ...mockTrabajo,
      id: 'ta2',
      clienteId: 'c2',
      partes: [{ ...mockTrabajo.partes[0], refaccionId: 'r1', precioVenta: 250 }],
    };
    const { otherMin, otherMax } = getPricingIntel('r1', 'c1', 150, [t1, t2]);
    // Only c2 is "other" — c1 is current client
    expect(otherMin).toBe(250);
    expect(otherMax).toBe(250);
  });
});