import { vi, describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/app/lib/supabase';

vi.mock('@/app/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import {
  updateTrabajoPagos,
  updateTrabajoManoDeObraItems,
  updateTrabajoFactura,
  resetFacturacionTrabajo,
  updateVehiculo,
} from '@/app/lib/db';
import type { Pago, ManoDeObraItem } from '@/app/types';

const mockFrom = vi.mocked(supabase.from);

function mockUpdateEqChain(error: unknown = null) {
  const eq = vi.fn().mockResolvedValue({ error });
  const update = vi.fn().mockReturnValue({ eq });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom.mockReturnValue({ update } as any);
  return { update, eq };
}

beforeEach(() => { vi.clearAllMocks(); });

// updateTrabajoPagos

describe('updateTrabajoPagos', () => {
  const samplePagos: Pago[] = [
    { fecha: '2026-07-01', monto: 500, metodo: 'efectivo', notas: null },
    { fecha: '2026-07-05', monto: 300, metodo: 'transferencia', notas: 'pendiente' },
  ];

  it('resolves without throwing on success', async () => {
    mockUpdateEqChain(null);
    await expect(updateTrabajoPagos('trabajo-1', samplePagos)).resolves.toBeUndefined();
  });

  it('throws with prefixed message when Supabase returns an error', async () => {
    mockUpdateEqChain({ message: 'row not found', code: 'PGRST116' });
    await expect(updateTrabajoPagos('trabajo-1', samplePagos)).rejects.toThrow('updateTrabajoPagos: row not found');
  });

  it('queries the trabajos table', async () => {
    mockUpdateEqChain(null);
    await updateTrabajoPagos('trabajo-1', samplePagos);
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
  });

  it('passes the pagos array to Supabase update', async () => {
    const { update } = mockUpdateEqChain(null);
    await updateTrabajoPagos('trabajo-1', samplePagos);
    expect(update).toHaveBeenCalledWith({ pagos: samplePagos });
  });

  it('filters by trabajo id', async () => {
    const { eq } = mockUpdateEqChain(null);
    await updateTrabajoPagos('trabajo-xyz', samplePagos);
    expect(eq).toHaveBeenCalledWith('id', 'trabajo-xyz');
  });

  it('works with an empty pagos array (clear all payments)', async () => {
    mockUpdateEqChain(null);
    await expect(updateTrabajoPagos('trabajo-1', [])).resolves.toBeUndefined();
  });
});

// updateTrabajoManoDeObraItems

describe('updateTrabajoManoDeObraItems', () => {
  const sampleItems: ManoDeObraItem[] = [
    { descripcion: 'Cambio de aceite', precio: 200 },
    { descripcion: 'Alineacion', precio: 350 },
  ];

  it('resolves without throwing on success', async () => {
    mockUpdateEqChain(null);
    await expect(updateTrabajoManoDeObraItems('trabajo-1', sampleItems)).resolves.toBeUndefined();
  });

  it('throws with prefixed message when Supabase returns an error', async () => {
    mockUpdateEqChain({ message: 'trabajo not found', code: 'PGRST116' });
    await expect(updateTrabajoManoDeObraItems('trabajo-1', sampleItems)).rejects.toThrow('updateTrabajoManoDeObraItems: trabajo not found');
  });

  it('queries the trabajos table', async () => {
    mockUpdateEqChain(null);
    await updateTrabajoManoDeObraItems('trabajo-1', sampleItems);
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
  });

  it('calculates total mano_de_obra as sum of item precios', async () => {
    const { update } = mockUpdateEqChain(null);
    await updateTrabajoManoDeObraItems('trabajo-1', sampleItems);
    const arg = update.mock.calls[0][0];
    expect(arg.mano_de_obra).toBe(550); // 200 + 350
  });

  it('persists mano_de_obra_items array unchanged to Supabase', async () => {
    const { update } = mockUpdateEqChain(null);
    await updateTrabajoManoDeObraItems('trabajo-1', sampleItems);
    const arg = update.mock.calls[0][0];
    expect(arg.mano_de_obra_items).toEqual(sampleItems);
  });

  it('filters by trabajo id', async () => {
    const { eq } = mockUpdateEqChain(null);
    await updateTrabajoManoDeObraItems('trabajo-abc', sampleItems);
    expect(eq).toHaveBeenCalledWith('id', 'trabajo-abc');
  });

  it('sets mano_de_obra to 0 for empty items array', async () => {
    const { update } = mockUpdateEqChain(null);
    await updateTrabajoManoDeObraItems('trabajo-1', []);
    const arg = update.mock.calls[0][0];
    expect(arg.mano_de_obra).toBe(0);
  });

  it('handles single item correctly', async () => {
    const { update } = mockUpdateEqChain(null);
    const single: ManoDeObraItem[] = [{ descripcion: 'Diagnostico', precio: 150 }];
    await updateTrabajoManoDeObraItems('trabajo-1', single);
    const arg = update.mock.calls[0][0];
    expect(arg.mano_de_obra).toBe(150);
    expect(arg.mano_de_obra_items).toHaveLength(1);
  });
});

// updateTrabajoFactura

describe('updateTrabajoFactura', () => {
  it('resolves without throwing on success', async () => {
    mockUpdateEqChain(null);
    await expect(updateTrabajoFactura('trabajo-1', 'factura-1')).resolves.toBeUndefined();
  });

  it('throws with prefixed message when Supabase returns an error', async () => {
    mockUpdateEqChain({ message: 'foreign key violation', code: '23503' });
    await expect(updateTrabajoFactura('trabajo-1', 'factura-bad')).rejects.toThrow('updateTrabajoFactura: foreign key violation');
  });

  it('queries the trabajos table', async () => {
    mockUpdateEqChain(null);
    await updateTrabajoFactura('trabajo-1', 'factura-1');
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
  });

  it('sets both factura_id and marks estado_facturacion as facturado', async () => {
    const { update } = mockUpdateEqChain(null);
    await updateTrabajoFactura('trabajo-1', 'factura-abc');
    expect(update).toHaveBeenCalledWith({
      factura_id: 'factura-abc',
      estado_facturacion: 'facturado',
    });
  });

  it('filters by trabajo id', async () => {
    const { eq } = mockUpdateEqChain(null);
    await updateTrabajoFactura('trabajo-xyz', 'factura-1');
    expect(eq).toHaveBeenCalledWith('id', 'trabajo-xyz');
  });
});

// resetFacturacionTrabajo

describe('resetFacturacionTrabajo', () => {
  it('resolves without throwing on success', async () => {
    mockUpdateEqChain(null);
    await expect(resetFacturacionTrabajo('trabajo-1')).resolves.toBeUndefined();
  });

  it('throws with prefixed message when Supabase returns an error', async () => {
    mockUpdateEqChain({ message: 'update failed', code: '42P01' });
    await expect(resetFacturacionTrabajo('trabajo-1')).rejects.toThrow('resetFacturacionTrabajo: update failed');
  });

  it('queries the trabajos table', async () => {
    mockUpdateEqChain(null);
    await resetFacturacionTrabajo('trabajo-1');
    expect(mockFrom).toHaveBeenCalledWith('trabajos');
  });

  it('clears factura_id (null) and resets estado_facturacion to sin_facturar', async () => {
    const { update } = mockUpdateEqChain(null);
    await resetFacturacionTrabajo('trabajo-1');
    expect(update).toHaveBeenCalledWith({
      factura_id: null,
      estado_facturacion: 'sin_facturar',
    });
  });

  it('filters by trabajo id', async () => {
    const { eq } = mockUpdateEqChain(null);
    await resetFacturacionTrabajo('trabajo-reset');
    expect(eq).toHaveBeenCalledWith('id', 'trabajo-reset');
  });

  it('is the inverse of updateTrabajoFactura (restores pre-facturacion state)', async () => {
    // Reset is always: factura_id = null, estado = sin_facturar — no matter what was set before
    const { update } = mockUpdateEqChain(null);
    await resetFacturacionTrabajo('any-trabajo');
    const arg = update.mock.calls[0][0];
    expect(arg.factura_id).toBeNull();
    expect(arg.estado_facturacion).toBe('sin_facturar');
  });
});

// updateVehiculo

describe('updateVehiculo', () => {
  const vehicleData = {
    marca: 'Toyota',
    modelo: 'Hilux',
    anio: 2020,
    placa: 'ABC-123',
  };

  it('resolves without throwing on success', async () => {
    mockUpdateEqChain(null);
    await expect(updateVehiculo('vehiculo-1', vehicleData)).resolves.toBeUndefined();
  });

  it('throws when Supabase returns an error', async () => {
    mockUpdateEqChain({ message: 'vehiculo not found', code: 'PGRST116' });
    await expect(updateVehiculo('vehiculo-1', vehicleData)).rejects.toThrow('vehiculo not found');
  });

  it('queries the vehiculos table', async () => {
    mockUpdateEqChain(null);
    await updateVehiculo('vehiculo-1', vehicleData);
    expect(mockFrom).toHaveBeenCalledWith('vehiculos');
  });

  it('updates all four vehicle fields: marca, modelo, anio, placa', async () => {
    const { update } = mockUpdateEqChain(null);
    await updateVehiculo('vehiculo-1', vehicleData);
    expect(update).toHaveBeenCalledWith({
      marca: 'Toyota',
      modelo: 'Hilux',
      anio: 2020,
      placa: 'ABC-123',
    });
  });

  it('filters by vehiculo id', async () => {
    const { eq } = mockUpdateEqChain(null);
    await updateVehiculo('vehiculo-xyz', vehicleData);
    expect(eq).toHaveBeenCalledWith('id', 'vehiculo-xyz');
  });

  it('uses the provided vehiculoId, not a hardcoded one (prevents cross-client edits)', async () => {
    const { eq } = mockUpdateEqChain(null);
    await updateVehiculo('vehiculo-diferente', vehicleData);
    expect(eq).toHaveBeenCalledWith('id', 'vehiculo-diferente');
  });

  it('handles numeric anio correctly (not a string)', async () => {
    const { update } = mockUpdateEqChain(null);
    await updateVehiculo('vehiculo-1', { ...vehicleData, anio: 1998 });
    const arg = update.mock.calls[0][0];
    expect(typeof arg.anio).toBe('number');
    expect(arg.anio).toBe(1998);
  });
});
