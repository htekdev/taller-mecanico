import { vi, describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/app/lib/supabase';

// Mock Supabase before importing db functions
vi.mock('@/app/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import {
  updateOrden,
  updateFacturaFecha,
  updateFacturaNumero,
  updateFacturaConceptos,
} from '@/app/lib/db';

const mockFrom = vi.mocked(supabase.from);

// ── Mock chain builders ─────────────────────────────────────────────────────

/** UPDATE chain: from → update → eq → Promise({ error }) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockUpdateChain(error: unknown = null): { update: any; eq: any } {
  const eq = vi.fn().mockResolvedValue({ error });
  const update = vi.fn().mockReturnValue({ eq });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue({ update } as any);
  return { update, eq };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── updateOrden ─────────────────────────────────────────────────────────────

describe('updateOrden', () => {
  const sampleData = {
    descripcion: 'Filtros de aceite',
    numeroOrden: 'PO-007' as string | undefined,
    partes: [] as import('@/app/types').CompraItem[],
    subtotalSinIVA: 500,
    ivaAmount: 80,
    total: 580,
    conIVA: true,
  };

  it('resolves without throwing on success', async () => {
    mockUpdateChain(null);
    await expect(updateOrden('o1', sampleData)).resolves.toBeUndefined();
  });

  it('throws when Supabase returns an error', async () => {
    mockUpdateChain({ message: 'Connection timeout', code: '57P01' });
    await expect(updateOrden('o1', { ...sampleData, descripcion: 'X', numeroOrden: undefined }))
      .rejects.toThrow('updateOrden: Connection timeout');
  });

  it('targets the ordenes_compra table', async () => {
    mockUpdateChain(null);
    await updateOrden('o1', sampleData);
    expect(mockFrom).toHaveBeenCalledWith('ordenes_compra');
  });

  it('maps camelCase fields to snake_case for the DB', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValue({ update } as any);

    await updateOrden('o1', sampleData);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      descripcion: 'Filtros de aceite',
      numero_orden: 'PO-007',
      subtotal_sin_iva: 500,
      iva_amount: 80,
      total: 580,
      con_iva: true,
    }));
  });
});

// ── updateFacturaFecha ──────────────────────────────────────────────────────

describe('updateFacturaFecha', () => {
  it('resolves without throwing on success', async () => {
    mockUpdateChain(null);
    await expect(updateFacturaFecha('fac1', '2026-07-07')).resolves.toBeUndefined();
  });

  it('throws when Supabase returns an error', async () => {
    mockUpdateChain({ message: 'Row not found', code: 'PGRST116' });
    await expect(updateFacturaFecha('fac1', '2026-07-07'))
      .rejects.toThrow('updateFacturaFecha: Row not found');
  });

  it('targets the facturas table', async () => {
    mockUpdateChain(null);
    await updateFacturaFecha('fac1', '2026-07-01');
    expect(mockFrom).toHaveBeenCalledWith('facturas');
  });

  it('sends the fecha field to the DB', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValue({ update } as any);

    await updateFacturaFecha('fac1', '2026-07-15');
    expect(update).toHaveBeenCalledWith({ fecha: '2026-07-15' });
  });
});

// ── updateFacturaNumero ─────────────────────────────────────────────────────

describe('updateFacturaNumero', () => {
  it('resolves without throwing on success', async () => {
    mockUpdateChain(null);
    await expect(updateFacturaNumero('fac1', 'FAC-2026-042')).resolves.toBeUndefined();
  });

  it('throws when Supabase returns an error', async () => {
    mockUpdateChain({ message: 'Unique constraint violation', code: '23505' });
    await expect(updateFacturaNumero('fac1', 'FAC-DUPE'))
      .rejects.toThrow('updateFacturaNumero: Unique constraint violation');
  });

  it('targets the facturas table', async () => {
    mockUpdateChain(null);
    await updateFacturaNumero('fac1', 'FAC-001');
    expect(mockFrom).toHaveBeenCalledWith('facturas');
  });

  it('maps numeroFactura to snake_case numero_factura', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValue({ update } as any);

    await updateFacturaNumero('fac1', 'FAC-2026-001');
    expect(update).toHaveBeenCalledWith({ numero_factura: 'FAC-2026-001' });
  });
});

// ── updateFacturaConceptos ──────────────────────────────────────────────────

describe('updateFacturaConceptos', () => {
  const sampleConceptos: import('@/app/types').FacturaConcepto[] = [
    { tipo: 'mano_de_obra', descripcion: 'Cambio de aceite', cantidad: 1, precioUnitario: 300, subtotal: 300 },
  ];

  it('resolves without throwing on success', async () => {
    mockUpdateChain(null);
    await expect(updateFacturaConceptos('fac1', {
      conceptos: sampleConceptos, subtotal: 300, iva: undefined, total: 300,
    })).resolves.toBeUndefined();
  });

  it('throws when Supabase returns an error', async () => {
    mockUpdateChain({ message: 'RLS policy violation', code: '42501' });
    await expect(updateFacturaConceptos('fac1', { conceptos: [], subtotal: 0, iva: undefined, total: 0 }))
      .rejects.toThrow('updateFacturaConceptos: RLS policy violation');
  });

  it('targets the facturas table', async () => {
    mockUpdateChain(null);
    await updateFacturaConceptos('fac1', { conceptos: [], subtotal: 0, iva: undefined, total: 0 });
    expect(mockFrom).toHaveBeenCalledWith('facturas');
  });

  it('sends null for undefined iva to the DB', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValue({ update } as any);

    await updateFacturaConceptos('fac1', {
      conceptos: sampleConceptos, subtotal: 300, iva: undefined, total: 300,
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ iva: null }));
  });

  it('sends numeric iva value when defined', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValue({ update } as any);

    await updateFacturaConceptos('fac1', {
      conceptos: [], subtotal: 1000, iva: 160, total: 1160,
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ iva: 160, total: 1160 }));
  });
});