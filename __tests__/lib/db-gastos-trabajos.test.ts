import { vi, describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/app/lib/supabase';

// Mock Supabase before importing db functions
vi.mock('@/app/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import {
  updateTrabajo,
  updateTrabajoFinalizar,
  updateTrabajoTft,
  cancelarTrabajo,
  reactivarTrabajo,
  getGastos,
  insertGasto,
  updateGasto,
  deleteGasto,
} from '@/app/lib/db';

import type { Trabajo } from '@/app/types';

const mockFrom = vi.mocked(supabase.from);

// ── Mock chain builders ──────────────────────────────────────────────────────

/** UPDATE chain: from → update → eq → Promise({ error }) */
function mockUpdateChain(error: unknown = null) {
  const eq = vi.fn().mockResolvedValue({ error });
  const update = vi.fn().mockReturnValue({ eq });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue({ update } as any);
  return { update, eq };
}

/** DELETE chain: from → delete → eq → Promise({ error }) */
function mockDeleteChain(error: unknown = null) {
  const eq = vi.fn().mockResolvedValue({ error });
  const del = vi.fn().mockReturnValue({ eq });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue({ delete: del } as any);
  return { delete: del, eq };
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

/** Flexible proxy chain: every call returns the same thenable chain. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeFlexibleChain(data: unknown, error: unknown = null): any {
  const resolved = Promise.resolve({ data, error });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = new Proxy({}, {
    get(_: object, prop: string | symbol) {
      if (prop === 'then') return resolved.then.bind(resolved);
      if (prop === 'catch') return resolved.catch.bind(resolved);
      if (prop === 'finally') return resolved.finally.bind(resolved);
      return vi.fn().mockReturnValue(chain);
    },
  });
  return chain;
}

function mockFlexibleChain(data: unknown, error: unknown = null) {
  const chain = makeFlexibleChain(data, error);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue(chain as any);
  return chain;
}

/** Minimal valid Trabajo for updateTrabajo tests. */
function makeTrabajo(overrides: Partial<Trabajo> = {}): Trabajo {
  return {
    id: 't1',
    clienteId: 'c1',
    vehiculoId: 'v1',
    fecha: '2026-06-01',
    descripcion: 'Cambio de aceite',
    manoDeObra: 200,
    manoDeObraItems: [],
    refacciones: 150,
    costoRefacciones: 120,
    requiereFactura: false,
    iva: 0,
    total: 350,
    partes: [],
    pagos: [],
    estadoFacturacion: 'sin_facturar',
    estado: 'pendiente',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── updateTrabajo ───────────────────────────────────────────────────────────

describe('updateTrabajo', () => {
  it('calls trabajos table', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajo('t1', makeTrabajo());
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('calls .eq with the trabajo id', async () => {
    const { eq } = mockUpdateChain();
    await updateTrabajo('trabajo-xyz', makeTrabajo());
    expect(eq).toHaveBeenCalledWith('id', 'trabajo-xyz');
  });

  it('always includes kilometraje: null when field is undefined', async () => {
    const { update } = mockUpdateChain();
    const data = makeTrabajo(); // no kilometraje
    expect(data.kilometraje).toBeUndefined();
    await updateTrabajo('t1', data);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ kilometraje: null })
    );
  });

  it('sends kilometraje value when defined', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajo('t1', makeTrabajo({ kilometraje: 85000 }));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ kilometraje: 85000 })
    );
  });

  it('sends kilometraje: 0 correctly (not treated as falsy)', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajo('t1', makeTrabajo({ kilometraje: 0 }));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ kilometraje: 0 })
    );
  });

  it('omits tipo_cliente when tipoCliente is not ayuntamiento', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajo('t1', makeTrabajo({ tipoCliente: 'general' }));
    const payload = update.mock.calls[0][0];
    expect(payload).not.toHaveProperty('tipo_cliente');
  });

  it('includes tipo_cliente when tipoCliente is ayuntamiento', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajo('t1', makeTrabajo({ tipoCliente: 'ayuntamiento' }));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_cliente: 'ayuntamiento' })
    );
  });

  it('includes departamento when defined', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajo('t1', makeTrabajo({ departamento: 'Obras Públicas' }));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ departamento: 'Obras Públicas' })
    );
  });

  it('omits departamento when undefined', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajo('t1', makeTrabajo());
    const payload = update.mock.calls[0][0];
    expect(payload).not.toHaveProperty('departamento');
  });

  it('always includes core fields: mano_de_obra, fecha, descripcion, total', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajo('t1', makeTrabajo({ manoDeObra: 500, total: 650, descripcion: 'Frenos' }));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        mano_de_obra: 500,
        total: 650,
        descripcion: 'Frenos',
        fecha: '2026-06-01',
      })
    );
  });

  it('sends folio_fiscal: null when folioFiscal is undefined', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajo('t1', makeTrabajo());
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ folio_fiscal: null })
    );
  });

  it('sends estado and estadoFacturacion', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajo('t1', makeTrabajo({ estado: 'completado', estadoFacturacion: 'facturado' }));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'completado', estado_facturacion: 'facturado' })
    );
  });

  it('resolves without error', async () => {
    mockUpdateChain();
    await expect(updateTrabajo('t1', makeTrabajo())).resolves.toBeUndefined();
  });

  it('omits tft_estado when tftEstado is undefined (prevents 42703 column error)', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajo('t1', makeTrabajo()); // no tftEstado
    const payload = update.mock.calls[0][0];
    expect(payload).not.toHaveProperty('tft_estado');
  });

  it('includes tft_estado when tftEstado is defined', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajo('t1', makeTrabajo({ tftEstado: 'con_tft' }));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ tft_estado: 'con_tft' })
    );
  });
});

// ── updateTrabajoFinalizar ──────────────────────────────────────────────────

describe('updateTrabajoFinalizar', () => {
  it('calls trabajos table', async () => {
    mockUpdateChain();
    await updateTrabajoFinalizar('t1', 'nota', 0, 350);
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
  });

  it('calls .eq with the trabajo id', async () => {
    const { eq } = mockUpdateChain();
    await updateTrabajoFinalizar('trabajo-abc', 'nota', 0, 500);
    expect(eq).toHaveBeenCalledWith('id', 'trabajo-abc');
  });

  it('sets estado: completado', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajoFinalizar('t1', 'factura', 160, 1160);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'completado' })
    );
  });

  it('for tipo=factura: sets tipo_documento=factura and requiere_factura=true', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajoFinalizar('t1', 'factura', 160, 1160);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_documento: 'factura',
        requiere_factura: true,
      })
    );
  });

  it('for tipo=nota: sets tipo_documento=nota and requiere_factura=false', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajoFinalizar('t1', 'nota', 0, 350);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_documento: 'nota',
        requiere_factura: false,
      })
    );
  });

  it('sends iva and total values', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajoFinalizar('t1', 'factura', 160, 1160);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ iva: 160, total: 1160 })
    );
  });

  it('sets fecha_finalizacion to an ISO date string', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajoFinalizar('t1', 'nota', 0, 350);
    const payload = update.mock.calls[0][0];
    expect(typeof payload.fecha_finalizacion).toBe('string');
    expect(payload.fecha_finalizacion).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
  });

  it('resolves without error', async () => {
    mockUpdateChain();
    await expect(updateTrabajoFinalizar('t1', 'nota', 0, 350)).resolves.toBeUndefined();
  });
});

// ── updateTrabajoTft ────────────────────────────────────────────────────────

describe('updateTrabajoTft', () => {
  it('calls trabajos table', async () => {
    mockUpdateChain();
    await updateTrabajoTft('t1', 'TFT-2026-001');
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
  });

  it('sets tft_numero and tft_estado: con_tft', async () => {
    const { update } = mockUpdateChain();
    await updateTrabajoTft('t1', 'TFT-2026-001');
    expect(update).toHaveBeenCalledWith({
      tft_numero: 'TFT-2026-001',
      tft_estado: 'con_tft',
    });
  });

  it('calls .eq with the trabajo id', async () => {
    const { eq } = mockUpdateChain();
    await updateTrabajoTft('trabajo-tft', 'TFT-XYZ');
    expect(eq).toHaveBeenCalledWith('id', 'trabajo-tft');
  });

  it('resolves without error', async () => {
    mockUpdateChain();
    await expect(updateTrabajoTft('t1', 'TFT-001')).resolves.toBeUndefined();
  });
});

// ── cancelarTrabajo ─────────────────────────────────────────────────────────

describe('cancelarTrabajo', () => {
  it('calls trabajos table', async () => {
    mockUpdateChain();
    await cancelarTrabajo('t1');
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
  });

  it('sets folio_fiscal to __CANCELADA__', async () => {
    const { update } = mockUpdateChain();
    await cancelarTrabajo('t1');
    expect(update).toHaveBeenCalledWith({ folio_fiscal: '__CANCELADA__' });
  });

  it('calls .eq with the trabajo id', async () => {
    const { eq } = mockUpdateChain();
    await cancelarTrabajo('trabajo-cancel');
    expect(eq).toHaveBeenCalledWith('id', 'trabajo-cancel');
  });

  it('resolves without error', async () => {
    mockUpdateChain();
    await expect(cancelarTrabajo('t1')).resolves.toBeUndefined();
  });
});

// ── reactivarTrabajo ────────────────────────────────────────────────────────

describe('reactivarTrabajo', () => {
  it('calls trabajos table', async () => {
    mockUpdateChain();
    await reactivarTrabajo('t1');
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
  });

  it('sets folio_fiscal to null', async () => {
    const { update } = mockUpdateChain();
    await reactivarTrabajo('t1');
    expect(update).toHaveBeenCalledWith({ folio_fiscal: null });
  });

  it('calls .eq with the trabajo id', async () => {
    const { eq } = mockUpdateChain();
    await reactivarTrabajo('trabajo-reactivar');
    expect(eq).toHaveBeenCalledWith('id', 'trabajo-reactivar');
  });

  it('resolves without error', async () => {
    mockUpdateChain();
    await expect(reactivarTrabajo('t1')).resolves.toBeUndefined();
  });
});

// ── getGastos ───────────────────────────────────────────────────────────────

describe('getGastos', () => {
  it('queries gastos table', async () => {
    mockFlexibleChain([]);
    await getGastos('t1');
    expect(mockFrom).toHaveBeenCalledWith('gastos');
  });

  it('returns empty array when data is null', async () => {
    mockFlexibleChain(null);
    const result = await getGastos('t1');
    expect(result).toEqual([]);
  });

  it('maps snake_case DB row to camelCase Gasto', async () => {
    const rawData = [{
      id: 'g1', taller_id: 't1',
      categoria: 'operativo', subcategoria: 'Renta',
      concepto: 'Renta de local enero', monto: 5000,
      fecha: '2026-01-01', notas: null,
    }];
    mockFlexibleChain(rawData);
    const result = await getGastos('t1');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'g1',
      tallerId: 't1',
      categoria: 'operativo',
      subcategoria: 'Renta',
      concepto: 'Renta de local enero',
      monto: 5000,
      fecha: '2026-01-01',
    });
  });

  it('sets notas to undefined when null in DB', async () => {
    const rawData = [{
      id: 'g2', taller_id: 't1',
      categoria: 'nomina', subcategoria: 'Salario',
      concepto: 'Sueldo mecánico', monto: 8000,
      fecha: '2026-01-15', notas: null,
    }];
    mockFlexibleChain(rawData);
    const result = await getGastos('t1');
    expect(result[0].notas).toBeUndefined();
  });

  it('preserves notas when present', async () => {
    const rawData = [{
      id: 'g3', taller_id: 't1',
      categoria: 'impuesto', subcategoria: 'IVA por pagar',
      concepto: 'IVA trimestral', monto: 2500,
      fecha: '2026-03-31', notas: 'Declaración Q1',
    }];
    mockFlexibleChain(rawData);
    const result = await getGastos('t1');
    expect(result[0].notas).toBe('Declaración Q1');
  });

  it('converts monto from string to number', async () => {
    const rawData = [{
      id: 'g4', taller_id: 't1',
      categoria: 'administrativo', subcategoria: 'Contabilidad',
      concepto: 'Honorarios contable', monto: '3500.00',
      fecha: '2026-06-01', notas: null,
    }];
    mockFlexibleChain(rawData);
    const result = await getGastos('t1');
    expect(typeof result[0].monto).toBe('number');
    expect(result[0].monto).toBe(3500);
  });

  it('returns multiple gastos', async () => {
    const rawData = [
      { id: 'g1', taller_id: 't1', categoria: 'operativo', subcategoria: 'Luz / CFE', concepto: 'CFE enero', monto: 1200, fecha: '2026-01-05', notas: null },
      { id: 'g2', taller_id: 't1', categoria: 'nomina', subcategoria: 'Salario', concepto: 'Nómina', monto: 8000, fecha: '2026-01-01', notas: null },
    ];
    mockFlexibleChain(rawData);
    const result = await getGastos('t1');
    expect(result).toHaveLength(2);
  });
});

// ── insertGasto ─────────────────────────────────────────────────────────────

describe('insertGasto', () => {
  it('queries gastos table', async () => {
    const rawRow = { id: 'g1', taller_id: 't1', categoria: 'operativo', subcategoria: 'Renta', concepto: 'Renta', monto: 5000, fecha: '2026-06-01', notas: null };
    mockInsertChain(rawRow);
    await insertGasto('t1', { categoria: 'operativo', subcategoria: 'Renta', concepto: 'Renta', monto: 5000, fecha: '2026-06-01' });
    expect(mockFrom).toHaveBeenCalledWith('gastos');
  });

  it('returns mapped Gasto on success', async () => {
    const rawRow = { id: 'g2', taller_id: 't1', categoria: 'nomina', subcategoria: 'Salario', concepto: 'Nómina quincena', monto: 4000, fecha: '2026-06-15', notas: 'Q2' };
    mockInsertChain(rawRow);
    const result = await insertGasto('t1', {
      categoria: 'nomina', subcategoria: 'Salario',
      concepto: 'Nómina quincena', monto: 4000, fecha: '2026-06-15', notas: 'Q2',
    });
    expect(result).not.toBeNull();
    expect(result!.id).toBe('g2');
    expect(result!.monto).toBe(4000);
    expect(result!.notas).toBe('Q2');
  });

  it('returns null when DB returns error', async () => {
    mockInsertChain(null, { message: 'insert failed' });
    const result = await insertGasto('t1', { categoria: 'operativo', subcategoria: 'Otro', concepto: 'Gasto X', monto: 100, fecha: '2026-06-01' });
    expect(result).toBeNull();
  });

  it('returns null when row is null (no error)', async () => {
    mockInsertChain(null, null);
    const result = await insertGasto('t1', { categoria: 'operativo', subcategoria: 'Otro', concepto: 'Gasto Y', monto: 200, fecha: '2026-06-01' });
    expect(result).toBeNull();
  });

  it('sends notas: null when not provided', async () => {
    const rawRow = { id: 'g3', taller_id: 't1', categoria: 'operativo', subcategoria: 'Internet', concepto: 'Internet junio', monto: 600, fecha: '2026-06-01', notas: null };
    const { insert } = mockInsertChain(rawRow);
    await insertGasto('t1', { categoria: 'operativo', subcategoria: 'Internet', concepto: 'Internet junio', monto: 600, fecha: '2026-06-01' });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ notas: null })
    );
  });

  it('includes all required fields in the insert payload', async () => {
    const rawRow = { id: 'g4', taller_id: 't1', categoria: 'impuesto', subcategoria: 'ISR', concepto: 'ISR mensual', monto: 3000, fecha: '2026-06-30', notas: null };
    const { insert } = mockInsertChain(rawRow);
    await insertGasto('t1', { categoria: 'impuesto', subcategoria: 'ISR', concepto: 'ISR mensual', monto: 3000, fecha: '2026-06-30' });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        taller_id: 't1',
        categoria: 'impuesto',
        subcategoria: 'ISR',
        concepto: 'ISR mensual',
        monto: 3000,
        fecha: '2026-06-30',
      })
    );
  });
});

// ── updateGasto ─────────────────────────────────────────────────────────────

describe('updateGasto', () => {
  it('queries gastos table', async () => {
    mockUpdateChain();
    await updateGasto('g1', { monto: 5500 });
    expect(mockFrom).toHaveBeenCalledWith('gastos');
  });

  it('calls .eq with the gasto id', async () => {
    const { eq } = mockUpdateChain();
    await updateGasto('gasto-abc', { monto: 100 });
    expect(eq).toHaveBeenCalledWith('id', 'gasto-abc');
  });

  it('only sends defined fields (monto)', async () => {
    const { update } = mockUpdateChain();
    await updateGasto('g1', { monto: 6000 });
    expect(update).toHaveBeenCalledWith({ monto: 6000 });
  });

  it('sends multiple defined fields', async () => {
    const { update } = mockUpdateChain();
    await updateGasto('g1', { concepto: 'Renta actualizada', monto: 5500 });
    expect(update).toHaveBeenCalledWith({
      concepto: 'Renta actualizada',
      monto: 5500,
    });
  });

  it('does not include undefined fields in patch', async () => {
    const { update } = mockUpdateChain();
    await updateGasto('g1', { fecha: '2026-07-01' }); // only fecha
    const payload = update.mock.calls[0][0];
    expect(Object.keys(payload)).toEqual(['fecha']);
    expect(payload).not.toHaveProperty('monto');
    expect(payload).not.toHaveProperty('concepto');
  });

  it('includes notas in patch when provided as a string', async () => {
    const { update } = mockUpdateChain();
    await updateGasto('g1', { notas: 'Nota actualizada' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ notas: 'Nota actualizada' }));
  });

  it('omits notas from patch when not included in update data', async () => {
    const { update } = mockUpdateChain();
    await updateGasto('g1', { monto: 500 }); // no notas
    const payload = update.mock.calls[0][0];
    expect(payload).not.toHaveProperty('notas');
  });

  it('resolves without error', async () => {
    mockUpdateChain();
    await expect(updateGasto('g1', { monto: 100 })).resolves.toBeUndefined();
  });
});

// ── deleteGasto ─────────────────────────────────────────────────────────────

describe('deleteGasto', () => {
  it('calls gastos table with delete', async () => {
    mockDeleteChain();
    await deleteGasto('g1');
    expect(mockFrom).toHaveBeenCalledWith('gastos');
  });

  it('calls .eq with the gasto id', async () => {
    const { eq } = mockDeleteChain();
    await deleteGasto('gasto-xyz');
    expect(eq).toHaveBeenCalledWith('id', 'gasto-xyz');
  });

  it('resolves without error', async () => {
    mockDeleteChain();
    await expect(deleteGasto('g1')).resolves.toBeUndefined();
  });
});
