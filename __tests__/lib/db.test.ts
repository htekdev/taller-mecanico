import { vi, describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/app/lib/supabase';

// Mock Supabase before importing db functions
vi.mock('@/app/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import {
  getClientes, insertCliente, updateCliente,
  getVehiculos, insertVehiculo,
  getRefacciones, insertRefaccion, updateRefaccionStock, updateRefaccionCompatibilidad,
  getTrabajos, insertTrabajo, updateTrabajo, updateTrabajoPagos, updateTrabajoFactura,
  getOrdenes, updateOrdenEstado, updateOrdenPagos,
  getFacturas, updateFacturaPagos,
  cancelarFactura, reactivarFactura, cancelarNota, reactivarNota,
  updateFacturaTotales, updateTrabajoTotales,
  getMembers, getInvites, sendInvite, cancelInvite, redeemInvite,
  getCotizaciones, insertCotizacion, updateCotizacion, nextCotizacionNumber,
} from '@/app/lib/db';

const mockFrom = vi.mocked(supabase.from);

// ── Mock chain builders ─────────────────────────────────────────────────────

/** SELECT chain: from → select → eq → order → Promise({ data, error }) */
function mockSelectChain(data: unknown, error: unknown = null) {
  const order = vi.fn().mockResolvedValue({ data, error });
  const single = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ order, single });
  const select = vi.fn().mockReturnValue({ eq });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue({ select } as any);
  return { select, eq, order, single };
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

/** UPDATE+SELECT chain: from → update → eq → select → single → Promise({ data, error }) */
function mockUpdateSelectChain(data: unknown, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data, error });
  const selectAfter = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ select: selectAfter });
  const update = vi.fn().mockReturnValue({ eq });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue({ update } as any);
  return { update, eq, single };
}

/** UPDATE chain: from → update → eq → Promise({ error }) */
function mockUpdateChain(error: unknown = null) {
  const eq = vi.fn().mockResolvedValue({ error });
  const update = vi.fn().mockReturnValue({ eq });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue({ update } as any);
  return { update, eq };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getClientes ─────────────────────────────────────────────────────────────

describe('getClientes', () => {
  it('maps snake_case DB row to camelCase Cliente', async () => {
    const rawData = [{ id: 'c1', nombre: 'Juan García', telefono: '555-1234', taller_id: 't1', created_at: '2026-01-01' }];
    mockSelectChain(rawData);

    const result = await getClientes('t1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 'c1', nombre: 'Juan García', telefono: '555-1234' });
  });

  it('returns empty array when data is null', async () => {
    mockSelectChain(null);
    const result = await getClientes('t1');
    expect(result).toEqual([]);
  });

  it('queries the clientes table', async () => {
    mockSelectChain([]);
    await getClientes('t1');
    expect(mockFrom).toHaveBeenCalledWith('clientes');
  });

  it('returns multiple clientes', async () => {
    const rawData = [
      { id: 'c1', nombre: 'Juan', telefono: '111', taller_id: 't1', created_at: '2026-01-01' },
      { id: 'c2', nombre: 'Pedro', telefono: '222', taller_id: 't1', created_at: '2026-01-02' },
    ];
    mockSelectChain(rawData);
    const result = await getClientes('t1');
    expect(result).toHaveLength(2);
  });
});

// ── insertCliente ───────────────────────────────────────────────────────────

describe('insertCliente', () => {
  it('returns mapped Cliente on success', async () => {
    const rawRow = { id: 'c2', nombre: 'Pedro Martínez', telefono: '555-5678', taller_id: 't1' };
    mockInsertChain(rawRow);

    const result = await insertCliente('t1', { nombre: 'Pedro Martínez', telefono: '555-5678' });

    expect(result).toEqual({ id: 'c2', nombre: 'Pedro Martínez', telefono: '555-5678' });
  });

  it('returns null when error occurs', async () => {
    mockInsertChain(null, { message: 'DB error', code: 'PGRST' });
    const result = await insertCliente('t1', { nombre: 'Pedro', telefono: '555' });
    expect(result).toBeNull();
  });

  it('returns null when row is null', async () => {
    mockInsertChain(null, null);
    const result = await insertCliente('t1', { nombre: 'Pedro', telefono: '555' });
    expect(result).toBeNull();
  });

  it('queries the clientes table', async () => {
    const rawRow = { id: 'cx', nombre: 'X', telefono: 'Y', taller_id: 't1' };
    mockInsertChain(rawRow);
    await insertCliente('t1', { nombre: 'X', telefono: 'Y' });
    expect(mockFrom).toHaveBeenCalledWith('clientes');
  });
});

// ── updateCliente ───────────────────────────────────────────────────────────

describe('updateCliente', () => {
  it('returns updated Cliente on success', async () => {
    const rawRow = { id: 'c1', nombre: 'Pedro Actualizado', telefono: '555-9999', email: 'pedro@test.com', email2: null };
    mockUpdateSelectChain(rawRow);

    const result = await updateCliente('c1', { nombre: 'Pedro Actualizado', telefono: '555-9999', email: 'pedro@test.com' });

    expect(result).toEqual({ id: 'c1', nombre: 'Pedro Actualizado', telefono: '555-9999', email: 'pedro@test.com' });
  });

  it('returns null when error occurs', async () => {
    mockUpdateSelectChain(null, { message: 'DB error', code: 'PGRST' });
    const result = await updateCliente('c1', { nombre: 'X', telefono: '555' });
    expect(result).toBeNull();
  });

  it('returns null when row is null', async () => {
    mockUpdateSelectChain(null, null);
    const result = await updateCliente('c1', { nombre: 'X', telefono: '555' });
    expect(result).toBeNull();
  });

  it('queries the clientes table', async () => {
    const rawRow = { id: 'c1', nombre: 'X', telefono: 'Y', email: null, email2: null };
    mockUpdateSelectChain(rawRow);
    await updateCliente('c1', { nombre: 'X', telefono: 'Y' });
    expect(mockFrom).toHaveBeenCalledWith('clientes');
  });
});

// ── getVehiculos ────────────────────────────────────────────────────────────

describe('getVehiculos', () => {
  it('maps vehiculo fields from snake_case', async () => {
    const rawData = [{ id: 'v1', taller_id: 't1', cliente_id: 'c1', marca: 'Ford', modelo: 'F-150', anio: '2020', placa: 'ABC', created_at: '2026-01-01' }];
    mockSelectChain(rawData);
    const result = await getVehiculos('t1');
    expect(result[0].clienteId).toBe('c1');
    expect(result[0].marca).toBe('Ford');
  });
});

// ── insertVehiculo ──────────────────────────────────────────────────────────

describe('insertVehiculo', () => {
  it('returns null on error', async () => {
    mockInsertChain(null, { message: 'error' });
    const result = await insertVehiculo('t1', { clienteId: 'c1', marca: 'Ford', modelo: 'F-150', anio: '2020', placa: '' });
    expect(result).toBeNull();
  });
});

// ── getRefacciones ──────────────────────────────────────────────────────────

describe('getRefacciones', () => {
  it('maps snake_case to camelCase Refaccion', async () => {
    const rawData = [{
      id: 'r1', taller_id: 't1', nombre: 'Filtro', codigo: 'F001',
      categoria: 'Filtros', unidad: 'pza', precio_compra: 150,
      stock: 10, stock_minimo: 2, vehiculo_id: null, proveedor_id: null,
      compatibilidad: null, created_at: '2026-01-01',
    }];
    mockSelectChain(rawData);

    const result = await getRefacciones('t1');

    expect(result).toHaveLength(1);
    expect(result[0].precioCompra).toBe(150);
    expect(result[0].stockMinimo).toBe(2);
    expect(result[0].vehiculoId).toBeUndefined();
    expect(result[0].proveedorId).toBeUndefined();
    expect(result[0].compatibilidad).toBeUndefined();
  });

  it('maps vehiculoId and proveedorId when present', async () => {
    const rawData = [{
      id: 'r1', taller_id: 't1', nombre: 'Filtro', codigo: 'F001',
      categoria: 'Filtros', unidad: 'pza', precio_compra: 150,
      stock: 10, stock_minimo: 2, vehiculo_id: 'v1', proveedor_id: 'pv1',
      compatibilidad: null, created_at: '2026-01-01',
    }];
    mockSelectChain(rawData);

    const result = await getRefacciones('t1');
    expect(result[0].vehiculoId).toBe('v1');
    expect(result[0].proveedorId).toBe('pv1');
  });
});

// ── insertRefaccion ─────────────────────────────────────────────────────────

describe('insertRefaccion', () => {
  it('throws on DB error', async () => {
    mockInsertChain(null, { message: 'error' });
    await expect(
      insertRefaccion('t1', { nombre: 'Filtro', codigo: 'F001', categoria: 'Filtros', unidad: 'pza', precioCompra: 100, stock: 5, stockMinimo: 1 })
    ).rejects.toThrow('insertRefaccion');
  });
});

// ── updateRefaccionStock ────────────────────────────────────────────────────

describe('updateRefaccionStock', () => {
  it('calls update on refacciones table with correct stock', async () => {
    const { update, eq } = mockUpdateChain();
    await updateRefaccionStock('r1', 15);
    expect(mockFrom).toHaveBeenCalledWith('refacciones');
    expect(update).toHaveBeenCalledWith({ stock: 15 });
    expect(eq).toHaveBeenCalledWith('id', 'r1');
  });

  it('works with stock of 0', async () => {
    const { update } = mockUpdateChain();
    await updateRefaccionStock('r1', 0);
    expect(update).toHaveBeenCalledWith({ stock: 0 });
  });
});

// ── updateRefaccionCompatibilidad ───────────────────────────────────────────

describe('updateRefaccionCompatibilidad', () => {
  it('calls update with compatibilidad value', async () => {
    const { update, eq } = mockUpdateChain();
    const compat = [{ marca: 'Ford', modelos: ['F-150'] }];
    await updateRefaccionCompatibilidad('r1', compat);
    expect(update).toHaveBeenCalledWith({ compatibilidad: compat });
    expect(eq).toHaveBeenCalledWith('id', 'r1');
  });

  it('calls update with null when compatibilidad is null', async () => {
    const { update } = mockUpdateChain();
    await updateRefaccionCompatibilidad('r1', null);
    expect(update).toHaveBeenCalledWith({ compatibilidad: null });
  });
});

// ── getTrabajos ─────────────────────────────────────────────────────────────

describe('getTrabajos', () => {
  it('maps all trabajo fields from snake_case', async () => {
    const rawData = [{
      id: 't1', taller_id: 't1', cliente_id: 'c1', vehiculo_id: 'v1',
      fecha: '2026-06-01', descripcion: 'Cambio aceite',
      mano_de_obra: 200, mano_de_obra_items: [{ id: 'mo1', concepto: 'Labor', precio: 200 }],
      refacciones_total: 150, costo_refacciones: 120,
      requiere_factura: false, folio_fiscal: null,
      iva: 0, total: 350,
      partes: [{ refaccionId: 'r1', nombre: 'Filtro', codigo: 'F001', cantidad: 1, precioCompra: 120, precioVenta: 150, subtotal: 150, costoTotal: 120 }],
      pagos: [], factura_id: null, estado_facturacion: 'sin_facturar', estado: 'pendiente',
      created_at: '2026-06-01',
    }];
    mockSelectChain(rawData);

    const result = await getTrabajos('t1');

    expect(result).toHaveLength(1);
    expect(result[0].clienteId).toBe('c1');
    expect(result[0].vehiculoId).toBe('v1');
    expect(result[0].manoDeObra).toBe(200);
    expect(result[0].costoRefacciones).toBe(120);
    expect(result[0].requiereFactura).toBe(false);
    expect(result[0].iva).toBe(0);
    expect(result[0].total).toBe(350);
    expect(result[0].partes).toHaveLength(1);
    expect(result[0].pagos).toEqual([]);
    expect(result[0].estadoFacturacion).toBe('sin_facturar');
    expect(result[0].estado).toBe('pendiente');
  });

  it('handles null JSONB arrays as empty arrays', async () => {
    const rawData = [{
      id: 't1', taller_id: 't1', cliente_id: null, vehiculo_id: null,
      fecha: '2026-06-01', descripcion: 'Test',
      mano_de_obra: 0, mano_de_obra_items: null,
      refacciones_total: 0, costo_refacciones: 0,
      requiere_factura: false, folio_fiscal: null,
      iva: 0, total: 0,
      partes: null, pagos: null,
      factura_id: null, estado_facturacion: 'sin_facturar', estado: 'pendiente',
      created_at: '2026-06-01',
    }];
    mockSelectChain(rawData);

    const result = await getTrabajos('t1');
    expect(result[0].manoDeObraItems).toEqual([]);
    expect(result[0].partes).toEqual([]);
    expect(result[0].pagos).toEqual([]);
    expect(result[0].clienteId).toBe('');
    expect(result[0].vehiculoId).toBe('');
  });
});

// ── insertTrabajo ───────────────────────────────────────────────────────────

const baseTrabajoInput = {
  clienteId: 'c1', vehiculoId: 'v1', fecha: '2026-06-01', descripcion: 'Test trabajo',
  manoDeObra: 200, manoDeObraItems: [], refacciones: 0, costoRefacciones: 0,
  requiereFactura: false, iva: 0, total: 200, partes: [], pagos: [],
  estadoFacturacion: 'sin_facturar' as const, estado: 'pendiente' as const,
};

const baseTrabajoRow = {
  id: 'w1', taller_id: 't1', cliente_id: 'c1', vehiculo_id: 'v1',
  fecha: '2026-06-01', descripcion: 'Test trabajo',
  mano_de_obra: 200, mano_de_obra_items: [], refacciones_total: 0, costo_refacciones: 0,
  requiere_factura: false, folio_fiscal: null, iva: 0, total: 200, partes: [], pagos: [],
  estado_facturacion: 'sin_facturar', estado: 'pendiente',
  numero_orden: null, kilometraje: null, tipo_cliente: 'general',
  tft_estado: 'sin_tft', pendiente_refacciones: false, refacciones_pendientes_nombres: [],
};

describe('insertTrabajo', () => {
  it('throws with Supabase error message on failure', async () => {
    mockInsertChain(null, { message: 'DB error' });
    await expect(insertTrabajo('t1', baseTrabajoInput)).rejects.toThrow('insertTrabajo: DB error');
  });

  it('returns mapped Trabajo on success', async () => {
    mockInsertChain(baseTrabajoRow);
    const result = await insertTrabajo('t1', baseTrabajoInput);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('w1');
    expect(result?.clienteId).toBe('c1');
    expect(result?.manoDeObra).toBe(200);
    expect(result?.estado).toBe('pendiente');
  });

  it('includes kilometraje and numero_orden in payload when provided', async () => {
    const rowWithNewCols = { ...baseTrabajoRow, kilometraje: 50000, numero_orden: 'OC-001' };
    mockInsertChain(rowWithNewCols);
    const result = await insertTrabajo('t1', { ...baseTrabajoInput, kilometraje: 50000, numeroOrden: 'OC-001' });
    expect(result?.kilometraje).toBe(50000);
    expect(result?.numeroOrden).toBe('OC-001');
  });

  it('retries without new columns on 42703 error (column not found in DB)', async () => {
    // First attempt returns 42703; fallback attempt succeeds
    const single42703 = vi.fn().mockResolvedValue({ data: null, error: { code: '42703', message: 'column "kilometraje" does not exist' } });
    const select42703 = vi.fn().mockReturnValue({ single: single42703 });
    const insert42703 = vi.fn().mockReturnValue({ select: select42703 });

    const singleFallback = vi.fn().mockResolvedValue({ data: baseTrabajoRow, error: null });
    const selectFallback = vi.fn().mockReturnValue({ single: singleFallback });
    const insertFallback = vi.fn().mockReturnValue({ select: selectFallback });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValueOnce({ insert: insert42703 } as any).mockReturnValue({ insert: insertFallback } as any);

    const result = await insertTrabajo('t1', { ...baseTrabajoInput, kilometraje: 50000, numeroOrden: 'OC-001' });
    expect(result?.id).toBe('w1');
    // Second insert call should not include kilometraje or numero_orden
    const fallbackPayload = insertFallback.mock.calls[0][0] as Record<string, unknown>;
    expect(fallbackPayload).not.toHaveProperty('kilometraje');
    expect(fallbackPayload).not.toHaveProperty('numero_orden');
  });

  it('throws on 42703 when fallback also fails', async () => {
    const single42703 = vi.fn().mockResolvedValue({ data: null, error: { code: '42703', message: 'column not found' } });
    const select42703 = vi.fn().mockReturnValue({ single: single42703 });
    const insert42703 = vi.fn().mockReturnValue({ select: select42703 });

    const singleFallbackFail = vi.fn().mockResolvedValue({ data: null, error: { message: 'Fallback also failed' } });
    const selectFallbackFail = vi.fn().mockReturnValue({ single: singleFallbackFail });
    const insertFallbackFail = vi.fn().mockReturnValue({ select: selectFallbackFail });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValueOnce({ insert: insert42703 } as any).mockReturnValue({ insert: insertFallbackFail } as any);

    await expect(insertTrabajo('t1', baseTrabajoInput)).rejects.toThrow('insertTrabajo: Fallback also failed');
  });
});

// ── updateTrabajo ───────────────────────────────────────────────────────────

const baseTrabajoFull = { id: 'w1', ...baseTrabajoInput };

describe('updateTrabajo', () => {
  it('updates all trabajo fields without error', async () => {
    const { update, eq } = mockUpdateChain();
    await updateTrabajo('w1', baseTrabajoFull);
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
    expect(eq).toHaveBeenCalledWith('id', 'w1');
    expect(update).toHaveBeenCalled();
  });

  it('throws with error message on DB failure', async () => {
    mockUpdateChain({ message: 'Update failed' });
    await expect(updateTrabajo('w1', baseTrabajoFull)).rejects.toThrow('updateTrabajo: Update failed');
  });

  it('retries without new columns on 42703 error', async () => {
    // First update: 42703; fallback: success
    const eq42703 = vi.fn().mockResolvedValue({ error: { code: '42703', message: 'column not found' } });
    const update42703 = vi.fn().mockReturnValue({ eq: eq42703 });

    const eqFallback = vi.fn().mockResolvedValue({ error: null });
    const updateFallback = vi.fn().mockReturnValue({ eq: eqFallback });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValueOnce({ update: update42703 } as any).mockReturnValue({ update: updateFallback } as any);

    await expect(updateTrabajo('w1', { ...baseTrabajoFull, kilometraje: 10000 })).resolves.toBeUndefined();
    // Fallback payload should not include kilometraje or numero_orden
    const fallbackPayload = updateFallback.mock.calls[0][0] as Record<string, unknown>;
    expect(fallbackPayload).not.toHaveProperty('numero_orden');
    expect(fallbackPayload).not.toHaveProperty('kilometraje');
  });

  it('throws when 42703 fallback also fails', async () => {
    const eq42703 = vi.fn().mockResolvedValue({ error: { code: '42703', message: 'column not found' } });
    const update42703 = vi.fn().mockReturnValue({ eq: eq42703 });

    const eqFallbackFail = vi.fn().mockResolvedValue({ error: { message: 'Fallback update failed' } });
    const updateFallbackFail = vi.fn().mockReturnValue({ eq: eqFallbackFail });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValueOnce({ update: update42703 } as any).mockReturnValue({ update: updateFallbackFail } as any);

    await expect(updateTrabajo('w1', baseTrabajoFull)).rejects.toThrow('updateTrabajo: Fallback update failed');
  });
});

// ── updateTrabajoPagos ──────────────────────────────────────────────────────

describe('updateTrabajoPagos', () => {
  it('updates pagos field on trabajos table', async () => {
    const { update, eq } = mockUpdateChain();
    const pagos = [{ id: 'p1', fecha: '2026-06-01', monto: 100 }];
    await updateTrabajoPagos('t1', pagos);
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
    expect(update).toHaveBeenCalledWith({ pagos });
    expect(eq).toHaveBeenCalledWith('id', 't1');
  });
});

// ── updateTrabajoFactura ────────────────────────────────────────────────────

describe('updateTrabajoFactura', () => {
  it('updates factura_id and estado_facturacion to facturado', async () => {
    const { update, eq } = mockUpdateChain();
    await updateTrabajoFactura('t1', 'f1');
    expect(update).toHaveBeenCalledWith({ factura_id: 'f1', estado_facturacion: 'facturado' });
    expect(eq).toHaveBeenCalledWith('id', 't1');
  });
});

// ── getOrdenes ──────────────────────────────────────────────────────────────

describe('getOrdenes', () => {
  it('maps orden fields from snake_case', async () => {
    const rawData = [{
      id: 'o1', taller_id: 't1', proveedor_id: 'pv1',
      fecha: '2026-06-01', numero_orden: 'OC-2026-001',
      descripcion: 'Reposición', partes: [], total: 1500,
      estado: 'pendiente', fecha_recibida: null, pagos: [],
      created_at: '2026-06-01',
    }];
    mockSelectChain(rawData);

    const result = await getOrdenes('t1');
    expect(result[0].proveedorId).toBe('pv1');
    expect(result[0].numeroOrden).toBe('OC-2026-001');
    expect(result[0].total).toBe(1500);
    expect(result[0].estado).toBe('pendiente');
    expect(result[0].fechaRecibida).toBeUndefined();
  });
});

// ── updateOrdenEstado ───────────────────────────────────────────────────────

describe('updateOrdenEstado', () => {
  it('updates estado without fechaRecibida', async () => {
    const { update, eq } = mockUpdateChain();
    await updateOrdenEstado('o1', 'cancelada');
    expect(update).toHaveBeenCalledWith({ estado: 'cancelada' });
    expect(eq).toHaveBeenCalledWith('id', 'o1');
  });

  it('includes fecha_recibida when provided', async () => {
    const { update } = mockUpdateChain();
    await updateOrdenEstado('o1', 'recibida', '2026-06-05');
    expect(update).toHaveBeenCalledWith({ estado: 'recibida', fecha_recibida: '2026-06-05' });
  });
});

// ── updateOrdenPagos ────────────────────────────────────────────────────────

describe('updateOrdenPagos', () => {
  it('updates pagos on ordenes_compra table', async () => {
    const { update, eq } = mockUpdateChain();
    const pagos = [{ id: 'pc1', fecha: '2026-06-01', monto: 750 }];
    await updateOrdenPagos('o1', pagos);
    expect(mockFrom).toHaveBeenCalledWith('ordenes_compra');
    expect(update).toHaveBeenCalledWith({ pagos });
    expect(eq).toHaveBeenCalledWith('id', 'o1');
  });
});

// ── getFacturas ─────────────────────────────────────────────────────────────

describe('getFacturas', () => {
  it('maps factura fields from snake_case', async () => {
    const rawData = [{
      id: 'f1', taller_id: 't1', numero_factura: 'FAC-2026-001',
      trabajo_id: 't1', cliente_id: 'c1', vehiculo_id: 'v1',
      fecha: '2026-06-15', fecha_vencimiento: null,
      conceptos: [], subtotal: 1000, iva: null, total: 1000,
      pagos: [], notas: null, created_at: '2026-06-15',
    }];
    mockSelectChain(rawData);

    const result = await getFacturas('t1');
    expect(result[0].numeroFactura).toBe('FAC-2026-001');
    expect(result[0].trabajoId).toBe('t1');
    expect(result[0].clienteId).toBe('c1');
    expect(result[0].subtotal).toBe(1000);
    expect(result[0].iva).toBeUndefined();
    expect(result[0].fechaVencimiento).toBeUndefined();
    expect(result[0].notas).toBeUndefined();
  });
});

// ── updateFacturaPagos ──────────────────────────────────────────────────────

describe('updateFacturaPagos', () => {
  it('updates pagos on facturas table', async () => {
    const { update, eq } = mockUpdateChain();
    const pagos = [{ id: 'pf1', fecha: '2026-06-15', monto: 500, metodoPago: 'efectivo' }];
    await updateFacturaPagos('f1', pagos);
    expect(mockFrom).toHaveBeenCalledWith('facturas');
    expect(update).toHaveBeenCalledWith({ pagos });
    expect(eq).toHaveBeenCalledWith('id', 'f1');
  });
});

// ── Flexible chain helpers (for multi-step / filtered chains) ───────────────
//
// Uses a Proxy so any method call returns the same chain object.
// The chain is a thenable that resolves to { data, error } when awaited.
// This handles complex patterns like: .select().eq().is().order().limit().single()

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

/** Single-call mock: every chain method returns a flexible thenable. */
function mockFlexibleChain(data: unknown, error: unknown = null) {
  const chain = makeFlexibleChain(data, error);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue(chain as any);
  return chain;
}

/**
 * Multi-call mock: sets up sequential mockReturnValueOnce for functions
 * that call supabase.from() more than once (e.g. sendInvite, redeemInvite).
 */
function mockFromSequence(...results: Array<{ data: unknown; error?: unknown }>) {
  for (const r of results) {
    const chain = makeFlexibleChain(r.data, r.error ?? null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValueOnce(chain as any);
  }
}

// ── getMembers ──────────────────────────────────────────────────────────────

describe('getMembers', () => {
  it('queries taller_members table', async () => {
    mockFlexibleChain([]);
    await getMembers('t1');
    expect(mockFrom).toHaveBeenCalledWith('taller_members');
  });

  it('maps snake_case row to TallerMember', async () => {
    const rawData = [{
      id: 'm1', taller_id: 't1', user_id: 'u1', role: 'owner',
      created_at: '2026-06-22T00:00:00Z',
    }];
    mockFlexibleChain(rawData);
    const result = await getMembers('t1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'm1', tallerId: 't1', userId: 'u1', role: 'owner', createdAt: '2026-06-22T00:00:00Z',
    });
  });

  it('returns empty array when data is null', async () => {
    mockFlexibleChain(null);
    expect(await getMembers('t1')).toEqual([]);
  });

  it('maps mechanic role correctly', async () => {
    const rawData = [{
      id: 'm2', taller_id: 't1', user_id: 'u2', role: 'mechanic', created_at: '2026-06-22T00:00:00Z',
    }];
    mockFlexibleChain(rawData);
    const result = await getMembers('t1');
    expect(result[0].role).toBe('mechanic');
  });
});

// ── getInvites ──────────────────────────────────────────────────────────────

describe('getInvites', () => {
  it('queries taller_invites table', async () => {
    mockFlexibleChain([]);
    await getInvites('t1');
    expect(mockFrom).toHaveBeenCalledWith('taller_invites');
  });

  it('maps snake_case row to TallerInvite', async () => {
    const rawData = [{
      id: 'inv1', taller_id: 't1', email: 'test@example.com',
      token: 'tok123', invited_by: 'u1', used_at: null, created_at: '2026-06-22T00:00:00Z',
    }];
    mockFlexibleChain(rawData);
    const result = await getInvites('t1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'inv1', tallerId: 't1', email: 'test@example.com',
      token: 'tok123', invitedBy: 'u1', usedAt: null, createdAt: '2026-06-22T00:00:00Z',
    });
  });

  it('returns empty array when data is null', async () => {
    mockFlexibleChain(null);
    expect(await getInvites('t1')).toEqual([]);
  });

  it('maps invitedBy to null when invited_by is null', async () => {
    const rawData = [{
      id: 'inv2', taller_id: 't1', email: 'anon@example.com',
      token: 'tokABC', invited_by: null, used_at: null, created_at: '2026-06-22T00:00:00Z',
    }];
    mockFlexibleChain(rawData);
    const result = await getInvites('t1');
    expect(result[0].invitedBy).toBeNull();
  });
});

// ── sendInvite ──────────────────────────────────────────────────────────────

describe('sendInvite', () => {
  it('returns null when a pending invite already exists for that email', async () => {
    // First from() call — check existing — finds one
    mockFromSequence({ data: { id: 'inv1' } });
    const result = await sendInvite('t1', 'test@example.com', 'u1');
    expect(result).toBeNull();
  });

  it('inserts and returns a new invite when no existing pending invite', async () => {
    const newRow = {
      id: 'inv2', taller_id: 't1', email: 'new@example.com',
      token: 'tok456', invited_by: 'u1', used_at: null, created_at: '2026-06-22T00:00:00Z',
    };
    mockFromSequence(
      { data: null },     // check existing — none found
      { data: newRow },   // insert — success
    );
    const result = await sendInvite('t1', 'new@example.com', 'u1');
    expect(result).not.toBeNull();
    expect(result!.email).toBe('new@example.com');
    expect(result!.token).toBe('tok456');
    expect(result!.invitedBy).toBe('u1');
    expect(result!.tallerId).toBe('t1');
  });

  it('lowercases email before inserting', async () => {
    const newRow = {
      id: 'inv3', taller_id: 't1', email: 'upper@example.com',
      token: 'tok789', invited_by: 'u1', used_at: null, created_at: '2026-06-22T00:00:00Z',
    };
    mockFromSequence({ data: null }, { data: newRow });
    const result = await sendInvite('t1', 'UPPER@EXAMPLE.COM', 'u1');
    expect(result).not.toBeNull();
    expect(result!.email).toBe('upper@example.com');
  });

  it('returns null when insert fails with DB error', async () => {
    mockFromSequence(
      { data: null },
      { data: null, error: { message: 'DB insert error' } },
    );
    const result = await sendInvite('t1', 'fail@example.com', 'u1');
    expect(result).toBeNull();
  });

  it('returns null when insert row is null without error', async () => {
    mockFromSequence(
      { data: null },
      { data: null, error: null },
    );
    const result = await sendInvite('t1', 'null@example.com', 'u1');
    expect(result).toBeNull();
  });
});

// ── cancelInvite ────────────────────────────────────────────────────────────

describe('cancelInvite', () => {
  it('calls delete on taller_invites table', async () => {
    mockFlexibleChain(null);
    await cancelInvite('inv1');
    expect(mockFrom).toHaveBeenCalledWith('taller_invites');
  });

  it('resolves without error for valid invite id', async () => {
    mockFlexibleChain(null);
    await expect(cancelInvite('inv99')).resolves.toBeUndefined();
  });
});

// ── redeemInvite ────────────────────────────────────────────────────────────

describe('redeemInvite', () => {
  it('returns null when no pending invite exists for that email', async () => {
    mockFromSequence({ data: [] }); // empty array = no invites
    const result = await redeemInvite('noone@example.com', 'u1');
    expect(result).toBeNull();
  });

  it('adds user as mechanic member and marks invite used', async () => {
    const invite = {
      id: 'inv1', taller_id: 't1', email: 'member@example.com',
      token: 'tok1', invited_by: 'owner1', used_at: null, created_at: '2026-06-20T00:00:00Z',
    };
    mockFromSequence(
      { data: [invite] }, // find invites — array
      { data: null },     // check member → not yet a member
      { data: null },     // insert member (core fields)
      { data: null },     // update member email (best-effort)
      { data: null },     // update invite used_at
    );
    const result = await redeemInvite('member@example.com', 'u2');
    expect(result).toBe('t1');
    expect(mockFrom).toHaveBeenCalledTimes(5);
  });

  it('skips member insert when user is already a member, still marks invite used', async () => {
    const invite = {
      id: 'inv2', taller_id: 't1', email: 'existing@example.com',
      token: 'tok2', invited_by: 'owner1', used_at: null, created_at: '2026-06-20T00:00:00Z',
    };
    mockFromSequence(
      { data: [invite] },         // find invites — array
      { data: { id: 'mem1' } },   // check member → already exists
      { data: null },             // backfill email on existing member
      { data: null },             // update invite used_at
    );
    const result = await redeemInvite('existing@example.com', 'u3');
    expect(result).toBe('t1');
    // 4 from() calls: find invites, check member, backfill email, update invite
    expect(mockFrom).toHaveBeenCalledTimes(4);
  });

  it('returns correct taller_id from redeemed invite', async () => {
    const invite = {
      id: 'inv3', taller_id: 'taller-xyz', email: 'shop@example.com',
      token: 'tok3', invited_by: null, used_at: null, created_at: '2026-06-21T00:00:00Z',
    };
    mockFromSequence(
      { data: [invite] }, { data: null }, { data: null }, { data: null }, { data: null },
    );
    const result = await redeemInvite('shop@example.com', 'u4');
    expect(result).toBe('taller-xyz');
  });

  it('lowercases email when looking up invite', async () => {
    mockFromSequence({ data: [] }); // empty array = no invites
    const result = await redeemInvite('UPPER@EXAMPLE.COM', 'u5');
    expect(result).toBeNull();
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

// ── cancelarFactura / reactivarFactura ───────────────────────────────────────

describe('cancelarFactura', () => {
  it('sets notas=CANCELADA on facturas table', async () => {
    const { update, eq } = mockUpdateChain();
    await cancelarFactura('f1');
    expect(mockFrom).toHaveBeenCalledWith('facturas');
    expect(update).toHaveBeenCalledWith({ notas: 'CANCELADA' });
    expect(eq).toHaveBeenCalledWith('id', 'f1');
  });

  it('resolves without error', async () => {
    mockUpdateChain();
    await expect(cancelarFactura('f2')).resolves.toBeUndefined();
  });
});

describe('reactivarFactura', () => {
  it('sets notas=null on facturas table', async () => {
    const { update, eq } = mockUpdateChain();
    await reactivarFactura('f1');
    expect(mockFrom).toHaveBeenCalledWith('facturas');
    expect(update).toHaveBeenCalledWith({ notas: null });
    expect(eq).toHaveBeenCalledWith('id', 'f1');
  });

  it('resolves without error', async () => {
    mockUpdateChain();
    await expect(reactivarFactura('f2')).resolves.toBeUndefined();
  });
});

// ── cancelarNota / reactivarNota ─────────────────────────────────────────────

describe('cancelarNota', () => {
  it('sets folio_fiscal=__CANCELADA__ on trabajos table', async () => {
    const { update, eq } = mockUpdateChain();
    await cancelarNota('t1');
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
    expect(update).toHaveBeenCalledWith({ folio_fiscal: '__CANCELADA__' });
    expect(eq).toHaveBeenCalledWith('id', 't1');
  });

  it('resolves without error', async () => {
    mockUpdateChain();
    await expect(cancelarNota('t2')).resolves.toBeUndefined();
  });
});

describe('reactivarNota', () => {
  it('sets folio_fiscal=null on trabajos table', async () => {
    const { update, eq } = mockUpdateChain();
    await reactivarNota('t1');
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
    expect(update).toHaveBeenCalledWith({ folio_fiscal: null });
    expect(eq).toHaveBeenCalledWith('id', 't1');
  });

  it('resolves without error', async () => {
    mockUpdateChain();
    await expect(reactivarNota('t2')).resolves.toBeUndefined();
  });
});

// ── updateFacturaTotales ─────────────────────────────────────────────────────

describe('updateFacturaTotales', () => {
  it('updates subtotal, iva, total and numero_factura on facturas table', async () => {
    const { update, eq } = mockUpdateChain();
    await updateFacturaTotales('f1', { subtotal: 1000, iva: 160, total: 1160, numeroFactura: 'FAC-001-ADJ' });
    expect(mockFrom).toHaveBeenCalledWith('facturas');
    expect(update).toHaveBeenCalledWith({ subtotal: 1000, iva: 160, total: 1160, numero_factura: 'FAC-001-ADJ' });
    expect(eq).toHaveBeenCalledWith('id', 'f1');
  });

  it('stores null iva when iva is undefined', async () => {
    const { update } = mockUpdateChain();
    await updateFacturaTotales('f2', { subtotal: 500, iva: undefined, total: 500, numeroFactura: 'F-002' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ iva: null }));
  });

  it('resolves without error', async () => {
    mockUpdateChain();
    await expect(updateFacturaTotales('f3', { subtotal: 200, iva: undefined, total: 200, numeroFactura: 'F-003' })).resolves.toBeUndefined();
  });
});

// ── updateTrabajoTotales ─────────────────────────────────────────────────────

describe('updateTrabajoTotales', () => {
  it('updates iva and total on trabajos table', async () => {
    const { update, eq } = mockUpdateChain();
    await updateTrabajoTotales('t1', { iva: 160, total: 1160 });
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
    expect(update).toHaveBeenCalledWith({ iva: 160, total: 1160 });
    expect(eq).toHaveBeenCalledWith('id', 't1');
  });

  it('resolves without error', async () => {
    mockUpdateChain();
    await expect(updateTrabajoTotales('t2', { iva: 0, total: 500 })).resolves.toBeUndefined();
  });
});

// ── getCotizaciones ─────────────────────────────────────────────────────────

describe('getCotizaciones', () => {
  it('queries cotizaciones table', async () => {
    mockFlexibleChain([]);
    await getCotizaciones('t1');
    expect(mockFrom).toHaveBeenCalledWith('cotizaciones');
  });

  it('maps snake_case DB row to CotizacionRow', async () => {
    const rawData = [{
      id: 'cot1',
      taller_id: 't1',
      numero_cotizacion: 'COT-001',
      plantilla: 'general',
      cliente: 'Juan García',
      fecha: '2026-06-25',
      total: '1500.00',
      cancelada: false,
      editada: false,
      convertida: false,
      form: { marca: 'Ford', modelo: 'F-150' },
      saved_at: '2026-06-25T12:00:00Z',
      created_at: '2026-06-25T12:00:00Z',
    }];
    mockFlexibleChain(rawData);
    const result = await getCotizaciones('t1');
    expect(result).toHaveLength(1);
    expect(result[0].numeroCotizacion).toBe('COT-001');
    expect(result[0].plantilla).toBe('general');
    expect(result[0].cliente).toBe('Juan García');
    expect(result[0].total).toBe(1500);
    expect(result[0].cancelada).toBe(false);
    expect(result[0].form).toEqual({ marca: 'Ford', modelo: 'F-150' });
  });

  it('returns empty array when data is null', async () => {
    mockFlexibleChain(null);
    const result = await getCotizaciones('t1');
    expect(result).toEqual([]);
  });

  it('handles cancelada/editada/convertida flags', async () => {
    const rawData = [{
      id: 'cot2', taller_id: 't1', numero_cotizacion: 'COT-002',
      plantilla: 'ayuntamiento', cliente: 'Ayuntamiento', fecha: null,
      total: '0', cancelada: true, editada: true, convertida: true,
      form: {}, saved_at: '2026-06-25T12:00:00Z', created_at: '2026-06-25T12:00:00Z',
    }];
    mockFlexibleChain(rawData);
    const result = await getCotizaciones('t1');
    expect(result[0].cancelada).toBe(true);
    expect(result[0].editada).toBe(true);
    expect(result[0].convertida).toBe(true);
    expect(result[0].fecha).toBeNull();
  });
});

// ── insertCotizacion ────────────────────────────────────────────────────────

describe('insertCotizacion', () => {
  const payload = {
    numeroCotizacion: 'COT-001',
    plantilla: 'general' as const,
    cliente: 'Pedro López',
    fecha: '2026-06-25',
    total: 2000,
    cancelada: false,
    editada: false,
    convertida: false,
    form: { marca: 'Toyota', modelo: 'Hilux' } as Record<string, unknown>,
  };

  it('queries cotizaciones table', async () => {
    const rawRow = { id: 'cot3', taller_id: 't1', numero_cotizacion: 'COT-001',
      plantilla: 'general', cliente: 'Pedro López', fecha: '2026-06-25', total: '2000',
      cancelada: false, editada: false, convertida: false, form: {},
      saved_at: '2026-06-25T12:00:00Z', created_at: '2026-06-25T12:00:00Z' };
    mockInsertChain(rawRow);
    await insertCotizacion('t1', payload);
    expect(mockFrom).toHaveBeenCalledWith('cotizaciones');
  });

  it('returns mapped CotizacionRow on success', async () => {
    const rawRow = { id: 'cot3', taller_id: 't1', numero_cotizacion: 'COT-001',
      plantilla: 'general', cliente: 'Pedro López', fecha: '2026-06-25', total: '2000.00',
      cancelada: false, editada: false, convertida: false, form: { marca: 'Toyota' },
      saved_at: '2026-06-25T12:00:00Z', created_at: '2026-06-25T12:00:00Z' };
    mockInsertChain(rawRow);
    const result = await insertCotizacion('t1', payload);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('cot3');
    expect(result!.numeroCotizacion).toBe('COT-001');
    expect(result!.total).toBe(2000);
  });

  it('returns null on DB error', async () => {
    mockInsertChain(null, { message: 'DB error' });
    const result = await insertCotizacion('t1', payload);
    expect(result).toBeNull();
  });

  it('returns null when row is null', async () => {
    mockInsertChain(null, null);
    const result = await insertCotizacion('t1', payload);
    expect(result).toBeNull();
  });
});

// ── updateCotizacion ────────────────────────────────────────────────────────

describe('updateCotizacion', () => {
  it('queries cotizaciones table', async () => {
    mockFlexibleChain(null);
    await updateCotizacion('cot1', { cancelada: true });
    expect(mockFrom).toHaveBeenCalledWith('cotizaciones');
  });

  it('returns true on success', async () => {
    mockFlexibleChain(null);
    const result = await updateCotizacion('cot1', { cancelada: true });
    expect(result).toBe(true);
  });

  it('returns false on DB error', async () => {
    mockFlexibleChain(null, { message: 'update failed' });
    const result = await updateCotizacion('cot1', { editada: true });
    expect(result).toBe(false);
  });

  it('updates convertida flag', async () => {
    mockFlexibleChain(null);
    const result = await updateCotizacion('cot2', { convertida: true });
    expect(result).toBe(true);
  });
});

// ── nextCotizacionNumber ────────────────────────────────────────────────────

describe('nextCotizacionNumber', () => {
  it('returns COT-001 when no counter exists', async () => {
    // First call: select counter → null (no row yet)
    // Second call: upsert counter
    mockFromSequence(
      { data: null },         // select counter → not found
      { data: null },         // upsert counter
    );
    const result = await nextCotizacionNumber('t1');
    expect(result).toBe('COT-001');
  });

  it('returns incremented number when counter exists', async () => {
    mockFromSequence(
      { data: { last_number: 4 } },   // select counter → 4
      { data: null },                  // upsert counter
    );
    const result = await nextCotizacionNumber('t1');
    expect(result).toBe('COT-005');
  });

  it('pads number to 3 digits', async () => {
    mockFromSequence(
      { data: { last_number: 11 } },
      { data: null },
    );
    const result = await nextCotizacionNumber('t1');
    expect(result).toBe('COT-012');
  });

  it('queries cotizacion_counter table', async () => {
    mockFromSequence(
      { data: null },
      { data: null },
    );
    await nextCotizacionNumber('t1');
    expect(mockFrom).toHaveBeenCalledWith('cotizacion_counter');
  });
});