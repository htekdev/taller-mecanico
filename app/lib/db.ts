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
  const { data } = await supabase
    .from('clientes')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

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

  if (error) console.error('[getRefacciones] Supabase error:', error.message, error.code);
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
export async function resetFacturacionTrabajo(trabajoId: string): Promise<void> {
  const { error } = await supabase.from('trabajos').update({ factura_id: null, estado_facturacion: 'sin_facturar' }).eq('id', trabajoId);
  if (error) throw new Error(`resetFacturacionTrabajo: ${error.message}`);
}

/** Editar trabajo pendiente — actualiza todos los campos en la DB */
export async function updateTrabajo(trabajoId: string, data: Trabajo): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    cliente_id: data.clienteId || null,
    vehiculo_id: data.vehiculoId || null,
    fecha: data.fecha,
    descripcion: data.descripcion,
    // New columns — always include them so explicit clears persist as NULL.
    // If production is missing these columns, the 42703 fallback strips them and retries.
    kilometraje: data.kilometraje ?? null,
    numero_orden: data.numeroOrden?.trim() || null,
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
    // Migration 20260626150000 columns — conditional
    ...(data.pendienteRefacciones ? { pendiente_refacciones: data.pendienteRefacciones } : {}),
    ...(data.refaccionesPendientesNombres?.length ? { refacciones_pendientes_nombres: data.refaccionesPendientesNombres } : {}),
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
  };

  const { error } = await supabase.from('trabajos').update(updatePayload).eq('id', trabajoId);

  // Fallback: if any new optional column doesn't exist in DB yet, strip ALL migration-gated
  // columns and retry with just the core fields.
  // Accept both PostgreSQL '42703' and PostgREST 'PGRST204' (schema-cache miss).
  const isColumnMissing = (code: string | undefined) =>
    code === '42703' || code === 'PGRST204';

  if (isColumnMissing(error?.code)) {
    const {
      kilometraje: _km, numero_orden: _no,
      departamento: _dep, inventario_num: _inv, orden_servicio_gob: _osg,
      tft_numero: _tn, tft_estado: _te, tipo_cliente: _tc,
      fecha_entrada: _fe, fecha_salida: _fs,
      pendiente_refacciones: _pr, refacciones_pendientes_nombres: _rpn,
      ...corePayload
    } = updatePayload as Record<string, unknown>;
    console.warn('[updateTrabajo] Columna no encontrada — reintentando con campos core únicamente:', error.message);
    const { error: fallbackError } = await supabase.from('trabajos').update(corePayload).eq('id', trabajoId);
    if (fallbackError) {
      console.error('[updateTrabajo] FALLBACK FAILED:', fallbackError.message, fallbackError);
      throw new Error(`updateTrabajo: ${fallbackError.message}`);
    }
    return;
  }

  if (error) {
    console.error('[updateTrabajo] FAILED:', error.message, error);
    throw new Error(`updateTrabajo: ${error.message}`);
  }
}

/** Finalizar trabajo — sets estado=completado, tipoDocumento, IVA, total, fechaFinalizacion
 *
 * Two-phase update to be robust against partially-migrated production schemas:
 *   Phase 1: Update the columns guaranteed to exist in all schema versions (estado, iva, total, requiere_factura).
 *            Throws on failure — this is the critical part.
 *   Phase 2: Update tipo_documento + fecha_finalizacion (added in migration 20260701220000).
 *            Truly best-effort: never throws. If columns are missing we silently succeed
 *            (estado=completado is already set in Phase 1 — the job IS finalized).
 *
 * WHY TWO ERROR CODES:
 *   When the column does not exist, PostgREST may return:
 *     • '42703' — PostgreSQL "undefined_column" code (passed through by older PostgREST)
 *     • 'PGRST204' — PostgREST schema-cache miss (newer PostgREST / Supabase)
 *   The old guard only checked '42703', causing Phase 2 to throw with 'PGRST204',
 *   which surfaced as "No se pudo finalizar el trabajo" even though Phase 1 succeeded.
 */
export async function updateTrabajoFinalizar(
  trabajoId: string,
  tipo: 'factura' | 'nota',
  iva: number,
  total: number,
): Promise<void> {
  // Phase 1 — critical columns (always exist)
  const { error: err1 } = await supabase.from('trabajos').update({
    estado: 'completado',
    requiere_factura: tipo === 'factura',
    iva,
    total,
  }).eq('id', trabajoId);
  if (err1) throw new Error(`updateTrabajoFinalizar (estado): ${err1.message}`);

  // Phase 2 — tipo_documento + fecha_finalizacion (added in migration 20260701220000)
  // Truly best-effort: swallow ALL column-not-found variants so the caller never
  // sees an error just because the migration hasn't run yet.
  const { error: err2 } = await supabase.from('trabajos').update({
    tipo_documento: tipo,
    fecha_finalizacion: new Date().toISOString(),
  }).eq('id', trabajoId);

  if (err2) {
    // Recognise every known "column does not exist" signal:
    //   '42703'    — PostgreSQL undefined_column (passed through by PostgREST ≤ v11)
    //   'PGRST204' — PostgREST schema-cache miss (PostgREST v12 / newer Supabase)
    //   message fallback — belt-and-suspenders for future PostgREST changes
    const isColumnMissing =
      err2.code === '42703' ||
      err2.code === 'PGRST204' ||
      (err2.message ?? '').toLowerCase().includes('does not exist') ||
      (err2.message ?? '').toLowerCase().includes('column');
    if (!isColumnMissing) {
      throw new Error(`updateTrabajoFinalizar (tipo_documento): ${err2.message}`);
    }
    // Column missing — silently succeed. Phase 1 already set estado=completado.
    console.warn('[updateTrabajoFinalizar] Phase 2 skipped (column missing):', err2.code, err2.message);
  }
}

export async function updateTrabajoTft(trabajoId: string, tftNumero: string): Promise<void> {
  const { error } = await supabase.from('trabajos').update({
    tft_numero: tftNumero,
    tft_estado: 'con_tft',
  }).eq('id', trabajoId);
  if (error) throw new Error(`updateTrabajoTft: ${error.message}`);
}

// ── Órdenes de Compra ─────────────────────────────────────────

export async function getOrdenes(tallerId: string): Promise<OrdenCompra[]> {
  const { data } = await supabase
    .from('ordenes_compra')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  return (data ?? []).map(r => {
    const conIVA = r.con_iva ?? false;
    const subtotalSinIVA = r.subtotal_sin_iva != null ? Number(r.subtotal_sin_iva) : Number(r.total) / (conIVA ? 1.16 : 1);
    const ivaAmount = r.iva_amount != null ? Number(r.iva_amount) : (conIVA ? Number(r.total) - subtotalSinIVA : 0);
    return {
      id: r.id,
      proveedorId: r.proveedor_id ?? '',
      fecha: r.fecha,
      numeroOrden: r.numero_orden ?? undefined,
      descripcion: r.descripcion,
      partes: (r.partes as CompraItem[]) ?? [],
      subtotalSinIVA: Math.round(subtotalSinIVA * 100) / 100,
      ivaAmount: Math.round(ivaAmount * 100) / 100,
      total: Number(r.total),
      conIVA,
      estado: r.estado,
      fechaRecibida: r.fecha_recibida ?? undefined,
      pagos: (r.pagos as PagoCompra[]) ?? [],
    };
  });
}

export async function insertOrden(tallerId: string, data: Omit<OrdenCompra, 'id' | 'estado' | 'fechaRecibida' | 'pagos'>): Promise<OrdenCompra | null> {
  // First attempt: insert with IVA columns (requires migration 20260624_email_clientes_iva_ordenes)
  const { data: row, error } = await supabase
    .from('ordenes_compra')
    .insert({
      taller_id: tallerId,
      proveedor_id: data.proveedorId || null,
      fecha: data.fecha,
      numero_orden: data.numeroOrden ?? null,
      descripcion: data.descripcion,
      partes: data.partes,
      subtotal_sin_iva: data.subtotalSinIVA,
      iva_amount: data.ivaAmount,
      total: data.total,
      con_iva: data.conIVA,
      estado: 'pendiente',
      pagos: [],
    })
    .select()
    .single();

  // Fallback: if IVA columns don't exist yet (column not found error), retry without them
  if (error) {
    const isColumnMissing = error.message?.includes('subtotal_sin_iva') ||
      error.message?.includes('iva_amount') || error.message?.includes('con_iva') ||
      error.code === '42703' || // PostgreSQL: undefined_column
      error.code === 'PGRST204'; // PostgREST v12: schema-cache miss
    if (isColumnMissing) {
      const { data: fallbackRow, error: fallbackError } = await supabase
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
      if (fallbackError || !fallbackRow) return null;
      return {
        id: fallbackRow.id,
        proveedorId: fallbackRow.proveedor_id ?? '',
        fecha: fallbackRow.fecha,
        numeroOrden: fallbackRow.numero_orden ?? undefined,
        descripcion: fallbackRow.descripcion,
        partes: (fallbackRow.partes as CompraItem[]) ?? [],
        subtotalSinIVA: data.subtotalSinIVA,
        ivaAmount: data.ivaAmount,
        total: Number(fallbackRow.total),
        conIVA: data.conIVA,
        estado: fallbackRow.estado,
        pagos: [],
      };
    }
    return null;
  }

  if (!row) return null;
  return {
    id: row.id,
    proveedorId: row.proveedor_id ?? '',
    fecha: row.fecha,
    numeroOrden: row.numero_orden ?? undefined,
    descripcion: row.descripcion,
    partes: (row.partes as CompraItem[]) ?? [],
    subtotalSinIVA: Number(row.subtotal_sin_iva ?? data.subtotalSinIVA),
    ivaAmount: Number(row.iva_amount ?? data.ivaAmount),
    total: Number(row.total),
    conIVA: row.con_iva ?? false,
    estado: row.estado,
    pagos: [],
  };
}

export async function updateOrdenEstado(ordenId: string, estado: 'recibida' | 'cancelada', fechaRecibida?: string): Promise<void> {
  const { error } = await supabase.from('ordenes_compra').update({
    estado,
    ...(fechaRecibida ? { fecha_recibida: fechaRecibida } : {}),
  }).eq('id', ordenId);
  if (error) throw new Error(`updateOrdenEstado: ${error.message}`);
}

export async function updateOrdenPagos(ordenId: string, pagos: PagoCompra[]): Promise<void> {
  const { error } = await supabase.from('ordenes_compra').update({ pagos }).eq('id', ordenId);
  if (error) throw new Error(`updateOrdenPagos: ${error.message}`);
}

/** Edit a pending purchase order — updates items, description, and totals.
 *  Only safe to call when orden.estado === 'pendiente'. */
export async function updateOrden(
  ordenId: string,
  data: Pick<OrdenCompra, 'descripcion' | 'numeroOrden' | 'partes' | 'subtotalSinIVA' | 'ivaAmount' | 'total' | 'conIVA'>,
): Promise<void> {
  const { error } = await supabase.from('ordenes_compra').update({
    descripcion: data.descripcion,
    numero_orden: data.numeroOrden ?? null,
    partes: data.partes,
    subtotal_sin_iva: data.subtotalSinIVA,
    iva_amount: data.ivaAmount,
    total: data.total,
    con_iva: data.conIVA,
  }).eq('id', ordenId);
  if (error) throw new Error(`updateOrden: ${error.message}`);
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
  const { error } = await supabase.from('facturas').update({ pagos }).eq('id', facturaId);
  if (error) throw new Error(`updateFacturaPagos: ${error.message}`);
}

export async function updateFacturaFecha(facturaId: string, fecha: string): Promise<void> {
  const { error } = await supabase.from('facturas').update({ fecha }).eq('id', facturaId);
  if (error) throw new Error(`updateFacturaFecha: ${error.message}`);
}

export async function updateFacturaNumero(facturaId: string, numeroFactura: string): Promise<void> {
  const { error } = await supabase.from('facturas').update({ numero_factura: numeroFactura }).eq('id', facturaId);
  if (error) throw new Error(`updateFacturaNumero: ${error.message}`);
}

export async function updateFacturaConceptos(
  facturaId: string,
  data: { conceptos: FacturaConcepto[]; subtotal: number; iva: number | undefined; total: number },
): Promise<void> {
  const { error } = await supabase.from('facturas').update({
    conceptos: data.conceptos,
    subtotal: data.subtotal,
    iva: data.iva ?? null,
    total: data.total,
  }).eq('id', facturaId);
  if (error) throw new Error(`updateFacturaConceptos: ${error.message}`);
}

/** Manual adjustment of factura totals + invoice number — used when Sofia corrects migrated data */
export async function updateFacturaTotales(
  facturaId: string,
  data: { subtotal: number; iva: number | undefined; total: number; numeroFactura: string },
): Promise<void> {
  const { error } = await supabase.from('facturas').update({
    subtotal: data.subtotal,
    iva: data.iva ?? null,
    total: data.total,
    numero_factura: data.numeroFactura,
  }).eq('id', facturaId);
  if (error) throw new Error(`updateFacturaTotales: ${error.message}`);
}

/** Update only iva + total on a trabajo — used to sync back when factura totals are manually adjusted */
export async function updateTrabajoTotales(
  trabajoId: string,
  data: { iva: number; total: number },
): Promise<void> {
  const { error } = await supabase.from('trabajos').update({ iva: data.iva, total: data.total }).eq('id', trabajoId);
  if (error) throw new Error(`updateTrabajoTotales: ${error.message}`);
}

// Cancellation conventions (no DB schema changes required):
// - Facturas: use notas='CANCELADA' (column already exists in facturas table).
// - Notas/trabajos sin factura: use folio_fiscal='__CANCELADA__' (column already exists in trabajos table).
// Both can be restored at any time via the reactivar* functions.
export async function cancelarFactura(facturaId: string): Promise<void> {
  const { error } = await supabase.from('facturas').update({ notas: 'CANCELADA' }).eq('id', facturaId);
  if (error) throw new Error(`cancelarFactura: ${error.message}`);
}

export async function reactivarFactura(facturaId: string): Promise<void> {
  const { error } = await supabase.from('facturas').update({ notas: null }).eq('id', facturaId);
  if (error) throw new Error(`reactivarFactura: ${error.message}`);
}

export async function cancelarNota(trabajoId: string): Promise<void> {
  const { error } = await supabase.from('trabajos').update({ folio_fiscal: '__CANCELADA__' }).eq('id', trabajoId);
  if (error) throw new Error(`cancelarNota: ${error.message}`);
}

export async function reactivarNota(trabajoId: string): Promise<void> {
  const { error } = await supabase.from('trabajos').update({ folio_fiscal: null }).eq('id', trabajoId);
  if (error) throw new Error(`reactivarNota: ${error.message}`);
}

// cancelarTrabajo / reactivarTrabajo — same convention, applies to ALL job types (not just notas)
export async function cancelarTrabajo(trabajoId: string): Promise<void> {
  const { error } = await supabase.from('trabajos').update({ folio_fiscal: '__CANCELADA__' }).eq('id', trabajoId);
  if (error) throw new Error('cancelarTrabajo: ' + error.message);
}

export async function reactivarTrabajo(trabajoId: string): Promise<void> {
  const { error } = await supabase.from('trabajos').update({ folio_fiscal: null }).eq('id', trabajoId);
  if (error) throw new Error('reactivarTrabajo: ' + error.message);
}

// ── Taller Members ────────────────────────────────────────────

export interface TallerMember {
  id: string;
  tallerId: string;
  userId: string;
  role: 'owner' | 'mechanic';
  email?: string;
  createdAt: string;
}

export async function getMembers(tallerId: string): Promise<TallerMember[]> {
  const { data } = await supabase
    .from('taller_members')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: true });

  return (data ?? []).map(r => ({
    id: r.id,
    tallerId: r.taller_id,
    userId: r.user_id,
    role: r.role,
    email: r.email ?? undefined,
    createdAt: r.created_at,
  }));
}

export async function updateMemberRole(
  memberId: string,
  tallerId: string,
  newRole: 'owner' | 'mechanic',
): Promise<boolean> {
  const { error } = await supabase
    .from('taller_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .eq('taller_id', tallerId);

  if (error) {
    console.warn('[updateMemberRole] failed:', error.code, error.message);
    return false;
  }
  return true;
}

// ── Taller Invites ────────────────────────────────────────────

export interface TallerInvite {
  id: string;
  tallerId: string;
  email: string;
  token: string;
  invitedBy: string | null;
  usedAt: string | null;
  createdAt: string;
}

export async function getInvites(tallerId: string): Promise<TallerInvite[]> {
  const { data } = await supabase
    .from('taller_invites')
    .select('*')
    .eq('taller_id', tallerId)
    .is('used_at', null)
    .order('created_at', { ascending: false });

  return (data ?? []).map(r => ({
    id: r.id,
    tallerId: r.taller_id,
    email: r.email,
    token: r.token,
    invitedBy: r.invited_by,
    usedAt: r.used_at,
    createdAt: r.created_at,
  }));
}

export async function sendInvite(tallerId: string, email: string, invitedBy: string): Promise<TallerInvite | null> {
  // Check if invite already exists for this email + taller (unused)
  const { data: existing } = await supabase
    .from('taller_invites')
    .select('id')
    .eq('taller_id', tallerId)
    .eq('email', email.toLowerCase())
    .is('used_at', null)
    .single();

  if (existing) {
    // Already has a pending invite — return it without creating duplicate
    return null;
  }

  const { data: row, error } = await supabase
    .from('taller_invites')
    .insert({
      taller_id: tallerId,
      email: email.toLowerCase(),
      invited_by: invitedBy,
    })
    .select()
    .single();

  if (error || !row) return null;
  return {
    id: row.id, tallerId: row.taller_id, email: row.email,
    token: row.token, invitedBy: row.invited_by, usedAt: row.used_at,
    createdAt: row.created_at,
  };
}

export async function cancelInvite(inviteId: string): Promise<void> {
  await supabase.from('taller_invites').delete().eq('id', inviteId);
}

/**
 * Check if a user email has pending invites and redeem ALL of them.
 * Called on every login (auth context) AND during setup for new users.
 * Returns the first redeemed taller_id, or null if no invites found.
 *
 * Handles multiple simultaneous invites (e.g. invited to 2 talleres before signing up).
 * Idempotent — safe to call multiple times; skips talleres the user already belongs to.
 *
 * REQUIRES Supabase RLS policies (migration 001_fix_invite_rls.sql):
 *   - "invitado_ver_su_invitacion": allows SELECT where lower(email) = lower(auth.email())
 *   - "invitado_redimir_invitacion": allows UPDATE where lower(email) = lower(auth.email())
 * Without these, a new user (not yet a taller member) cannot read their own invite.
 */
export async function redeemInvite(email: string, userId: string): Promise<string | null> {
  // Find ALL pending invites for this email (not yet used).
  // RLS policy "invitado_ver_su_invitacion" allows this even before the user is a member.
  const { data: invites, error: inviteErr } = await supabase
    .from('taller_invites')
    .select('*')
    .eq('email', email.toLowerCase())
    .is('used_at', null)
    .order('created_at', { ascending: false });

  if (inviteErr) {
    console.warn('[redeemInvite] invite lookup failed:', inviteErr.code, inviteErr.message);
    return null;
  }
  if (!invites || invites.length === 0) return null;

  let firstTallerId: string | null = null;
  const usedAt = new Date().toISOString();

  for (const invite of invites) {
    // Check if already a member (idempotent — safe to call multiple times)
    const { data: existing } = await supabase
      .from('taller_members')
      .select('id')
      .eq('taller_id', invite.taller_id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      // Add as mechanic member — core fields only (email column may not exist yet
      // if migration 002 hasn't been applied; we add it separately below)
      const { error: memberErr } = await supabase.from('taller_members').insert({
        taller_id: invite.taller_id,
        user_id: userId,
        role: 'mechanic',
      });
      if (memberErr) {
        console.warn('[redeemInvite] member insert failed:', memberErr.code, memberErr.message);
        continue; // skip this invite, try next
      }

      // Best-effort: store email for readable display (requires migration 002).
      // If column doesn't exist yet, this silently fails — no harm done.
      await supabase
        .from('taller_members')
        .update({ email: email.toLowerCase() })
        .eq('taller_id', invite.taller_id)
        .eq('user_id', userId);
    } else {
      // Member already exists — backfill email if missing (pre-migration 002 rows).
      await supabase
        .from('taller_members')
        .update({ email: email.toLowerCase() })
        .eq('taller_id', invite.taller_id)
        .eq('user_id', userId)
        .is('email', null);
    }

    // Mark invite as used (RLS "invitado_redimir_invitacion" allows this)
    await supabase
      .from('taller_invites')
      .update({ used_at: usedAt })
      .eq('id', invite.id);

    if (!firstTallerId) firstTallerId = invite.taller_id;
  }

  return firstTallerId;
}

// ── Gastos (Operating Expenses) ───────────────────────────────────────────────

function rowToGasto(r: Record<string, unknown>): Gasto {
  return {
    id:           r.id as string,
    tallerId:     r.taller_id as string,
    categoria:    r.categoria as GastoCategoria,
    subcategoria: r.subcategoria as string,
    concepto:     r.concepto as string,
    monto:        Number(r.monto),
    fecha:        r.fecha as string,
    notas:        (r.notas as string | null) ?? undefined,
  };
}

export async function getGastos(tallerId: string): Promise<Gasto[]> {
  const { data } = await supabase
    .from('gastos')
    .select('*')
    .eq('taller_id', tallerId)
    .order('fecha', { ascending: false });
  return (data ?? []).map(rowToGasto);
}

export async function insertGasto(
  tallerId: string,
  data: Omit<Gasto, 'id' | 'tallerId'>,
): Promise<Gasto> {
  const { data: row, error } = await supabase
    .from('gastos')
    .insert({
      taller_id:    tallerId,
      categoria:    data.categoria,
      subcategoria: data.subcategoria,
      concepto:     data.concepto,
      monto:        data.monto,
      fecha:        data.fecha,
      notas:        data.notas ?? null,
    })
    .select()
    .single();
  if (error || !row) throw new Error(`insertGasto: ${error?.message ?? 'no row returned'}`);
  return rowToGasto(row);
}

export async function updateGasto(
  gastoId: string,
  data: Partial<Omit<Gasto, 'id' | 'tallerId'>>,
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (data.categoria    !== undefined) patch.categoria    = data.categoria;
  if (data.subcategoria !== undefined) patch.subcategoria = data.subcategoria;
  if (data.concepto     !== undefined) patch.concepto     = data.concepto;
  if (data.monto        !== undefined) patch.monto        = data.monto;
  if (data.fecha        !== undefined) patch.fecha        = data.fecha;
  if (data.notas        !== undefined) patch.notas        = data.notas ?? null;
  const { error } = await supabase.from('gastos').update(patch).eq('id', gastoId);
  if (error) throw new Error(`updateGasto: ${error.message}`);
}

export async function deleteGasto(gastoId: string): Promise<void> {
  const { error } = await supabase.from('gastos').delete().eq('id', gastoId);
  if (error) throw new Error(`deleteGasto: ${error.message}`);
}

// ── Cotizaciones ──────────────────────────────────────────────
//
// Cotizaciones were previously stored in browser localStorage, which meant
// each user only saw their own device's data. They are now stored in Supabase
// scoped to taller_id, so all taller members share the same history.

export interface CotizacionRow {
  id: string;
  tallerId: string;
  numeroCotizacion: string;
  plantilla: 'general' | 'ayuntamiento' | 'red_ambiental';
  cliente: string;
  fecha: string | null;
  total: number;
  cancelada: boolean;
  editada: boolean;
  convertida: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: Record<string, any>;
  savedAt: string;
  createdAt: string;
}

function mapCotizacion(r: Record<string, unknown>): CotizacionRow {
  return {
    id:                 r.id as string,
    tallerId:           r.taller_id as string,
    numeroCotizacion:   r.numero_cotizacion as string,
    plantilla:          (r.plantilla as string) as CotizacionRow['plantilla'],
    cliente:            (r.cliente as string) ?? '',
    fecha:              (r.fecha as string) ?? null,
    total:              parseFloat(String(r.total ?? 0)),
    cancelada:          Boolean(r.cancelada),
    editada:            Boolean(r.editada),
    convertida:         Boolean(r.convertida),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form:               (r.form as Record<string, any>) ?? {},
    savedAt:            (r.saved_at as string) ?? (r.created_at as string),
    createdAt:          r.created_at as string,
  };
}

export async function getCotizaciones(tallerId: string): Promise<CotizacionRow[]> {
  const { data } = await supabase
    .from('cotizaciones')
    .select('*')
    .eq('taller_id', tallerId)
    .order('created_at', { ascending: false });

  return (data ?? []).map(r => mapCotizacion(r as Record<string, unknown>));
}

export async function insertCotizacion(
  tallerId: string,
  payload: Omit<CotizacionRow, 'id' | 'tallerId' | 'createdAt' | 'savedAt'>,
): Promise<CotizacionRow | null> {
  const { data, error } = await supabase
    .from('cotizaciones')
    .insert({
      taller_id:          tallerId,
      numero_cotizacion:  payload.numeroCotizacion,
      plantilla:          payload.plantilla,
      cliente:            payload.cliente,
      fecha:              payload.fecha,
      total:              payload.total,
      cancelada:          payload.cancelada ?? false,
      editada:            payload.editada ?? false,
      convertida:         payload.convertida ?? false,
      form:               payload.form,
      saved_at:           new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    console.warn('[insertCotizacion] failed:', error?.message);
    return null;
  }
  return mapCotizacion(data as Record<string, unknown>);
}

export async function updateCotizacion(
  cotizacionId: string,
  patch: Partial<Omit<CotizacionRow, 'id' | 'tallerId' | 'createdAt'>>,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbPatch: Record<string, any> = {};
  if (patch.numeroCotizacion !== undefined) dbPatch.numero_cotizacion = patch.numeroCotizacion;
  if (patch.plantilla        !== undefined) dbPatch.plantilla         = patch.plantilla;
  if (patch.cliente          !== undefined) dbPatch.cliente           = patch.cliente;
  if (patch.fecha            !== undefined) dbPatch.fecha             = patch.fecha;
  if (patch.total            !== undefined) dbPatch.total             = patch.total;
  if (patch.cancelada        !== undefined) dbPatch.cancelada         = patch.cancelada;
  if (patch.editada          !== undefined) dbPatch.editada           = patch.editada;
  if (patch.convertida       !== undefined) dbPatch.convertida        = patch.convertida;
  if (patch.form             !== undefined) dbPatch.form              = patch.form;
  if (patch.savedAt          !== undefined) dbPatch.saved_at          = patch.savedAt;

  const { error } = await supabase
    .from('cotizaciones')
    .update(dbPatch)
    .eq('id', cotizacionId);

  if (error) {
    console.warn('[updateCotizacion] failed:', error.message);
    return false;
  }
  return true;
}

// Counter — replaces the localStorage taller_cot_counter.
// Returns the next sequential number and persists it atomically.
export async function nextCotizacionNumber(tallerId: string): Promise<string> {
  // Upsert: increment if exists, insert with 1 if not.
  // Supabase doesn't support atomic increment via upsert directly, so we use
  // a two-step read+write (safe for single-user or low-concurrency shops).
  const { data: existing } = await supabase
    .from('cotizacion_counter')
    .select('last_number')
    .eq('taller_id', tallerId)
    .single();

  const next = (existing?.last_number ?? 0) + 1;

  await supabase
    .from('cotizacion_counter')
    .upsert({ taller_id: tallerId, last_number: next }, { onConflict: 'taller_id' });

  return `COT-${String(next).padStart(3, '0')}`;
}
