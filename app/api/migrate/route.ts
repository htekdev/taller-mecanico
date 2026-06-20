import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type {
  Cliente, Vehiculo, Refaccion, Trabajo, Proveedor, OrdenCompra, Factura,
} from '@/app/types';

type MigrationPayload = {
  clientes?: Cliente[];
  vehiculos?: Vehiculo[];
  inventario?: Refaccion[];
  trabajos?: Trabajo[];
  proveedores?: Proveedor[];
  ordenes?: OrdenCompra[];
  facturas?: Factura[];
};

export async function POST(req: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Simple secret check — set MIGRATE_SECRET in env to protect this endpoint
  const secret = process.env.MIGRATE_SECRET;
  const authHeader = req.headers.get('x-migrate-secret');
  if (secret && authHeader !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json() as MigrationPayload;
    const { clientes = [], vehiculos = [], inventario = [], trabajos = [], proveedores = [], ordenes = [], facturas = [] } = body;

    const results: Record<string, { inserted: number; errors: string[] }> = {};

    // ── 1. proveedores ──────────────────────────────────────────────────────
    if (proveedores.length > 0) {
      const rows = proveedores.map((p) => ({
        id: p.id, nombre: p.nombre, telefono: p.telefono || null,
        contacto: p.contacto || null, notas: p.notas || null,
      }));
      const { error } = await admin.from('proveedores').upsert(rows, { onConflict: 'id' });
      results.proveedores = { inserted: rows.length, errors: error ? [error.message] : [] };
    }

    // ── 2. clientes ─────────────────────────────────────────────────────────
    if (clientes.length > 0) {
      const rows = clientes.map((c) => ({
        id: c.id, nombre: c.nombre, telefono: c.telefono,
      }));
      const { error } = await admin.from('clientes').upsert(rows, { onConflict: 'id' });
      results.clientes = { inserted: rows.length, errors: error ? [error.message] : [] };
    }

    // ── 3. vehiculos ────────────────────────────────────────────────────────
    if (vehiculos.length > 0) {
      const rows = vehiculos.map((v) => ({
        id: v.id, cliente_id: v.clienteId, marca: v.marca, modelo: v.modelo,
        anio: v.anio || null, placa: v.placa || null,
      }));
      const { error } = await admin.from('vehiculos').upsert(rows, { onConflict: 'id' });
      results.vehiculos = { inserted: rows.length, errors: error ? [error.message] : [] };
    }

    // ── 4. refacciones (inventario) ─────────────────────────────────────────
    if (inventario.length > 0) {
      const rows = inventario.map((r) => ({
        id: r.id, nombre: r.nombre, codigo: r.codigo || null,
        categoria: r.categoria, unidad: r.unidad,
        precio_compra: r.precioCompra, stock: r.stock, stock_minimo: r.stockMinimo,
        vehiculo_id: r.vehiculoId || null, proveedor_id: r.proveedorId || null,
        compatibilidad: r.compatibilidad ? JSON.stringify(r.compatibilidad) : null,
      }));
      const { error } = await admin.from('refacciones').upsert(rows, { onConflict: 'id' });
      results.inventario = { inserted: rows.length, errors: error ? [error.message] : [] };
    }

    // ── 5. facturas (before trabajos — trabajos.factura_id refs facturas) ──
    if (facturas.length > 0) {
      const facturaRows = facturas.map((f) => ({
        id: f.id, numero_factura: f.numeroFactura, trabajo_id: f.trabajoId || null,
        cliente_id: f.clienteId, vehiculo_id: f.vehiculoId || null, fecha: f.fecha,
        fecha_vencimiento: f.fechaVencimiento || null, subtotal: f.subtotal,
        iva: f.iva || 0, total: f.total, notas: f.notas || null,
      }));
      const { error: fErr } = await admin.from('facturas').upsert(facturaRows, { onConflict: 'id' });

      const conceptoRows = facturas.flatMap((f) =>
        (f.conceptos || []).map((c, i: number) => ({
          id: `${f.id}_c${i}`, factura_id: f.id, tipo: c.tipo,
          descripcion: c.descripcion, cantidad: c.cantidad,
          precio_unitario: c.precioUnitario, subtotal: c.subtotal,
        }))
      );
      if (conceptoRows.length > 0) {
        await admin.from('factura_conceptos').upsert(conceptoRows, { onConflict: 'id' });
      }

      const pagoFRows = facturas.flatMap((f) =>
        (f.pagos || []).map((p) => ({
          id: p.id, factura_id: f.id, fecha: p.fecha, monto: p.monto,
          metodo_pago: p.metodoPago || 'Efectivo',
        }))
      );
      if (pagoFRows.length > 0) {
        await admin.from('factura_pagos').upsert(pagoFRows, { onConflict: 'id' });
      }

      results.facturas = { inserted: facturaRows.length, errors: fErr ? [fErr.message] : [] };
    }

    // ── 6. trabajos ──────────────────────────────────────────────────────────
    if (trabajos.length > 0) {
      const trabajoRows = trabajos.map((t) => ({
        id: t.id, cliente_id: t.clienteId, vehiculo_id: t.vehiculoId,
        fecha: t.fecha, descripcion: t.descripcion,
        mano_de_obra: t.manoDeObra || 0,
        refacciones_total: t.refacciones || 0,
        costo_refacciones: t.costoRefacciones || t.refacciones || 0,
        requiere_factura: t.requiereFactura || false,
        folio_fiscal: t.folioFiscal || null,
        iva: t.iva || 0, total: t.total,
        estado: t.estado || 'pendiente',
        estado_facturacion: t.estadoFacturacion || 'sin_facturar',
        factura_id: t.facturaId || null,
      }));
      const { error: tErr } = await admin.from('trabajos').upsert(trabajoRows, { onConflict: 'id' });

      // trabajo_partes
      const partesRows = trabajos.flatMap((t) =>
        (t.partes || []).map((p) => ({
          id: p.refaccionId ? `${t.id}_${p.refaccionId}` : `${t.id}_p${Math.random()}`,
          trabajo_id: t.id, refaccion_id: p.refaccionId || null,
          nombre: p.nombre, codigo: p.codigo || null,
          cantidad: p.cantidad, precio_compra: p.precioCompra,
          precio_venta: p.precioVenta, subtotal: p.subtotal, costo_total: p.costoTotal,
        }))
      );
      if (partesRows.length > 0) {
        await admin.from('trabajo_partes').upsert(partesRows, { onConflict: 'id' });
      }

      // trabajo_labor_items (manoDeObraItems)
      const laborRows = trabajos.flatMap((t) =>
        (t.manoDeObraItems || []).map((m) => ({
          id: m.id, trabajo_id: t.id, concepto: m.concepto, precio: m.precio,
        }))
      );
      if (laborRows.length > 0) {
        await admin.from('trabajo_labor_items').upsert(laborRows, { onConflict: 'id' });
      }

      // trabajo_pagos
      const pagoTRows = trabajos.flatMap((t) =>
        (t.pagos || []).map((p) => ({
          id: p.id, trabajo_id: t.id, fecha: p.fecha, monto: p.monto, nota: p.nota || null,
        }))
      );
      if (pagoTRows.length > 0) {
        await admin.from('trabajo_pagos').upsert(pagoTRows, { onConflict: 'id' });
      }

      results.trabajos = { inserted: trabajoRows.length, errors: tErr ? [tErr.message] : [] };
    }

    // ── 7. ordenes_compra ────────────────────────────────────────────────────
    if (ordenes.length > 0) {
      const ordenRows = ordenes.map((o) => ({
        id: o.id, proveedor_id: o.proveedorId, fecha: o.fecha,
        numero_orden: o.numeroOrden || null, descripcion: o.descripcion || null,
        total: o.total, estado: o.estado,
        fecha_recibida: o.fechaRecibida || null,
      }));
      const { error: oErr } = await admin.from('ordenes_compra').upsert(ordenRows, { onConflict: 'id' });

      const ordenPartesRows = ordenes.flatMap((o) =>
        (o.partes || []).map((p, i: number) => ({
          id: `${o.id}_p${i}`, orden_id: o.id,
          refaccion_id: p.refaccionId || null, nombre: p.nombre,
          cantidad: p.cantidad, precio_compra: p.precioCompra, subtotal: p.subtotal,
        }))
      );
      if (ordenPartesRows.length > 0) {
        await admin.from('orden_partes').upsert(ordenPartesRows, { onConflict: 'id' });
      }

      const ordenPagosRows = ordenes.flatMap((o) =>
        (o.pagos || []).map((p) => ({
          id: p.id, orden_id: o.id, fecha: p.fecha, monto: p.monto, nota: p.nota || null,
        }))
      );
      if (ordenPagosRows.length > 0) {
        await admin.from('orden_pagos').upsert(ordenPagosRows, { onConflict: 'id' });
      }

      results.ordenes = { inserted: ordenRows.length, errors: oErr ? [oErr.message] : [] };
    }

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
