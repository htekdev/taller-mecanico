/**
 * Data Access Layer — Supabase
 *
 * Maps between Supabase row types (snake_case) and app types (camelCase).
 * All operations are scoped to a specific taller_id.
 */

import { supabase } from '@/app/lib/supabase';
import type {
  Cliente, Vehiculo, Refaccion, Trabajo, Proveedor,
  OrdenCompra, Factura, TrabajoRefaccion, ManoDeObraItem,
  Pago, PagoCompra, PagoFactura, FacturaConcepto, CompraItem,
} from '@/app/types';

// ── Clientes ──────────────────────────────────────────────────

export async function getClientes(tallerId: string): Promise<Cliente[]> {
  const { data } = await supabase
    .from('clientes')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  return (data ?? []).map(r => ({ id: r.id, nombre: r.nombre, telefono: r.telefono }));
}

export async function insertCliente(tallerId: string, data: Omit<Cliente, 'id'>): Promise<Cliente | null> {
  const { data: row, error } = await supabase
    .from('clientes')
    .insert({ taller_id: tallerId, nombre: data.nombre, telefono: data.telefono })
    .select()
    .single();

  if (error || !row) return null;
  return { id: row.id, nombre: row.nombre, telefono: row.telefono };
}

// ── Vehículos ────────────────────────────────────────────────

export async function getVehiculos(tallerId: string): Promise<Vehiculo[]> {
  const { data } = await supabase
    .from('vehiculos')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  return (data ?? []).map(r => ({
    id: r.id, clienteId: r.cliente_id ?? '',
    marca: r.marca, modelo: r.modelo, anio: r.anio, placa: r.placa,
  }));
}

export async function insertVehiculo(tallerId: string, data: Omit<Vehiculo, 'id'>): Promise<Vehiculo | null> {
  const { data: row, error } = await supabase
    .from('vehiculos')
    .insert({ taller_id: tallerId, cliente_id: data.clienteId || null, marca: data.marca, modelo: data.modelo, anio: data.anio, placa: data.placa })
    .select()
    .single();

  if (error || !row) return null;
  return { id: row.id, clienteId: row.cliente_id ?? '', marca: row.marca, modelo: row.modelo, anio: row.anio, placa: row.placa };
}

// ── Refacciones ───────────────────────────────────────────────

export async function getRefacciones(tallerId: string): Promise<Refaccion[]> {
  const { data } = await supabase
    .from('refacciones')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  return (data ?? []).map(r => ({
    id: r.id, nombre: r.nombre, codigo: r.codigo, categoria: r.categoria,
    unidad: r.unidad, precioCompra: r.precio_compra,
    stock: r.stock, stockMinimo: r.stock_minimo,
    vehiculoId: r.vehiculo_id ?? undefined,
    proveedorId: r.proveedor_id ?? undefined,
    compatibilidad: (r.compatibilidad as Refaccion['compatibilidad']) ?? undefined,
  }));
}

export async function insertRefaccion(tallerId: string, data: Omit<Refaccion, 'id'>): Promise<Refaccion | null> {
  const { data: row, error } = await supabase
    .from('refacciones')
    .insert({
      taller_id: tallerId, nombre: data.nombre, codigo: data.codigo,
      categoria: data.categoria, unidad: data.unidad,
      precio_compra: data.precioCompra, stock: data.stock,
      stock_minimo: data.stockMinimo,
      vehiculo_id: data.vehiculoId ?? null,
      proveedor_id: data.proveedorId ?? null,
      compatibilidad: data.compatibilidad ?? null,
    })
    .select()
    .single();

  if (error || !row) return null;
  return {
    id: row.id, nombre: row.nombre, codigo: row.codigo, categoria: row.categoria,
    unidad: row.unidad, precioCompra: row.precio_compra,
    stock: row.stock, stockMinimo: row.stock_minimo,
  };
}

export async function updateRefaccionStock(id: string, nuevoStock: number): Promise<void> {
  await supabase.from('refacciones').update({ stock: nuevoStock }).eq('id', id);
}

export async function updateRefaccionCompatibilidad(id: string, compatibilidad: Refaccion['compatibilidad'] | null): Promise<void> {
  await supabase.from('refacciones').update({ compatibilidad: compatibilidad ?? null }).eq('id', id);
}

export async function updateRefacciones(items: Refaccion[]): Promise<void> {
  // Batch update stocks after a work order
  for (const r of items) {
    await supabase.from('refacciones').update({ stock: r.stock }).eq('id', r.id);
  }
}

// ── Proveedores ───────────────────────────────────────────────

export async function getProveedores(tallerId: string): Promise<Proveedor[]> {
  const { data } = await supabase
    .from('proveedores')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  return (data ?? []).map(r => ({
    id: r.id, nombre: r.nombre, telefono: r.telefono,
    contacto: r.contacto ?? undefined, notas: r.notas ?? undefined,
  }));
}

export async function insertProveedor(tallerId: string, data: Omit<Proveedor, 'id'>): Promise<Proveedor | null> {
  const { data: row, error } = await supabase
    .from('proveedores')
    .insert({
      taller_id: tallerId, nombre: data.nombre, telefono: data.telefono,
      contacto: data.contacto ?? null, notas: data.notas ?? null,
    })
    .select()
    .single();

  if (error || !row) return null;
  return { id: row.id, nombre: row.nombre, telefono: row.telefono, contacto: row.contacto ?? undefined, notas: row.notas ?? undefined };
}

// ── Trabajos ──────────────────────────────────────────────────

export async function getTrabajos(tallerId: string): Promise<Trabajo[]> {
  const { data } = await supabase
    .from('trabajos')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  return (data ?? []).map(r => ({
    id: r.id,
    clienteId: r.cliente_id ?? '',
    vehiculoId: r.vehiculo_id ?? '',
    fecha: r.fecha,
    descripcion: r.descripcion,
    manoDeObra: Number(r.mano_de_obra),
    manoDeObraItems: (r.mano_de_obra_items as ManoDeObraItem[]) ?? [],
    refacciones: Number(r.refacciones_total),
    costoRefacciones: Number(r.costo_refacciones),
    requiereFactura: r.requiere_factura,
    folioFiscal: r.folio_fiscal ?? undefined,
    iva: Number(r.iva),
    total: Number(r.total),
    partes: (r.partes as TrabajoRefaccion[]) ?? [],
    pagos: (r.pagos as Pago[]) ?? [],
    facturaId: r.factura_id ?? undefined,
    estadoFacturacion: r.estado_facturacion,
    estado: r.estado,
  }));
}

export async function insertTrabajo(tallerId: string, data: Omit<Trabajo, 'id'>): Promise<Trabajo | null> {
  const { data: row, error } = await supabase
    .from('trabajos')
    .insert({
      taller_id: tallerId,
      cliente_id: data.clienteId || null,
      vehiculo_id: data.vehiculoId || null,
      fecha: data.fecha,
      descripcion: data.descripcion,
      mano_de_obra: data.manoDeObra,
      mano_de_obra_items: data.manoDeObraItems,
      refacciones_total: data.refacciones,
      costo_refacciones: data.costoRefacciones,
      requiere_factura: data.requiereFactura,
      folio_fiscal: data.folioFiscal ?? null,
      iva: data.iva,
      total: data.total,
      partes: data.partes,
      pagos: data.pagos,
      factura_id: data.facturaId ?? null,
      estado_facturacion: data.estadoFacturacion,
      estado: data.estado,
    })
    .select()
    .single();

  if (error || !row) { console.error('insertTrabajo error:', error); return null; }
  return {
    id: row.id, clienteId: row.cliente_id ?? '', vehiculoId: row.vehiculo_id ?? '',
    fecha: row.fecha, descripcion: row.descripcion, manoDeObra: Number(row.mano_de_obra),
    manoDeObraItems: (row.mano_de_obra_items as ManoDeObraItem[]) ?? [],
    refacciones: Number(row.refacciones_total), costoRefacciones: Number(row.costo_refacciones),
    requiereFactura: row.requiere_factura, iva: Number(row.iva), total: Number(row.total),
    partes: (row.partes as TrabajoRefaccion[]) ?? [], pagos: (row.pagos as Pago[]) ?? [],
    estadoFacturacion: row.estado_facturacion, estado: row.estado,
  };
}

export async function updateTrabajoPagos(trabajoId: string, pagos: Pago[]): Promise<void> {
  await supabase.from('trabajos').update({ pagos }).eq('id', trabajoId);
}

export async function updateTrabajoFactura(trabajoId: string, facturaId: string): Promise<void> {
  await supabase.from('trabajos').update({ factura_id: facturaId, estado_facturacion: 'facturado' }).eq('id', trabajoId);
}

// ── Órdenes de Compra ─────────────────────────────────────────

export async function getOrdenes(tallerId: string): Promise<OrdenCompra[]> {
  const { data } = await supabase
    .from('ordenes_compra')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  return (data ?? []).map(r => ({
    id: r.id,
    proveedorId: r.proveedor_id ?? '',
    fecha: r.fecha,
    numeroOrden: r.numero_orden ?? undefined,
    descripcion: r.descripcion,
    partes: (r.partes as CompraItem[]) ?? [],
    total: Number(r.total),
    estado: r.estado,
    fechaRecibida: r.fecha_recibida ?? undefined,
    pagos: (r.pagos as PagoCompra[]) ?? [],
  }));
}

export async function insertOrden(tallerId: string, data: Omit<OrdenCompra, 'id' | 'estado' | 'fechaRecibida' | 'pagos'>): Promise<OrdenCompra | null> {
  const { data: row, error } = await supabase
    .from('ordenes_compra')
    .insert({
      taller_id: tallerId,
      proveedor_id: data.proveedorId || null,
      fecha: data.fecha,
      numero_orden: data.numeroOrden ?? null,
      descripcion: data.descripcion,
      partes: data.partes,
      total: data.total,
      estado: 'pendiente',
      pagos: [],
    })
    .select()
    .single();

  if (error || !row) return null;
  return {
    id: row.id, proveedorId: row.proveedor_id ?? '', fecha: row.fecha,
    numeroOrden: row.numero_orden ?? undefined, descripcion: row.descripcion,
    partes: (row.partes as CompraItem[]) ?? [], total: Number(row.total),
    estado: row.estado, pagos: [],
  };
}

export async function updateOrdenEstado(ordenId: string, estado: 'recibida' | 'cancelada', fechaRecibida?: string): Promise<void> {
  await supabase.from('ordenes_compra').update({
    estado,
    ...(fechaRecibida ? { fecha_recibida: fechaRecibida } : {}),
  }).eq('id', ordenId);
}

export async function updateOrdenPagos(ordenId: string, pagos: PagoCompra[]): Promise<void> {
  await supabase.from('ordenes_compra').update({ pagos }).eq('id', ordenId);
}

// ── Facturas ──────────────────────────────────────────────────

export async function getFacturas(tallerId: string): Promise<Factura[]> {
  const { data } = await supabase
    .from('facturas')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  return (data ?? []).map(r => ({
    id: r.id,
    numeroFactura: r.numero_factura ?? '',
    trabajoId: r.trabajo_id ?? '',
    clienteId: r.cliente_id ?? '',
    vehiculoId: r.vehiculo_id ?? '',
    fecha: r.fecha,
    fechaVencimiento: r.fecha_vencimiento ?? undefined,
    conceptos: (r.conceptos as FacturaConcepto[]) ?? [],
    subtotal: Number(r.subtotal),
    iva: r.iva != null ? Number(r.iva) : undefined,
    total: Number(r.total),
    pagos: (r.pagos as PagoFactura[]) ?? [],
    notas: r.notas ?? undefined,
  }));
}

export async function insertFactura(tallerId: string, data: Omit<Factura, 'id'>): Promise<Factura | null> {
  const { data: row, error } = await supabase
    .from('facturas')
    .insert({
      taller_id: tallerId,
      numero_factura: data.numeroFactura,
      trabajo_id: data.trabajoId || null,
      cliente_id: data.clienteId || null,
      vehiculo_id: data.vehiculoId || null,
      fecha: data.fecha,
      fecha_vencimiento: data.fechaVencimiento ?? null,
      conceptos: data.conceptos,
      subtotal: data.subtotal,
      iva: data.iva ?? null,
      total: data.total,
      pagos: data.pagos,
      notas: data.notas ?? null,
    })
    .select()
    .single();

  if (error || !row) return null;
  return {
    id: row.id, numeroFactura: row.numero_factura ?? '',
    trabajoId: row.trabajo_id ?? '', clienteId: row.cliente_id ?? '',
    vehiculoId: row.vehiculo_id ?? '', fecha: row.fecha,
    conceptos: (row.conceptos as FacturaConcepto[]) ?? [],
    subtotal: Number(row.subtotal), total: Number(row.total),
    pagos: (row.pagos as PagoFactura[]) ?? [],
  };
}

export async function updateFacturaPagos(facturaId: string, pagos: PagoFactura[]): Promise<void> {
  await supabase.from('facturas').update({ pagos }).eq('id', facturaId);
}
