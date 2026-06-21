import { vi, describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/app/lib/supabase';

// Mock Supabase before importing db functions
vi.mock('@/app/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import {
  getClientes, insertCliente,
  getVehiculos, insertVehiculo,
  getRefacciones, insertRefaccion, updateRefaccionStock, updateRefaccionCompatibilidad,
  getTrabajos, insertTrabajo, updateTrabajoPagos, updateTrabajoFactura,
  getOrdenes, updateOrdenEstado, updateOrdenPagos,
  getFacturas, updateFacturaPagos,
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
  it('returns null on error', async () => {
    mockInsertChain(null, { message: 'error' });
    const result = await insertRefaccion('t1', { nombre: 'Filtro', codigo: 'F001', categoria: 'Filtros', unidad: 'pza', precioCompra: 100, stock: 5, stockMinimo: 1 });
    expect(result).toBeNull();
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

describe('insertTrabajo', () => {
  it('returns null and logs error on failure', async () => {
    mockInsertChain(null, { message: 'DB error' });
    const result = await insertTrabajo('t1', {
      clienteId: 'c1', vehiculoId: 'v1', fecha: '2026-06-01', descripcion: 'Test',
      manoDeObra: 200, manoDeObraItems: [], refacciones: 0, costoRefacciones: 0,
      requiereFactura: false, iva: 0, total: 200, partes: [], pagos: [],
      estadoFacturacion: 'sin_facturar', estado: 'pendiente',
    });
    expect(result).toBeNull();
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