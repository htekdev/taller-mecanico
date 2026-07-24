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
  Gasto, GastoCategoria,
} from '@/app/types';

// ── Clientes ──────────────────────────────────────────────────

export async function getClientes(tallerId: string): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('[getClientes] ' + error.message);
  return (data ?? []).map(r => ({
    id: r.id,
    nombre: r.nombre,
    telefono: r.telefono ?? undefined,
    email: r.email ?? undefined,
    email2: r.email2 ?? undefined,
  }));
}

export async function insertCliente(tallerId: string, data: Omit<Cliente, 'id'>): Promise<Cliente | null> {
  const { data: row, error } = await supabase
    .from('clientes')
    .insert({
      taller_id: tallerId,
      nombre: data.nombre,
      telefono: data.telefono ?? '',
      email: data.email ?? null,
      email2: data.email2 ?? null,
    })
    .select()
    .single();

  if (error || !row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono ?? undefined,
    email: row.email ?? undefined,
    email2: row.email2 ?? undefined,
  };
}

export async function updateCliente(clienteId: string, data: Omit<Cliente, 'id'>): Promise<Cliente | null> {
  const { data: row, error } = await supabase
    .from('clientes')
    .update({
      nombre: data.nombre,
      telefono: data.telefono ?? '',
      email: data.email ?? null,
      email2: data.email2 ?? null,
    })
    .eq('id', clienteId)
    .select()
    .single();

  if (error || !row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono ?? undefined,
    email: row.email ?? undefined,
    email2: row.email2 ?? undefined,
  };
}

// ── Vehículos ────────────────────────────────────────────────

export async function getVehiculos(tallerId: string): Promise<Vehiculo[]> {
  const { data, error } = await supabase
    .from('vehiculos')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('[getVehiculos] ' + error.message);
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

export async function updateVehiculo(vehiculoId: string, data: Pick<Vehiculo, 'marca' | 'modelo' | 'anio' | 'placa'>): Promise<void> {
  const { error } = await supabase
    .from('vehiculos')
    .update({ marca: data.marca, modelo: data.modelo, anio: data.anio, placa: data.placa })
    .eq('id', vehiculoId);
  if (error) throw new Error(error.message);
}

// ── Refacciones ───────────────────────────────────────────────

export async function getRefacciones(tallerId: string): Promise<Refaccion[]> {
  const { data, error } = await supabase
    .from('refacciones')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('[getRefacciones] ' + error.message);
  return (data ?? []).map(r => ({
    id: r.id, nombre: r.nombre, codigo: r.codigo, categoria: r.categoria,
    unidad: r.unidad, precioCompra: r.precio_compra,
    stock: r.stock, stockMinimo: r.stock_minimo,
    vehiculoId: r.vehiculo_id ?? undefined,
    proveedorId: r.proveedor_id ?? undefined,
    compatibilidad: (r.compatibilidad as Refaccion['compatibilidad']) ?? undefined,
  }));
}

export async function insertRefaccion(tallerId: string, data: Omit<Refaccion, 'id'>): Promise<Refaccion> {
  const { data: row, error } = await supabase
    .from('refacciones')
    .insert({
      taller_id: tallerId, nombre: data.nombre, codigo: data.codigo,
      categoria: data.categoria, unidad: data.unidad,
      precio_compra: data.precioCompra, stock: data.stock,
      stock_minimo: data.stockMinimo,
      vehiculo_id:  data.vehiculoId  || null,  // empty string → null for UUID column
      proveedor_id: data.proveedorId || null,  // empty string → null for UUID column
      compatibilidad: data.compatibilidad ?? null,
    })
    .select()
    .single();

  if (error || !row) throw new Error(`insertRefaccion: ${error?.message ?? 'no row returned'}`);
  return {
    id: row.id, nombre: row.nombre, codigo: row.codigo, categoria: row.categoria,
    unidad: row.unidad, precioCompra: row.precio_compra,
    stock: row.stock, stockMinimo: row.stock_minimo,
  };
}

export async function updateRefaccionStock(id: string, nuevoStock: number): Promise<void> {
  const { error } = await supabase.from('refacciones').update({ stock: nuevoStock }).eq('id', id);
  if (error) throw new Error('updateRefaccionStock: ' + error.message);
}

export async function updateRefaccionCompatibilidad(id: string, compatibilidad: Refaccion['compatibilidad'] | null): Promise<void> {
  const { error } = await supabase.from('refacciones').update({ compatibilidad: compatibilidad ?? null }).eq('id', id);
  if (error) throw new Error('updateRefaccionCompatibilidad: ' + error.message);
}

/** Update nombre and/or precioCompra on an inventory record — used when correcting a received purchase order. */
export async function updateRefaccionDetalles(
  id: string,
  data: { nombre?: string; precioCompra?: number },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (data.nombre !== undefined) patch.nombre = data.nombre;
  if (data.precioCompra !== undefined) patch.precio_compra = data.precioCompra;
  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('refacciones').update(patch).eq('id', id);
    if (error) throw new Error('updateRefaccionDetalles: ' + error.message);
  }
}

export async function updateRefacciones(items: Refaccion[]): Promise<void> {
  // Batch update stocks after a work order
  for (const r of items) {
    const { error } = await supabase.from('refacciones').update({ stock: r.stock }).eq('id', r.id);
    if (error) throw new Error('updateRefacciones (id=' + r.id + '): ' + error.message);
  }
}

export async function deleteRefaccion(tallerId: string, id: string): Promise<void> {
  const { error } = await supabase.from('refacciones').delete().eq('id', id).eq('taller_id', tallerId);
  if (error) throw new Error(`deleteRefaccion: ${error.message}`);
}


export async function updateRefaccionProveedor(id: string, proveedorId: string | null): Promise<void> {
  const { error } = await supabase
    .from('refacciones')
    .update({ proveedor_id: proveedorId || null })
    .eq('id', id);
  if (error) throw new Error('updateRefaccionProveedor: ' + error.message);
}
// ── Proveedores ───────────────────────────────────────────────

export async function getProveedores(tallerId: string): Promise<Proveedor[]> {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('[getProveedores] ' + error.message);
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
  const { data, error } = await supabase
    .from('trabajos')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('[getTrabajos] ' + error.message);
  return (data ?? []).map(r => ({
    id: r.id,
    clienteId: r.cliente_id ?? '',
    vehiculoId: r.vehiculo_id ?? '',
    fecha: r.fecha,
    descripcion: r.descripcion,
    numeroOrden: r.numero_orden ?? undefined,
    kilometraje: r.kilometraje ?? undefined,
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
    tipoDocumento: (r.tipo_documento as Trabajo['tipoDocumento']) ?? undefined,
    fechaFinalizacion: r.fecha_finalizacion ?? undefined,
    tipoCliente: (r.tipo_cliente as Trabajo['tipoCliente']) ?? 'general',
    departamento: r.departamento ?? undefined,
    inventarioNum: r.inventario_num ?? undefined,
    ordenServicioGob: r.orden_servicio_gob ?? undefined,
    tftNumero: r.tft_numero ?? undefined,
    tftEstado: (r.tft_estado as Trabajo['tftEstado']) ?? 'sin_tft',
    fechaEntrada: r.fecha_entrada ?? undefined,
    fechaSalida: r.fecha_salida ?? undefined,
    pendienteRefacciones: r.pendiente_refacciones ?? false,
    refaccionesPendientesNombres: (r.refacciones_pendientes_nombres as string[]) ?? [],
  }));
}

/** Build the core payload for inserting a Trabajo row.
 *  New columns (kilometraje, numero_orden) are sent only when provided
 *  so that the INSERT succeeds even if a migration hasn't been applied yet. */
function buildInsertTrabajoPayload(tallerId: string, data: Omit<Trabajo, 'id'>) {
  return {
    taller_id: tallerId,
    cliente_id: data.clienteId || null,
    vehiculo_id: data.vehiculoId || null,
    fecha: data.fecha,
    descripcion: data.descripcion,
    // New optional columns — only include when the user actually supplied a non-empty value
    // so the INSERT never fails with "column not found" on an older DB schema.
    // NOTE: emptyForm uses '' (empty string) for unset fields — handleSubmit converts to undefined,
    // but the extra guard here adds a safety layer.
    ...(data.kilometraje !== undefined && data.kilometraje !== null ? { kilometraje: data.kilometraje } : {}),
    ...(data.numeroOrden ? { numero_orden: data.numeroOrden } : {}),
    // Migration 005 columns — only include when explicitly set (not empty string defaults)
    ...(data.tipoCliente === 'ayuntamiento' ? { tipo_cliente: 'ayuntamiento' } : {}),
    ...(data.departamento ? { departamento: data.departamento } : {}),
    ...(data.inventarioNum ? { inventario_num: data.inventarioNum } : {}),
    ...(data.ordenServicioGob ? { orden_servicio_gob: data.ordenServicioGob } : {}),
    ...(data.tftNumero ? { tft_numero: data.tftNumero } : {}),
    // 'sin_tft' is the default sentinel — omit from payload; DB returns NULL → reads as 'sin_tft'
    ...(data.tftEstado && data.tftEstado !== 'sin_tft' ? { tft_estado: data.tftEstado } : {}),
    ...(data.fechaEntrada ? { fecha_entrada: data.fechaEntrada } : {}),
    ...(data.fechaSalida ? { fecha_salida: data.fechaSalida } : {}),
    // Migration 20260626150000 columns
    ...(data.pendienteRefacciones ? { pendiente_refacciones: data.pendienteRefacciones } : {}),
    ...(data.refaccionesPendientesNombres?.length ? { refacciones_pendientes_nombres: data.refaccionesPendientesNombres } : {}),
    mano_de_obra: data.manoDeObra,
    mano_de_obra_items: data.manoDeObraItems,
    refacciones_total: data.refacciones,
    costo_refacciones: data.costoRefacciones,
    requiere_factura: data.requiereFactura,
    folio_fiscal: data.folioFiscal ?? null,
    factura_pdf_url: data.facturaPdfUrl ?? null,
    iva: data.iva,
    total: data.total,
    partes: data.partes,
    pagos: data.pagos,
    factura_id: data.facturaId ?? null,
    estado_facturacion: data.estadoFacturacion,
    estado: data.estado,
  };
}

/** Map a raw Supabase trabajos row to the Trabajo type */
function mapTrabajoRow(row: Record<string, unknown>): Trabajo {
  return {
    id: row.id as string,
    clienteId: (row.cliente_id as string) ?? '',
    vehiculoId: (row.vehiculo_id as string) ?? '',
    fecha: row.fecha as string,
    descripcion: row.descripcion as string,
    numeroOrden: (row.numero_orden as string | null) ?? undefined,
    kilometraje: row.kilometraje != null ? Number(row.kilometraje) : undefined,
    tipoCliente: (row.tipo_cliente as Trabajo['tipoCliente']) ?? 'general',
    departamento: (row.departamento as string | null) ?? undefined,
    inventarioNum: (row.inventario_num as string | null) ?? undefined,
    ordenServicioGob: (row.orden_servicio_gob as string | null) ?? undefined,
    tftNumero: (row.tft_numero as string | null) ?? undefined,
    tftEstado: (row.tft_estado as Trabajo['tftEstado']) ?? 'sin_tft',
    fechaEntrada: (row.fecha_entrada as string | null) ?? undefined,
    fechaSalida: (row.fecha_salida as string | null) ?? undefined,
    pendienteRefacciones: (row.pendiente_refacciones as boolean | null) ?? false,
    refaccionesPendientesNombres: (row.refacciones_pendientes_nombres as string[]) ?? [],
    manoDeObra: Number(row.mano_de_obra),
    manoDeObraItems: (row.mano_de_obra_items as ManoDeObraItem[]) ?? [],
    refacciones: Number(row.refacciones_total),
    costoRefacciones: Number(row.costo_refacciones),
    requiereFactura: row.requiere_factura as boolean,
    folioFiscal: (row.folio_fiscal as string | null) ?? undefined,
    iva: Number(row.iva),
    total: Number(row.total),
    partes: (row.partes as TrabajoRefaccion[]) ?? [],
    pagos: (row.pagos as Pago[]) ?? [],
    facturaId: (row.factura_id as string | null) ?? undefined,
    tipoDocumento: (row.tipo_documento as Trabajo['tipoDocumento']) ?? undefined,
    fechaFinalizacion: (row.fecha_finalizacion as string | null) ?? undefined,
    estadoFacturacion: row.estado_facturacion as Trabajo['estadoFacturacion'],
    facturaPdfUrl: (row.factura_pdf_url as string | null) ?? undefined,
    estado: row.estado as Trabajo['estado'],
  };
}

export async function insertTrabajo(tallerId: string, data: Omit<Trabajo, 'id'>): Promise<Trabajo | null> {
  const payload = buildInsertTrabajoPayload(tallerId, data);
  const { data: row, error } = await supabase
    .from('trabajos')
    .insert(payload)
    .select()
    .single();

  // Fallback: if any new optional column doesn't exist in DB yet, strip ALL migration-gated
  // columns and retry with just the core fields.
  // Accept both PostgreSQL '42703' and PostgREST 'PGRST204' (schema-cache miss, v12+).
  const isColumnMissingInsert = (code: string | undefined) =>
    code === '42703' || code === 'PGRST204';

  if (isColumnMissingInsert(error?.code)) {
    const {
      kilometraje: _km, numero_orden: _no,
      departamento: _dep, inventario_num: _inv, orden_servicio_gob: _osg,
      tft_numero: _tn, tft_estado: _te, tipo_cliente: _tc,
      fecha_entrada: _fe, fecha_salida: _fs,
      pendiente_refacciones: _pr, refacciones_pendientes_nombres: _rpn,
      ...corePayload
    } = payload as Record<string, unknown>;
    console.warn('[insertTrabajo] Columna no encontrada en DB — reintentando con campos core únicamente:', error.message);
    const { data: fallbackRow, error: fallbackError } = await supabase
      .from('trabajos')
      .insert(corePayload)
      .select()
      .single();
    if (fallbackError || !fallbackRow) {
      const msg = fallbackError?.message ?? 'Unknown Supabase error (fallback)';
      console.error('[insertTrabajo] FALLBACK FAILED:', msg, fallbackError);
      throw new Error(`insertTrabajo: ${msg}`);
    }
    // Preserve user-entered values that couldn't be saved to DB yet.
    // The fallback saved the job without new columns — reflect that in the returned object
    // so the UI shows what the user entered (not undefined) even though DB doesn't have them.
    const fallbackResult = mapTrabajoRow(fallbackRow as Record<string, unknown>);
    return {
      ...fallbackResult,
      numeroOrden: data.numeroOrden,
      kilometraje: data.kilometraje,
    };
  }

  if (error || !row) {
    const msg = error?.message ?? error?.details ?? 'Unknown Supabase error';
    console.error('[insertTrabajo] FAILED:', msg, error);
    throw new Error(`insertTrabajo: ${msg}`);
  }
  return mapTrabajoRow(row as Record<string, unknown>);
}

export async function updateTrabajoPagos(trabajoId: string, pagos: Pago[]): Promise<void> {
  const { error } = await supabase.from('trabajos').update({ pagos }).eq('id', trabajoId);
  if (error) throw new Error(`updateTrabajoPagos: ${error.message}`);
}

/** Update mano_de_obra_items JSONB — used when registering payments to external service providers */
export async function updateTrabajoManoDeObraItems(trabajoId: string, items: ManoDeObraItem[]): Promise<void> {
  const manoDeObra = items.reduce((s, i) => s + i.precio, 0);
  const { error } = await supabase.from('trabajos').update({
    mano_de_obra_items: items,
    mano_de_obra: manoDeObra,
  }).eq('id', trabajoId);
  if (error) throw new Error(`updateTrabajoManoDeObraItems: ${error.message}`);
}

export async function updateTrabajoFactura(trabajoId: string, facturaId: string): Promise<void> {
  const { error } = await supabase.from('trabajos').update({ factura_id: facturaId, estado_facturacion: 'facturado' }).eq('id', trabajoId);
  if (error) throw new Error(`updateTrabajoFactura: ${error.message}`);
}

/** Reset facturación — allows re-invoicing after a factura was cancelled */
export async function updateTrabajoFacturaPdf(trabajoId: string, url: string | null): Promise<void> {
  const { error } = await supabase.from('trabajos').update({ factura_pdf_url: url }).eq('id', trabajoId);
  if (error) throw new Error(`updateTrabajoFacturaPdf: ${error.message}`);
}
