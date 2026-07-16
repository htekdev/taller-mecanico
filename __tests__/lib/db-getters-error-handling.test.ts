/**
 * Tests that getter functions in db.ts throw (or log) when Supabase returns an error.
 * Companion tests for PR #148: fix(prod-readiness) getter silent failures.
 *
 * Before PR #148, all getters silently returned [] on DB errors.
 * After PR #148:
 *   - 10 getters throw new Error('[getFnName] <message>') so cargarDatos catches & shows errorBanner
 *   - getRefacciones throws on error (updated PR #171)
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/app/lib/supabase';

vi.mock('@/app/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import {
  getClientes, getVehiculos, getRefacciones, getProveedores,
  getTrabajos, getOrdenes, getFacturas,
  getMembers, getInvites, getGastos, getCotizaciones,
} from '@/app/lib/db';

const mockFrom = vi.mocked(supabase.from);

const DB_ERROR = { message: 'Connection timeout', code: '57P01' };

/** Standard select chain: from -> select -> eq -> order */
function mockSelectError(error: unknown): void {
  const order = vi.fn().mockResolvedValue({ data: null, error });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue({ select } as any);
}

/** Select chain with .is() filter: from -> select -> eq -> is -> order (used by getInvites) */
function mockSelectIsError(error: unknown): void {
  const order = vi.fn().mockResolvedValue({ data: null, error });
  const is = vi.fn().mockReturnValue({ order });
  const eq = vi.fn().mockReturnValue({ is });
  const select = vi.fn().mockReturnValue({ eq });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue({ select } as any);
}

beforeEach(() => { vi.clearAllMocks(); });

// ── getClientes ─────────────────────────────────────────────────────────────

describe('getClientes — error handling (PR #148)', () => {
  it('throws with [getClientes] prefix on Supabase error', async () => {
    mockSelectError(DB_ERROR);
    await expect(getClientes('t1')).rejects.toThrow('[getClientes] Connection timeout');
  });

  it('returns empty array when data is null and no error', async () => {
    mockSelectError(null);
    await expect(getClientes('t1')).resolves.toEqual([]);
  });

  it('queries the clientes table', async () => {
    mockSelectError(null);
    await getClientes('t1');
    expect(mockFrom).toHaveBeenCalledWith('clientes');
  });
});

// ── getVehiculos ────────────────────────────────────────────────────────────

describe('getVehiculos — error handling (PR #148)', () => {
  it('throws with [getVehiculos] prefix on Supabase error', async () => {
    mockSelectError(DB_ERROR);
    await expect(getVehiculos('t1')).rejects.toThrow('[getVehiculos] Connection timeout');
  });

  it('returns empty array when data is null and no error', async () => {
    mockSelectError(null);
    await expect(getVehiculos('t1')).resolves.toEqual([]);
  });
});

// ── getRefacciones ──────────────────────────────────────────────────────────

describe('getRefacciones - throws on error (PR #171)', () => {
  it('throws with [getRefacciones] prefix on Supabase error', async () => {
    mockSelectError(DB_ERROR);
    await expect(getRefacciones('t1')).rejects.toThrow('[getRefacciones] Connection timeout');
  });

  it('returns empty array when data is null and no error', async () => {
    mockSelectError(null);
    await expect(getRefacciones('t1')).resolves.toEqual([]);
  });

  it('queries the refacciones table', async () => {
    mockSelectError(null);
    await getRefacciones('t1');
    expect(mockFrom).toHaveBeenCalledWith('refacciones');
  });
});
// ── getProveedores ──────────────────────────────────────────────────────────

describe('getProveedores — error handling (PR #148)', () => {
  it('throws with [getProveedores] prefix on Supabase error', async () => {
    mockSelectError(DB_ERROR);
    await expect(getProveedores('t1')).rejects.toThrow('[getProveedores] Connection timeout');
  });

  it('returns empty array when data is null and no error', async () => {
    mockSelectError(null);
    await expect(getProveedores('t1')).resolves.toEqual([]);
  });

  it('queries the proveedores table', async () => {
    mockSelectError(null);
    await getProveedores('t1');
    expect(mockFrom).toHaveBeenCalledWith('proveedores');
  });
});

// ── getTrabajos ─────────────────────────────────────────────────────────────

describe('getTrabajos — error handling (PR #148)', () => {
  it('throws with [getTrabajos] prefix on Supabase error', async () => {
    mockSelectError(DB_ERROR);
    await expect(getTrabajos('t1')).rejects.toThrow('[getTrabajos] Connection timeout');
  });

  it('returns empty array when data is null and no error', async () => {
    mockSelectError(null);
    await expect(getTrabajos('t1')).resolves.toEqual([]);
  });

  it('queries the trabajos table', async () => {
    mockSelectError(null);
    await getTrabajos('t1');
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
  });
});

// ── getOrdenes ──────────────────────────────────────────────────────────────

describe('getOrdenes — error handling (PR #148)', () => {
  it('throws with [getOrdenes] prefix on Supabase error', async () => {
    mockSelectError(DB_ERROR);
    await expect(getOrdenes('t1')).rejects.toThrow('[getOrdenes] Connection timeout');
  });

  it('returns empty array when data is null and no error', async () => {
    mockSelectError(null);
    await expect(getOrdenes('t1')).resolves.toEqual([]);
  });

  it('queries the ordenes_compra table', async () => {
    mockSelectError(null);
    await getOrdenes('t1');
    expect(mockFrom).toHaveBeenCalledWith('ordenes_compra');
  });
});

// ── getFacturas ─────────────────────────────────────────────────────────────

describe('getFacturas — error handling (PR #148)', () => {
  it('throws with [getFacturas] prefix on Supabase error', async () => {
    mockSelectError(DB_ERROR);
    await expect(getFacturas('t1')).rejects.toThrow('[getFacturas] Connection timeout');
  });

  it('returns empty array when data is null and no error', async () => {
    mockSelectError(null);
    await expect(getFacturas('t1')).resolves.toEqual([]);
  });

  it('queries the facturas table', async () => {
    mockSelectError(null);
    await getFacturas('t1');
    expect(mockFrom).toHaveBeenCalledWith('facturas');
  });
});

// ── getMembers ──────────────────────────────────────────────────────────────

describe('getMembers — error handling (PR #148)', () => {
  it('throws with [getMembers] prefix on Supabase error', async () => {
    mockSelectError(DB_ERROR);
    await expect(getMembers('t1')).rejects.toThrow('[getMembers] Connection timeout');
  });

  it('returns empty array when data is null and no error', async () => {
    mockSelectError(null);
    await expect(getMembers('t1')).resolves.toEqual([]);
  });

  it('queries the taller_members table', async () => {
    mockSelectError(null);
    await getMembers('t1');
    expect(mockFrom).toHaveBeenCalledWith('taller_members');
  });
});

// ── getInvites ──────────────────────────────────────────────────────────────

describe('getInvites — error handling (PR #148)', () => {
  it('throws with [getInvites] prefix on Supabase error', async () => {
    mockSelectIsError(DB_ERROR);
    await expect(getInvites('t1')).rejects.toThrow('[getInvites] Connection timeout');
  });

  it('returns empty array when data is null and no error', async () => {
    mockSelectIsError(null);
    await expect(getInvites('t1')).resolves.toEqual([]);
  });

  it('queries the taller_invites table', async () => {
    mockSelectIsError(null);
    await getInvites('t1');
    expect(mockFrom).toHaveBeenCalledWith('taller_invites');
  });
});

// ── getGastos ───────────────────────────────────────────────────────────────

describe('getGastos — error handling (PR #148)', () => {
  it('throws with [getGastos] prefix on Supabase error', async () => {
    mockSelectError(DB_ERROR);
    await expect(getGastos('t1')).rejects.toThrow('[getGastos] Connection timeout');
  });

  it('returns empty array when data is null and no error', async () => {
    mockSelectError(null);
    await expect(getGastos('t1')).resolves.toEqual([]);
  });

  it('queries the gastos table', async () => {
    mockSelectError(null);
    await getGastos('t1');
    expect(mockFrom).toHaveBeenCalledWith('gastos');
  });
});

// ── getCotizaciones ─────────────────────────────────────────────────────────

describe('getCotizaciones — error handling (PR #148)', () => {
  it('throws with [getCotizaciones] prefix on Supabase error', async () => {
    mockSelectError(DB_ERROR);
    await expect(getCotizaciones('t1')).rejects.toThrow('[getCotizaciones] Connection timeout');
  });

  it('returns empty array when data is null and no error', async () => {
    mockSelectError(null);
    await expect(getCotizaciones('t1')).resolves.toEqual([]);
  });

  it('queries the cotizaciones table', async () => {
    mockSelectError(null);
    await getCotizaciones('t1');
    expect(mockFrom).toHaveBeenCalledWith('cotizaciones');
  });
});
