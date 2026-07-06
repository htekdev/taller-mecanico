import { vi, describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/app/lib/supabase';

// Mock Supabase before importing db functions
vi.mock('@/app/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import {
  deleteRefaccion,
  insertProveedor,
  getProveedores,
} from '@/app/lib/db';

const mockFrom = vi.mocked(supabase.from);

// ── Mock chain builders ──────────────────────────────────────────────────────

/** DELETE chain: from → delete → eq(id) → eq(taller_id) → Promise({ error }) */
function mockDeleteChain(error: unknown = null) {
  const secondEq = vi.fn().mockResolvedValue({ error });
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
  const del = vi.fn().mockReturnValue({ eq: firstEq });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue({ delete: del } as any);
  return { del, firstEq, secondEq };
}

/** INSERT chain: from → insert → select → single → Promise({ data, error }) */
function mockInsertChain(data: unknown, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data, error });
  const selectAfter = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select: selectAfter });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue({ insert } as any);
  return { insert, single };
}

/** SELECT chain: from → select → eq → order → Promise({ data, error }) */
function mockSelectChain(data: unknown, error: unknown = null) {
  const order = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue({ select } as any);
  return { select, eq, order };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── deleteRefaccion ───────────────────────────────────────────────────────────

describe('deleteRefaccion', () => {
  it('does not throw when deletion succeeds', async () => {
    mockDeleteChain(null); // no error
    await expect(deleteRefaccion('taller-1', 'refaccion-1')).resolves.toBeUndefined();
  });

  it('throws when Supabase returns an error', async () => {
    mockDeleteChain({ message: 'Row not found', code: 'PGRST116' });
    await expect(deleteRefaccion('taller-1', 'refaccion-1')).rejects.toThrow('deleteRefaccion: Row not found');
  });

  it('queries the refacciones table', async () => {
    mockDeleteChain(null);
    await deleteRefaccion('taller-1', 'ref-42');
    expect(mockFrom).toHaveBeenCalledWith('refacciones');
  });

  it('includes both id and taller_id in the delete filter (prevents cross-taller deletes)', async () => {
    const { del, firstEq, secondEq } = mockDeleteChain(null);
    await deleteRefaccion('taller-1', 'ref-42');

    // delete() was called
    expect(del).toHaveBeenCalled();

    // First eq filters by 'id'
    expect(firstEq).toHaveBeenCalledWith('id', 'ref-42');

    // Second eq filters by 'taller_id' — prevents deleting another taller's parts
    expect(secondEq).toHaveBeenCalledWith('taller_id', 'taller-1');
  });

  it('uses the tallerId provided, not a hardcoded one', async () => {
    const { secondEq } = mockDeleteChain(null);
    await deleteRefaccion('taller-diferente', 'ref-x');
    expect(secondEq).toHaveBeenCalledWith('taller_id', 'taller-diferente');
  });
});

// ── insertProveedor ──────────────────────────────────────────────────────────

describe('insertProveedor', () => {
  it('returns mapped Proveedor on success', async () => {
    const rawRow = {
      id: 'prov-1',
      nombre: 'AutoPartes Norte',
      telefono: '555-0001',
      contacto: null,
      notas: null,
      taller_id: 't1',
    };
    mockInsertChain(rawRow);

    const result = await insertProveedor('t1', { nombre: 'AutoPartes Norte', telefono: '555-0001' });

    expect(result).toEqual({
      id: 'prov-1',
      nombre: 'AutoPartes Norte',
      telefono: '555-0001',
    });
  });

  it('includes optional contacto and notas fields when provided', async () => {
    const rawRow = {
      id: 'prov-2',
      nombre: 'Refacciones Sur',
      telefono: '555-9999',
      contacto: 'Juan Ruiz',
      notas: 'Solo refacciones Ford',
      taller_id: 't1',
    };
    mockInsertChain(rawRow);

    const result = await insertProveedor('t1', {
      nombre: 'Refacciones Sur',
      telefono: '555-9999',
      contacto: 'Juan Ruiz',
      notas: 'Solo refacciones Ford',
    });

    expect(result?.contacto).toBe('Juan Ruiz');
    expect(result?.notas).toBe('Solo refacciones Ford');
  });

  it('returns null when Supabase returns an error', async () => {
    mockInsertChain(null, { message: 'unique constraint', code: '23505' });
    const result = await insertProveedor('t1', { nombre: 'Dup', telefono: '555' });
    expect(result).toBeNull();
  });

  it('returns null when row is null (insert returned no data)', async () => {
    mockInsertChain(null, null);
    const result = await insertProveedor('t1', { nombre: 'X', telefono: '555' });
    expect(result).toBeNull();
  });

  it('queries the proveedores table', async () => {
    const rawRow = { id: 'p9', nombre: 'P', telefono: 'T', contacto: null, notas: null, taller_id: 't1' };
    mockInsertChain(rawRow);
    await insertProveedor('t1', { nombre: 'P', telefono: 'T' });
    expect(mockFrom).toHaveBeenCalledWith('proveedores');
  });

  it('maps null contacto/notas to undefined in the returned object', async () => {
    const rawRow = { id: 'p10', nombre: 'P', telefono: 'T', contacto: null, notas: null, taller_id: 't1' };
    mockInsertChain(rawRow);
    const result = await insertProveedor('t1', { nombre: 'P', telefono: 'T' });
    expect(result?.contacto).toBeUndefined();
    expect(result?.notas).toBeUndefined();
  });
});

// ── getProveedores ───────────────────────────────────────────────────────────

describe('getProveedores', () => {
  it('maps proveedor rows from snake_case', async () => {
    const rawData = [
      { id: 'p1', nombre: 'Prov 1', telefono: '111', contacto: 'Carlos', notas: 'buen precio', taller_id: 't1' },
    ];
    mockSelectChain(rawData);

    const result = await getProveedores('t1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 'p1', nombre: 'Prov 1', telefono: '111', contacto: 'Carlos', notas: 'buen precio' });
  });

  it('returns empty array when data is null', async () => {
    mockSelectChain(null);
    const result = await getProveedores('t1');
    expect(result).toEqual([]);
  });

  it('queries the proveedores table', async () => {
    mockSelectChain([]);
    await getProveedores('t1');
    expect(mockFrom).toHaveBeenCalledWith('proveedores');
  });

  it('maps null contacto/notas to undefined', async () => {
    const rawData = [{ id: 'p2', nombre: 'P', telefono: 'T', contacto: null, notas: null, taller_id: 't1' }];
    mockSelectChain(rawData);
    const result = await getProveedores('t1');
    expect(result[0].contacto).toBeUndefined();
    expect(result[0].notas).toBeUndefined();
  });
});