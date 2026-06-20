// app/lib/db.ts
// Data access layer — Supabase when configured, localStorage fallback
import { supabase, supabaseEnabled } from './supabase';
import type {
  Cliente, Vehiculo, Refaccion, Trabajo, Proveedor, OrdenCompra, Factura,
  Pago, PagoCompra, PagoFactura, FacturaConcepto,
} from '@/app/types';

// ── Helper ─────────────────────────────────────────────────────────────────

function newId() {
  return Date.now().toString();
}

type ClienteRow = { id: string; nombre: string; telefono: string };
type VehiculoRow = { id: string; cliente_id: string; marca: string; modelo: string; anio: string | null; placa: string | null };
type ProveedorRow = { id: string; nombre: string; telefono: string | null; contacto: string | null; notas: string | null };
type RefaccionRow = {
  id: string;
  nombre: string;
  codigo: string | null;
  categoria: string;
  unidad: string;
  precio_compra: number;
  stock: number;
  stock_minimo: number;
  vehiculo_id: string | null;
  proveedor_id: string | null;
  compatibilidad: unknown;
};
type TrabajoLaborRow = { id: string; concepto: string; precio: number };
type TrabajoParteRow = {
  refaccion_id: string | null;
  nombre: string;
  codigo: string | null;
  cantidad: number;
  precio_compra: number;
  precio_venta: number;
  subtotal: number;
  costo_total: number;
};
type TrabajoPagoRow = { id: string; fecha: string; monto: number; nota: string | null };
type TrabajoRow = {
  id: string;
  cliente_id: string;
  vehiculo_id: string;
  fecha: string;
  descripcion: string;
  mano_de_obra: number;
  refacciones_total: number;
  costo_refacciones: number;
  requiere_factura: boolean;
  folio_fiscal: string | null;
  iva: number;
  total: number;
  estado: Trabajo['estado'];
  estado_facturacion: NonNullable<Trabajo['estadoFacturacion']>;
  factura_id: string | null;
  trabajo_labor_items?: TrabajoLaborRow[] | null;
  trabajo_partes?: TrabajoParteRow[] | null;
  trabajo_pagos?: TrabajoPagoRow[] | null;
};
type OrdenParteRow = { refaccion_id: string | null; nombre: string; cantidad: number; precio_compra: number; subtotal: number };
type OrdenPagoRow = { id: string; fecha: string; monto: number; nota: string | null };
type OrdenRow = {
  id: string;
  proveedor_id: string;
  fecha: string;
  numero_orden: string | null;
  descripcion: string | null;
  total: number;
  estado: OrdenCompra['estado'];
  fecha_recibida: string | null;
  orden_partes?: OrdenParteRow[] | null;
  orden_pagos?: OrdenPagoRow[] | null;
};
type FacturaConceptoRow = {
  tipo: FacturaConcepto['tipo'];
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};
type FacturaPagoRow = { id: string; fecha: string; monto: number; metodo_pago: string };
type FacturaRow = {
  id: string;
  numero_factura: string;
  trabajo_id: string;
  cliente_id: string;
  vehiculo_id: string;
  fecha: string;
  fecha_vencimiento: string | null;
  subtotal: number;
  iva: number | null;
  total: number;
  notas: string | null;
  factura_conceptos?: FacturaConceptoRow[] | null;
  factura_pagos?: FacturaPagoRow[] | null;
};

// ── Map Supabase rows → app types ──────────────────────────────────────────

function rowToTrabajo(t: TrabajoRow): Trabajo {
  return {
    id: t.id,
    clienteId: t.cliente_id,
    vehiculoId: t.vehiculo_id,
    fecha: t.fecha,
    descripcion: t.descripcion,
    manoDeObra: t.mano_de_obra,
    manoDeObraItems: (t.trabajo_labor_items ?? []).map((l) => ({
      id: l.id, concepto: l.concepto, precio: l.precio,
    })),
    refacciones: t.refacciones_total,
    costoRefacciones: t.costo_refacciones,
    requiereFactura: t.requiere_factura,
    folioFiscal: t.folio_fiscal ?? undefined,
    iva: t.iva,
    total: t.total,
    estado: t.estado,
    estadoFacturacion: t.estado_facturacion,
    facturaId: t.factura_id ?? undefined,
    partes: (t.trabajo_partes ?? []).map((p) => ({
      refaccionId: p.refaccion_id ?? '',
      nombre: p.nombre,
      codigo: p.codigo ?? '',
      cantidad: p.cantidad,
      precioCompra: p.precio_compra,
      precioVenta: p.precio_venta,
      subtotal: p.subtotal,
      costoTotal: p.costo_total,
    })),
    pagos: (t.trabajo_pagos ?? []).map((p) => ({
      id: p.id, fecha: p.fecha, monto: p.monto, nota: p.nota ?? undefined,
    })),
  };
}

function rowToOrden(o: OrdenRow): OrdenCompra {
  return {
    id: o.id,
    proveedorId: o.proveedor_id,
    fecha: o.fecha,
    numeroOrden: o.numero_orden ?? undefined,
    descripcion: o.descripcion ?? '',
    total: o.total,
    estado: o.estado,
    fechaRecibida: o.fecha_recibida ?? undefined,
    partes: (o.orden_partes ?? []).map((p) => ({
      refaccionId: p.refaccion_id ?? '',
      nombre: p.nombre,
      cantidad: p.cantidad,
      precioCompra: p.precio_compra,
      subtotal: p.subtotal,
    })),
    pagos: (o.orden_pagos ?? []).map((p) => ({
      id: p.id, fecha: p.fecha, monto: p.monto, nota: p.nota ?? undefined,
    })),
  };
}

function rowToFactura(f: FacturaRow): Factura {
  return {
    id: f.id,
    numeroFactura: f.numero_factura,
    trabajoId: f.trabajo_id,
    clienteId: f.cliente_id,
    vehiculoId: f.vehiculo_id,
    fecha: f.fecha,
    fechaVencimiento: f.fecha_vencimiento ?? undefined,
    conceptos: (f.factura_conceptos ?? []).map((c) => ({
      tipo: c.tipo,
      descripcion: c.descripcion,
      cantidad: c.cantidad,
      precioUnitario: c.precio_unitario,
      subtotal: c.subtotal,
    })),
    subtotal: f.subtotal,
    iva: f.iva ?? undefined,
    total: f.total,
    notas: f.notas ?? undefined,
    pagos: (f.factura_pagos ?? []).map((p) => ({
      id: p.id, fecha: p.fecha, monto: p.monto, metodoPago: p.metodo_pago,
    })),
  };
}

function rowToRefaccion(r: RefaccionRow): Refaccion {
  return {
    id: r.id,
    nombre: r.nombre,
    codigo: r.codigo ?? '',
    categoria: r.categoria,
    unidad: r.unidad,
    precioCompra: r.precio_compra,
    stock: r.stock,
    stockMinimo: r.stock_minimo,
    vehiculoId: r.vehiculo_id ?? undefined,
    proveedorId: r.proveedor_id ?? undefined,
    compatibilidad: r.compatibilidad ? (typeof r.compatibilidad === 'string' ? JSON.parse(r.compatibilidad) : r.compatibilidad) : undefined,
  };
}

// ── LOAD ALL DATA ──────────────────────────────────────────────────────────
// Call this on app startup — loads from Supabase or localStorage

export async function loadAllData() {
  if (!supabaseEnabled || !supabase) {
    // Fallback to localStorage
    return {
      clientes: JSON.parse(localStorage.getItem('clientes') ?? '[]'),
      vehiculos: JSON.parse(localStorage.getItem('vehiculos') ?? '[]'),
      inventario: JSON.parse(localStorage.getItem('inventario') ?? '[]'),
      trabajos: JSON.parse(localStorage.getItem('trabajos') ?? '[]'),
      proveedores: JSON.parse(localStorage.getItem('proveedores') ?? '[]'),
      ordenes: JSON.parse(localStorage.getItem('ordenes') ?? '[]'),
      facturas: JSON.parse(localStorage.getItem('facturas') ?? '[]'),
    };
  }

  const [
    { data: clientes },
    { data: vehiculos },
    { data: refacciones },
    { data: trabajosRaw },
    { data: proveedores },
    { data: ordenesRaw },
    { data: facturasRaw },
  ] = await Promise.all([
    supabase.from('clientes').select('*').order('nombre'),
    supabase.from('vehiculos').select('*'),
    supabase.from('refacciones').select('*').order('nombre'),
    supabase.from('trabajos').select(`
      *,
      trabajo_partes(*),
      trabajo_labor_items(*),
      trabajo_pagos(*)
    `).order('fecha', { ascending: false }),
    supabase.from('proveedores').select('*').order('nombre'),
    supabase.from('ordenes_compra').select(`
      *, orden_partes(*), orden_pagos(*)
    `).order('fecha', { ascending: false }),
    supabase.from('facturas').select(`
      *, factura_conceptos(*), factura_pagos(*)
    `).order('fecha', { ascending: false }),
  ]);

  const clienteRows = (clientes ?? []) as ClienteRow[];
  const vehiculoRows = (vehiculos ?? []) as VehiculoRow[];
  const refaccionRows = (refacciones ?? []) as RefaccionRow[];
  const trabajoRows = (trabajosRaw ?? []) as TrabajoRow[];
  const proveedorRows = (proveedores ?? []) as ProveedorRow[];
  const ordenRows = (ordenesRaw ?? []) as OrdenRow[];
  const facturaRows = (facturasRaw ?? []) as FacturaRow[];

  return {
    clientes: clienteRows.map((c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono })),
    vehiculos: vehiculoRows.map((v) => ({ id: v.id, clienteId: v.cliente_id, marca: v.marca, modelo: v.modelo, anio: v.anio ?? '', placa: v.placa ?? '' })),
    inventario: refaccionRows.map(rowToRefaccion),
    trabajos: trabajoRows.map(rowToTrabajo),
    proveedores: proveedorRows.map((p) => ({ id: p.id, nombre: p.nombre, telefono: p.telefono ?? '', contacto: p.contacto ?? undefined, notas: p.notas ?? undefined })),
    ordenes: ordenRows.map(rowToOrden),
    facturas: facturaRows.map(rowToFactura),
  };
}

// ── WRITE HELPERS ──────────────────────────────────────────────────────────
// Each write: update Supabase + also update localStorage (parallel run safety)

function lsWrite(key: string, data: unknown[]) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ── clientes ──────────────────────────────────────────────────────────────

export async function saveCliente(data: Omit<Cliente, 'id'>, all: Cliente[]): Promise<Cliente> {
  const nuevo: Cliente = { ...data, id: newId() };
  lsWrite('clientes', [...all, nuevo]);
  if (supabase) {
    await supabase.from('clientes').insert({ id: nuevo.id, nombre: nuevo.nombre, telefono: nuevo.telefono });
  }
  return nuevo;
}

// ── vehiculos ──────────────────────────────────────────────────────────────

export async function saveVehiculo(data: Omit<Vehiculo, 'id'>, all: Vehiculo[]): Promise<Vehiculo> {
  const nuevo: Vehiculo = { ...data, id: newId() };
  lsWrite('vehiculos', [...all, nuevo]);
  if (supabase) {
    await supabase.from('vehiculos').insert({
      id: nuevo.id, cliente_id: nuevo.clienteId, marca: nuevo.marca,
      modelo: nuevo.modelo, anio: nuevo.anio || null, placa: nuevo.placa || null,
    });
  }
  return nuevo;
}

// ── refacciones (inventario) ───────────────────────────────────────────────

export async function saveRefaccion(data: Omit<Refaccion, 'id'>, all: Refaccion[]): Promise<Refaccion> {
  const nuevo: Refaccion = { ...data, id: newId() };
  lsWrite('inventario', [...all, nuevo]);
  if (supabase) {
    await supabase.from('refacciones').insert({
      id: nuevo.id, nombre: nuevo.nombre, codigo: nuevo.codigo || null,
      categoria: nuevo.categoria, unidad: nuevo.unidad,
      precio_compra: nuevo.precioCompra, stock: nuevo.stock, stock_minimo: nuevo.stockMinimo,
      vehiculo_id: nuevo.vehiculoId || null, proveedor_id: nuevo.proveedorId || null,
      compatibilidad: nuevo.compatibilidad ? JSON.stringify(nuevo.compatibilidad) : null,
    });
  }
  return nuevo;
}

export async function updateStock(refaccionId: string, newStock: number, all: Refaccion[]): Promise<Refaccion[]> {
  const updated = all.map(r => r.id === refaccionId ? { ...r, stock: newStock } : r);
  lsWrite('inventario', updated);
  if (supabase) {
    await supabase.from('refacciones').update({ stock: newStock }).eq('id', refaccionId);
  }
  return updated;
}

// ── trabajos ───────────────────────────────────────────────────────────────

export async function saveTrabajo(
  data: Omit<Trabajo, 'id' | 'total' | 'iva'>,
  allTrabajos: Trabajo[],
  allInventario: Refaccion[]
): Promise<{ trabajo: Trabajo; inventario: Refaccion[] }> {
  const subtotal = data.manoDeObra + data.refacciones;
  const iva = data.requiereFactura ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
  const total = subtotal + iva;
  const nuevo: Trabajo = { ...data, id: newId(), iva, total, estadoFacturacion: 'sin_facturar' };

  // Reduce inventory stock
  let newInventario = allInventario;
  if (data.partes.length > 0) {
    newInventario = allInventario.map(r => {
      const usada = data.partes.find(p => p.refaccionId === r.id);
      return usada ? { ...r, stock: r.stock - usada.cantidad } : r;
    });
  }

  lsWrite('trabajos', [...allTrabajos, nuevo]);
  lsWrite('inventario', newInventario);

  if (supabase) {
    await supabase.from('trabajos').insert({
      id: nuevo.id, cliente_id: nuevo.clienteId, vehiculo_id: nuevo.vehiculoId,
      fecha: nuevo.fecha, descripcion: nuevo.descripcion,
      mano_de_obra: nuevo.manoDeObra, refacciones_total: nuevo.refacciones,
      costo_refacciones: nuevo.costoRefacciones,
      requiere_factura: nuevo.requiereFactura, folio_fiscal: nuevo.folioFiscal || null,
      iva: nuevo.iva, total: nuevo.total, estado: nuevo.estado,
      estado_facturacion: nuevo.estadoFacturacion,
    });

    if (nuevo.partes.length > 0) {
      await supabase.from('trabajo_partes').insert(
        nuevo.partes.map((p, i) => ({
          id: `${nuevo.id}_p${i}`, trabajo_id: nuevo.id,
          refaccion_id: p.refaccionId || null, nombre: p.nombre, codigo: p.codigo || null,
          cantidad: p.cantidad, precio_compra: p.precioCompra, precio_venta: p.precioVenta,
          subtotal: p.subtotal, costo_total: p.costoTotal,
        }))
      );
      // Update inventory in Supabase
      for (const parte of nuevo.partes) {
        const ref = newInventario.find(r => r.id === parte.refaccionId);
        if (ref) {
          await supabase.from('refacciones').update({ stock: ref.stock }).eq('id', ref.id);
        }
      }
    }
    if (nuevo.manoDeObraItems.length > 0) {
      await supabase.from('trabajo_labor_items').insert(
        nuevo.manoDeObraItems.map(m => ({
          id: m.id, trabajo_id: nuevo.id, concepto: m.concepto, precio: m.precio,
        }))
      );
    }
  }

  return { trabajo: nuevo, inventario: newInventario };
}

export async function addPagoTrabajo(
  trabajoId: string, pago: Omit<Pago, 'id'>, allTrabajos: Trabajo[]
): Promise<Trabajo[]> {
  const nuevoPago: Pago = { ...pago, id: newId() };
  const updated = allTrabajos.map(t =>
    t.id === trabajoId ? { ...t, pagos: [...(t.pagos ?? []), nuevoPago] } : t
  );
  lsWrite('trabajos', updated);
  if (supabase) {
    await supabase.from('trabajo_pagos').insert({
      id: nuevoPago.id, trabajo_id: trabajoId,
      fecha: nuevoPago.fecha, monto: nuevoPago.monto, nota: nuevoPago.nota || null,
    });
  }
  return updated;
}

// ── proveedores ────────────────────────────────────────────────────────────

export async function saveProveedor(data: Omit<Proveedor, 'id'>, all: Proveedor[]): Promise<Proveedor> {
  const nuevo: Proveedor = { ...data, id: newId() };
  lsWrite('proveedores', [...all, nuevo]);
  if (supabase) {
    await supabase.from('proveedores').insert({
      id: nuevo.id, nombre: nuevo.nombre, telefono: nuevo.telefono || null,
      contacto: nuevo.contacto || null, notas: nuevo.notas || null,
    });
  }
  return nuevo;
}

// ── ordenes_compra ─────────────────────────────────────────────────────────

export async function createOrden(
  data: Omit<OrdenCompra, 'id' | 'estado' | 'fechaRecibida' | 'pagos'>,
  allOrdenes: OrdenCompra[],
  generarNumero: (ordenes: OrdenCompra[]) => string
): Promise<OrdenCompra> {
  const nueva: OrdenCompra = {
    ...data, id: newId(),
    numeroOrden: data.numeroOrden || generarNumero(allOrdenes),
    estado: 'pendiente', pagos: [],
  };
  lsWrite('ordenes', [...allOrdenes, nueva]);
  if (supabase) {
    await supabase.from('ordenes_compra').insert({
      id: nueva.id, proveedor_id: nueva.proveedorId, fecha: nueva.fecha,
      numero_orden: nueva.numeroOrden || null, descripcion: nueva.descripcion,
      total: nueva.total, estado: 'pendiente',
    });
    if (nueva.partes.length > 0) {
      await supabase.from('orden_partes').insert(
        nueva.partes.map((p, i) => ({
          id: `${nueva.id}_p${i}`, orden_id: nueva.id,
          refaccion_id: p.refaccionId || null, nombre: p.nombre,
          cantidad: p.cantidad, precio_compra: p.precioCompra, subtotal: p.subtotal,
        }))
      );
    }
  }
  return nueva;
}

export async function recibirOrden(
  ordenId: string, allOrdenes: OrdenCompra[], allInventario: Refaccion[]
): Promise<{ ordenes: OrdenCompra[]; inventario: Refaccion[] }> {
  const orden = allOrdenes.find(o => o.id === ordenId);
  if (!orden || orden.estado !== 'pendiente') return { ordenes: allOrdenes, inventario: allInventario };
  const fecha = new Date().toISOString().split('T')[0];
  const newOrdenes = allOrdenes.map(o =>
    o.id === ordenId ? { ...o, estado: 'recibida' as const, fechaRecibida: fecha } : o
  );
  let newInventario = allInventario;
  if (orden.partes.length > 0) {
    newInventario = allInventario.map(r => {
      const item = orden.partes.find(p => p.refaccionId === r.id);
      return item ? { ...r, stock: r.stock + item.cantidad } : r;
    });
  }
  lsWrite('ordenes', newOrdenes);
  lsWrite('inventario', newInventario);
  if (supabase) {
    await supabase.from('ordenes_compra').update({ estado: 'recibida', fecha_recibida: fecha }).eq('id', ordenId);
    for (const parte of orden.partes) {
      const ref = newInventario.find(r => r.id === parte.refaccionId);
      if (ref) await supabase.from('refacciones').update({ stock: ref.stock }).eq('id', ref.id);
    }
  }
  return { ordenes: newOrdenes, inventario: newInventario };
}

export async function cancelarOrden(ordenId: string, allOrdenes: OrdenCompra[]): Promise<OrdenCompra[]> {
  const updated = allOrdenes.map(o => o.id === ordenId ? { ...o, estado: 'cancelada' as const } : o);
  lsWrite('ordenes', updated);
  if (supabase) await supabase.from('ordenes_compra').update({ estado: 'cancelada' }).eq('id', ordenId);
  return updated;
}

export async function addPagoOrden(
  ordenId: string, pago: Omit<PagoCompra, 'id'>, allOrdenes: OrdenCompra[]
): Promise<OrdenCompra[]> {
  const nuevo: PagoCompra = { ...pago, id: newId() };
  const updated = allOrdenes.map(o => o.id === ordenId ? { ...o, pagos: [...(o.pagos ?? []), nuevo] } : o);
  lsWrite('ordenes', updated);
  if (supabase) {
    await supabase.from('orden_pagos').insert({
      id: nuevo.id, orden_id: ordenId, fecha: nuevo.fecha, monto: nuevo.monto, nota: nuevo.nota || null,
    });
  }
  return updated;
}

// ── facturas ───────────────────────────────────────────────────────────────

export async function generarFactura(
  trabajoId: string, allTrabajos: Trabajo[], allFacturas: Factura[],
  generarNumero: (facturas: Factura[]) => string
): Promise<{ trabajos: Trabajo[]; facturas: Factura[] } | null> {
  const trabajo = allTrabajos.find(t => t.id === trabajoId);
  if (!trabajo || trabajo.facturaId) return null;
  const conceptos: FacturaConcepto[] = [
    ...trabajo.manoDeObraItems.map(m => ({
      tipo: 'mano_de_obra' as const, descripcion: m.concepto,
      cantidad: 1, precioUnitario: m.precio, subtotal: m.precio,
    })),
    ...trabajo.partes.map(p => ({
      tipo: 'parte' as const, descripcion: p.nombre,
      cantidad: p.cantidad, precioUnitario: p.precioVenta, subtotal: p.subtotal,
    })),
  ];
  const subtotal = conceptos.reduce((s, c) => s + c.subtotal, 0);
  const nuevaFactura: Factura = {
    id: newId(), numeroFactura: generarNumero(allFacturas),
    trabajoId, clienteId: trabajo.clienteId, vehiculoId: trabajo.vehiculoId,
    fecha: new Date().toISOString().split('T')[0],
    conceptos, subtotal, total: subtotal, pagos: [],
  };
  const newFacturas = [...allFacturas, nuevaFactura];
  const newTrabajos = allTrabajos.map(t =>
    t.id === trabajoId ? { ...t, facturaId: nuevaFactura.id, estadoFacturacion: 'facturado' as const } : t
  );
  lsWrite('facturas', newFacturas);
  lsWrite('trabajos', newTrabajos);
  if (supabase) {
    await supabase.from('facturas').insert({
      id: nuevaFactura.id, numero_factura: nuevaFactura.numeroFactura,
      trabajo_id: trabajoId, cliente_id: nuevaFactura.clienteId, vehiculo_id: nuevaFactura.vehiculoId,
      fecha: nuevaFactura.fecha, subtotal, total: subtotal,
    });
    if (conceptos.length > 0) {
      await supabase.from('factura_conceptos').insert(
        conceptos.map((c, i) => ({
          id: `${nuevaFactura.id}_c${i}`, factura_id: nuevaFactura.id, tipo: c.tipo,
          descripcion: c.descripcion, cantidad: c.cantidad,
          precio_unitario: c.precioUnitario, subtotal: c.subtotal,
        }))
      );
    }
    await supabase.from('trabajos').update({
      factura_id: nuevaFactura.id, estado_facturacion: 'facturado'
    }).eq('id', trabajoId);
  }
  return { trabajos: newTrabajos, facturas: newFacturas };
}

export async function addPagoFactura(
  facturaId: string, pago: Omit<PagoFactura, 'id'>, allFacturas: Factura[]
): Promise<Factura[]> {
  const nuevo: PagoFactura = { ...pago, id: newId() };
  const updated = allFacturas.map(f => f.id === facturaId ? { ...f, pagos: [...(f.pagos ?? []), nuevo] } : f);
  lsWrite('facturas', updated);
  if (supabase) {
    await supabase.from('factura_pagos').insert({
      id: nuevo.id, factura_id: facturaId, fecha: nuevo.fecha,
      monto: nuevo.monto, metodo_pago: nuevo.metodoPago,
    });
  }
  return updated;
}
