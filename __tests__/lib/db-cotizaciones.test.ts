import { vi, describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/app/lib/supabase';

vi.mock('@/app/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import {
  getCotizaciones,
  insertCotizacion,
  updateCotizacion,
  nextCotizacionNumber,
} from '@/app/lib/db';

const mockFrom = vi.mocked(supabase.from);

const rawCotizacion = {
  id: 'cot-1',
  taller_id: 'taller-1',
  numero_cotizacion: 'COT-001',
  plantilla: 'general',
  cliente: 'Juan Garcia',
  fecha: '2026-07-01',
  total: 1500.0,
  cancelada: false,
  editada: false,
  convertida: false,
  form: { items: [] },
  saved_at: '2026-07-01T10:00:00Z',
  created_at: '2026-07-01T10:00:00Z',
};

beforeEach(() => { vi.clearAllMocks(); });

// getCotizaciones

describe('getCotizaciones', () => {
  function mockSelectChain(data: unknown, error: unknown = null) {
    const order = vi.fn().mockResolvedValue({ data, error });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValue({ select } as any);
    return { select, eq, order };
  }

  it('maps raw DB rows to CotizacionRow objects', async () => {
    mockSelectChain([rawCotizacion]);
    const result = await getCotizaciones('taller-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cot-1');
    expect(result[0].numeroCotizacion).toBe('COT-001');
    expect(result[0].cliente).toBe('Juan Garcia');
    expect(result[0].total).toBe(1500.0);
  });

  it('returns empty array when data is null', async () => {
    mockSelectChain(null);
    const result = await getCotizaciones('taller-1');
    expect(result).toEqual([]);
  });

  it('returns empty array when data is empty', async () => {
    mockSelectChain([]);
    const result = await getCotizaciones('taller-1');
    expect(result).toEqual([]);
  });

  it('queries the cotizaciones table', async () => {
    mockSelectChain([]);
    await getCotizaciones('taller-1');
    expect(mockFrom).toHaveBeenCalledWith('cotizaciones');
  });

  it('maps boolean flags correctly (cancelada/editada/convertida)', async () => {
    const cancelled = { ...rawCotizacion, cancelada: true, convertida: true, editada: true };
    mockSelectChain([cancelled]);
    const result = await getCotizaciones('taller-1');
    expect(result[0].cancelada).toBe(true);
    expect(result[0].convertida).toBe(true);
    expect(result[0].editada).toBe(true);
  });

  it('parses total as float from string value', async () => {
    const row = { ...rawCotizacion, total: '2500.50' };
    mockSelectChain([row]);
    const result = await getCotizaciones('taller-1');
    expect(result[0].total).toBe(2500.5);
  });

  it('returns multiple cotizaciones', async () => {
    const second = { ...rawCotizacion, id: 'cot-2', numero_cotizacion: 'COT-002', total: 750 };
    mockSelectChain([rawCotizacion, second]);
    const result = await getCotizaciones('taller-1');
    expect(result).toHaveLength(2);
    expect(result[1].numeroCotizacion).toBe('COT-002');
  });

  it('uses saved_at column, falls back to created_at when saved_at is null', async () => {
    const row = { ...rawCotizacion, saved_at: null, created_at: '2026-07-01T08:00:00Z' };
    mockSelectChain([row]);
    const result = await getCotizaciones('taller-1');
    expect(result[0].savedAt).toBe('2026-07-01T08:00:00Z');
  });
});

// insertCotizacion

describe('insertCotizacion', () => {
  function mockInsertChain(data: unknown, error: unknown = null) {
    const single = vi.fn().mockResolvedValue({ data, error });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValue({ insert } as any);
    return { insert, select, single };
  }

  const payload = {
    numeroCotizacion: 'COT-001',
    plantilla: 'general' as const,
    cliente: 'Pedro Ramirez',
    fecha: '2026-07-07',
    total: 3200,
    cancelada: false,
    editada: false,
    convertida: false,
    form: {} as Record<string, unknown>,
  };

  it('returns mapped CotizacionRow on success', async () => {
    mockInsertChain(rawCotizacion);
    const result = await insertCotizacion('taller-1', payload);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('cot-1');
    expect(result?.numeroCotizacion).toBe('COT-001');
  });

  it('returns null when Supabase returns an error', async () => {
    mockInsertChain(null, { message: 'insert failed', code: '23505' });
    const result = await insertCotizacion('taller-1', payload);
    expect(result).toBeNull();
  });

  it('returns null when data is null (no row returned)', async () => {
    mockInsertChain(null, null);
    const result = await insertCotizacion('taller-1', payload);
    expect(result).toBeNull();
  });

  it('queries the cotizaciones table', async () => {
    mockInsertChain(rawCotizacion);
    await insertCotizacion('taller-1', payload);
    expect(mockFrom).toHaveBeenCalledWith('cotizaciones');
  });

  it('defaults cancelada/editada/convertida to false when not provided', async () => {
    const { insert } = mockInsertChain(rawCotizacion);
    const minPayload = { ...payload, cancelada: undefined, editada: undefined, convertida: undefined };
    await insertCotizacion('taller-1', minPayload as Parameters<typeof insertCotizacion>[1]);
    const insertedData = insert.mock.calls[0][0];
    expect(insertedData.cancelada).toBe(false);
    expect(insertedData.editada).toBe(false);
    expect(insertedData.convertida).toBe(false);
  });

  it('maps camelCase payload fields to snake_case DB columns', async () => {
    const { insert } = mockInsertChain(rawCotizacion);
    await insertCotizacion('taller-1', payload);
    const insertedData = insert.mock.calls[0][0];
    expect(insertedData).toHaveProperty('numero_cotizacion', 'COT-001');
    expect(insertedData).toHaveProperty('taller_id', 'taller-1');
    expect(insertedData).not.toHaveProperty('numeroCotizacion');
  });
});

// updateCotizacion

describe('updateCotizacion', () => {
  function mockUpdateChain(error: unknown = null) {
    const eq = vi.fn().mockResolvedValue({ error });
    const update = vi.fn().mockReturnValue({ eq });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValue({ update } as any);
    return { update, eq };
  }

  it('returns true on successful update', async () => {
    mockUpdateChain(null);
    const result = await updateCotizacion('cot-1', { cancelada: true });
    expect(result).toBe(true);
  });

  it('returns false when Supabase returns an error', async () => {
    mockUpdateChain({ message: 'row not found', code: 'PGRST116' });
    const result = await updateCotizacion('cot-1', { cancelada: true });
    expect(result).toBe(false);
  });

  it('queries the cotizaciones table', async () => {
    mockUpdateChain(null);
    await updateCotizacion('cot-1', { total: 100 });
    expect(mockFrom).toHaveBeenCalledWith('cotizaciones');
  });

  it('only includes provided fields in the patch (partial update)', async () => {
    const { update } = mockUpdateChain(null);
    await updateCotizacion('cot-1', { cancelada: true });
    const patchArg = update.mock.calls[0][0];
    expect(patchArg).toHaveProperty('cancelada', true);
    expect(patchArg).not.toHaveProperty('total');
    expect(patchArg).not.toHaveProperty('cliente');
  });

  it('maps camelCase patch keys to snake_case DB columns', async () => {
    const { update } = mockUpdateChain(null);
    await updateCotizacion('cot-1', { numeroCotizacion: 'COT-999', savedAt: '2026-07-07T00:00:00Z' });
    const patchArg = update.mock.calls[0][0];
    expect(patchArg).toHaveProperty('numero_cotizacion', 'COT-999');
    expect(patchArg).toHaveProperty('saved_at', '2026-07-07T00:00:00Z');
    expect(patchArg).not.toHaveProperty('numeroCotizacion');
    expect(patchArg).not.toHaveProperty('savedAt');
  });

  it('filters by cotizacion id', async () => {
    const { eq } = mockUpdateChain(null);
    await updateCotizacion('cot-xyz', { convertida: true });
    expect(eq).toHaveBeenCalledWith('id', 'cot-xyz');
  });
});

// nextCotizacionNumber

describe('nextCotizacionNumber', () => {
  function mockCounterChain(existingNumber: number | null) {
    const singleRead = vi.fn().mockResolvedValue({
      data: existingNumber !== null ? { last_number: existingNumber } : null,
      error: null,
    });
    const eqRead = vi.fn().mockReturnValue({ single: singleRead });
    const selectRead = vi.fn().mockReturnValue({ eq: eqRead });

    const upsert = vi.fn().mockResolvedValue({ error: null });

    mockFrom
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValueOnce({ select: selectRead } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValueOnce({ upsert } as any);

    return { selectRead, eqRead, upsert };
  }

  it('returns COT-001 for a new taller with no existing counter', async () => {
    mockCounterChain(null);
    const result = await nextCotizacionNumber('taller-new');
    expect(result).toBe('COT-001');
  });

  it('increments existing counter by 1', async () => {
    mockCounterChain(5);
    const result = await nextCotizacionNumber('taller-1');
    expect(result).toBe('COT-006');
  });

  it('zero-pads numbers to 3 digits', async () => {
    mockCounterChain(9);
    const result = await nextCotizacionNumber('taller-1');
    expect(result).toBe('COT-010');
  });

  it('handles large numbers beyond 3 digits without truncation', async () => {
    mockCounterChain(999);
    const result = await nextCotizacionNumber('taller-1');
    expect(result).toBe('COT-1000');
  });

  it('reads from cotizacion_counter table', async () => {
    mockCounterChain(0);
    await nextCotizacionNumber('taller-1');
    expect(mockFrom).toHaveBeenCalledWith('cotizacion_counter');
  });

  it('upserts the new counter value with onConflict: taller_id', async () => {
    const { upsert } = mockCounterChain(3);
    await nextCotizacionNumber('taller-1');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ taller_id: 'taller-1', last_number: 4 }),
      expect.objectContaining({ onConflict: 'taller_id' }),
    );
  });
});
