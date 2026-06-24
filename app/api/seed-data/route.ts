/**
 * One-shot endpoint — seed full test dataset for sofia@test.com in production.
 *
 * Idempotent: uses upsert with ON CONFLICT DO NOTHING semantics.
 * Protected by ?secret=SEED_SOFIA_SECRET env var.
 * DELETE THIS FILE after seeding is confirmed.
 *
 * Usage: GET /api/seed-data?secret=<SEED_SOFIA_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TALLER_ID = 'b0000000-0000-0000-0000-000000000001';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.SEED_SOFIA_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const r: Record<string, string> = {};

  // ── 1. Proveedores ────────────────────────────────────────────────────────
  const { error: e1 } = await db.from('proveedores').upsert([
    { id: '90000000-0000-0000-0000-000000000001', taller_id: TALLER_ID, nombre: 'AutoParts Mérida',        telefono: '9991234567', contacto: 'Luis Ortega',  notas: 'Proveedor principal de filtros y aceites. Entrega martes y jueves.' },
    { id: '90000000-0000-0000-0000-000000000002', taller_id: TALLER_ID, nombre: 'Distribuidora del Sureste', telefono: '9997654321', contacto: 'Ana García', notas: 'Refacciones eléctricas, correas y transmisión.' },
  ], { onConflict: 'id' });
  r.proveedores = e1 ? `error: ${e1.message}` : 'ok';

  // ── 2. Clientes ───────────────────────────────────────────────────────────
  const { error: e2 } = await db.from('clientes').upsert([
    { id: 'd0000000-0000-0000-0000-000000000001', taller_id: TALLER_ID, nombre: 'Carlos Medina',  telefono: '9991112233' },
    { id: 'd0000000-0000-0000-0000-000000000002', taller_id: TALLER_ID, nombre: 'Juan Torres',    telefono: '9994455667' },
    { id: 'd0000000-0000-0000-0000-000000000003', taller_id: TALLER_ID, nombre: 'María Pérez',    telefono: '9998889900' },
    { id: 'd0000000-0000-0000-0000-000000000004', taller_id: TALLER_ID, nombre: 'Roberto Santos', telefono: '9993332211' },
    { id: 'd0000000-0000-0000-0000-000000000005', taller_id: TALLER_ID, nombre: 'Andrés Flores',  telefono: '9996667788' },
  ], { onConflict: 'id' });
  r.clientes = e2 ? `error: ${e2.message}` : 'ok';

  // ── 3. Vehículos ──────────────────────────────────────────────────────────
  const { error: e3 } = await db.from('vehiculos').upsert([
    { id: 'e0000000-0000-0000-0000-000000000001', taller_id: TALLER_ID, cliente_id: 'd0000000-0000-0000-0000-000000000001', marca: 'Ford',      modelo: 'F-150',     anio: '2018', placa: 'YUC-123-A' },
    { id: 'e0000000-0000-0000-0000-000000000002', taller_id: TALLER_ID, cliente_id: 'd0000000-0000-0000-0000-000000000001', marca: 'Chevrolet', modelo: 'Silverado', anio: '2020', placa: 'YUC-456-B' },
    { id: 'e0000000-0000-0000-0000-000000000003', taller_id: TALLER_ID, cliente_id: 'd0000000-0000-0000-0000-000000000002', marca: 'Nissan',    modelo: 'Tsuru',     anio: '2015', placa: 'YUC-789-C' },
    { id: 'e0000000-0000-0000-0000-000000000004', taller_id: TALLER_ID, cliente_id: 'd0000000-0000-0000-0000-000000000003', marca: 'Chevrolet', modelo: 'Aveo',      anio: '2017', placa: 'YUC-321-D' },
    { id: 'e0000000-0000-0000-0000-000000000005', taller_id: TALLER_ID, cliente_id: 'd0000000-0000-0000-0000-000000000004', marca: 'Nissan',    modelo: 'Frontier',  anio: '2019', placa: 'YUC-654-E' },
    { id: 'e0000000-0000-0000-0000-000000000006', taller_id: TALLER_ID, cliente_id: 'd0000000-0000-0000-0000-000000000005', marca: 'Chevrolet', modelo: 'Corsa',     anio: '2010', placa: 'YUC-987-F' },
  ], { onConflict: 'id' });
  r.vehiculos = e3 ? `error: ${e3.message}` : 'ok';

  // ── 4. Refacciones ────────────────────────────────────────────────────────
  const { error: e4 } = await db.from('refacciones').upsert([
    { id: 'f0000000-0000-0000-0000-000000000001', taller_id: TALLER_ID, nombre: 'Filtro de aceite',         codigo: 'FLT-ACE-001', categoria: 'Filtros',     unidad: 'pieza',  precio_compra: 45.00,  stock: 8,  stock_minimo: 3 },
    { id: 'f0000000-0000-0000-0000-000000000002', taller_id: TALLER_ID, nombre: 'Aceite 5W-30 1L',          codigo: 'ACE-5W30-1L', categoria: 'Lubricantes', unidad: 'litro',  precio_compra: 85.00,  stock: 20, stock_minimo: 5 },
    { id: 'f0000000-0000-0000-0000-000000000003', taller_id: TALLER_ID, nombre: 'Filtro de aire',           codigo: 'FLT-AIR-002', categoria: 'Filtros',     unidad: 'pieza',  precio_compra: 95.00,  stock: 5,  stock_minimo: 2 },
    { id: 'f0000000-0000-0000-0000-000000000004', taller_id: TALLER_ID, nombre: 'Pastillas de freno del.',  codigo: 'PAD-DEL-001', categoria: 'Frenos',      unidad: 'juego',  precio_compra: 280.00, stock: 4,  stock_minimo: 2 },
    { id: 'f0000000-0000-0000-0000-000000000005', taller_id: TALLER_ID, nombre: 'Bujías (juego de 4)',      codigo: 'BUJ-NGK-004', categoria: 'Encendido',   unidad: 'juego',  precio_compra: 160.00, stock: 6,  stock_minimo: 2 },
    { id: 'f0000000-0000-0000-0000-000000000006', taller_id: TALLER_ID, nombre: 'Aceite de transmisión 1L', codigo: 'ACE-TRANS-1', categoria: 'Lubricantes', unidad: 'litro',  precio_compra: 95.00,  stock: 10, stock_minimo: 3 },
    { id: 'f0000000-0000-0000-0000-000000000007', taller_id: TALLER_ID, nombre: 'Filtro de combustible',    codigo: 'FLT-COMB-03', categoria: 'Filtros',     unidad: 'pieza',  precio_compra: 65.00,  stock: 2,  stock_minimo: 2 },
    { id: 'f0000000-0000-0000-0000-000000000008', taller_id: TALLER_ID, nombre: 'Correa de distribución',   codigo: 'COR-DIST-F1', categoria: 'Motor',       unidad: 'pieza',  precio_compra: 450.00, stock: 2,  stock_minimo: 1 },
    { id: 'f0000000-0000-0000-0000-000000000009', taller_id: TALLER_ID, nombre: 'Anticongelante 1L',        codigo: 'ANTI-COOL-1', categoria: 'Lubricantes', unidad: 'litro',  precio_compra: 55.00,  stock: 12, stock_minimo: 4 },
    { id: 'f0000000-0000-0000-0000-000000000010', taller_id: TALLER_ID, nombre: 'Disco de freno trasero',   codigo: 'DSC-TRA-002', categoria: 'Frenos',      unidad: 'pieza',  precio_compra: 320.00, stock: 2,  stock_minimo: 1 },
  ], { onConflict: 'id' });
  r.refacciones = e4 ? `error: ${e4.message}` : 'ok';

  // ── 5. Trabajos ───────────────────────────────────────────────────────────
  const { error: e5 } = await db.from('trabajos').upsert([
    {
      id: '10000000-0000-0000-0000-000000000001', taller_id: TALLER_ID,
      cliente_id: 'd0000000-0000-0000-0000-000000000001', vehiculo_id: 'e0000000-0000-0000-0000-000000000001',
      descripcion: 'Cambio de aceite 5W-30 y filtros (aceite + aire). Revisión general.',
      mano_de_obra: 200.00, refacciones_total: 575.00, costo_refacciones: 385.00,
      requiere_factura: false, iva: 0.00, total: 775.00,
      mano_de_obra_items: [{"id":"mo-001","concepto":"Cambio de aceite y filtros","precio":150},{"id":"mo-002","concepto":"Revisión general","precio":50}],
      partes: [{"refaccionId":"f0000000-0000-0000-0000-000000000001","nombre":"Filtro de aceite","cantidad":1,"precioVenta":80.00,"precioCompra":45.00},{"refaccionId":"f0000000-0000-0000-0000-000000000002","nombre":"Aceite 5W-30 1L","cantidad":4,"precioVenta":115.00,"precioCompra":85.00},{"refaccionId":"f0000000-0000-0000-0000-000000000003","nombre":"Filtro de aire","cantidad":1,"precioVenta":155.00,"precioCompra":95.00}],
      pagos: [{"id":"pago-g1-001","fecha":"2026-06-05","monto":775.00,"metodo":"efectivo"}],
      estado_facturacion: 'sin_facturar', estado: 'pagado', tipo_documento: 'nota',
    },
    {
      id: '10000000-0000-0000-0000-000000000002', taller_id: TALLER_ID,
      cliente_id: 'd0000000-0000-0000-0000-000000000002', vehiculo_id: 'e0000000-0000-0000-0000-000000000003',
      descripcion: 'Cambio de pastillas de freno delanteras (2 juegos). Ajuste y prueba de frenado.',
      mano_de_obra: 350.00, refacciones_total: 560.00, costo_refacciones: 280.00,
      requiere_factura: false, iva: 0.00, total: 910.00,
      mano_de_obra_items: [{"id":"mo-003","concepto":"Cambio pastillas freno delanteras","precio":350}],
      partes: [{"refaccionId":"f0000000-0000-0000-0000-000000000004","nombre":"Pastillas de freno del.","cantidad":2,"precioVenta":280.00,"precioCompra":280.00}],
      pagos: [],
      estado_facturacion: 'sin_facturar', estado: 'completado', tipo_documento: 'nota',
    },
    {
      id: '10000000-0000-0000-0000-000000000003', taller_id: TALLER_ID,
      cliente_id: 'd0000000-0000-0000-0000-000000000003', vehiculo_id: 'e0000000-0000-0000-0000-000000000004',
      descripcion: 'Afinación completa: bujías, filtro de aceite, aceite 5W-30. Diagnóstico eléctrico.',
      mano_de_obra: 400.00, refacciones_total: 590.00, costo_refacciones: 370.00,
      requiere_factura: true, iva: 0.00, total: 990.00,
      mano_de_obra_items: [{"id":"mo-004","concepto":"Afinación completa","precio":300},{"id":"mo-005","concepto":"Diagnóstico eléctrico","precio":100}],
      partes: [{"refaccionId":"f0000000-0000-0000-0000-000000000005","nombre":"Bujías (juego de 4)","cantidad":1,"precioVenta":250.00,"precioCompra":160.00},{"refaccionId":"f0000000-0000-0000-0000-000000000001","nombre":"Filtro de aceite","cantidad":1,"precioVenta":80.00,"precioCompra":45.00},{"refaccionId":"f0000000-0000-0000-0000-000000000002","nombre":"Aceite 5W-30 1L","cantidad":3,"precioVenta":115.00,"precioCompra":85.00}],
      pagos: [],
      estado_facturacion: 'sin_facturar', estado: 'pendiente',
    },
    {
      id: '10000000-0000-0000-0000-000000000004', taller_id: TALLER_ID,
      cliente_id: 'd0000000-0000-0000-0000-000000000004', vehiculo_id: 'e0000000-0000-0000-0000-000000000005',
      descripcion: 'Cambio de correa de distribución y revisión sistema de enfriamiento. Anticongelante.',
      mano_de_obra: 800.00, refacciones_total: 1010.00, costo_refacciones: 560.00,
      requiere_factura: true, iva: 0.00, total: 1810.00,
      mano_de_obra_items: [{"id":"mo-006","concepto":"Cambio correa distribución","precio":600},{"id":"mo-007","concepto":"Revisión enfriamiento + anticongelante","precio":200}],
      partes: [{"refaccionId":"f0000000-0000-0000-0000-000000000008","nombre":"Correa de distribución","cantidad":2,"precioVenta":505.00,"precioCompra":450.00},{"refaccionId":"f0000000-0000-0000-0000-000000000009","nombre":"Anticongelante 1L","cantidad":2,"precioVenta":100.00,"precioCompra":55.00}],
      pagos: [],
      estado_facturacion: 'sin_facturar', estado: 'pendiente',
    },
    {
      id: '10000000-0000-0000-0000-000000000005', taller_id: TALLER_ID,
      cliente_id: 'd0000000-0000-0000-0000-000000000001', vehiculo_id: 'e0000000-0000-0000-0000-000000000002',
      descripcion: 'Cambio de aceite de motor y transmisión. Revisión de niveles.',
      mano_de_obra: 250.00, refacciones_total: 460.00, costo_refacciones: 260.00,
      requiere_factura: false, iva: 0.00, total: 710.00,
      mano_de_obra_items: [{"id":"mo-008","concepto":"Cambio aceite motor","precio":150},{"id":"mo-009","concepto":"Cambio aceite transmisión","precio":100}],
      partes: [{"refaccionId":"f0000000-0000-0000-0000-000000000002","nombre":"Aceite 5W-30 1L","cantidad":3,"precioVenta":115.00,"precioCompra":85.00},{"refaccionId":"f0000000-0000-0000-0000-000000000006","nombre":"Aceite de transmisión 1L","cantidad":2,"precioVenta":115.00,"precioCompra":95.00}],
      pagos: [{"id":"pago-g5-001","fecha":"2026-06-10","monto":710.00,"metodo":"transferencia"}],
      estado_facturacion: 'sin_facturar', estado: 'pagado', tipo_documento: 'nota',
    },
  ], { onConflict: 'id' });
  r.trabajos = e5 ? `error: ${e5.message}` : 'ok';

  // ── 6. Órdenes de Compra ──────────────────────────────────────────────────
  const { error: e6 } = await db.from('ordenes_compra').upsert([
    {
      id: '20000000-0000-0000-0000-000000000001', taller_id: TALLER_ID,
      proveedor_id: '90000000-0000-0000-0000-000000000001',
      numero_orden: 'OC-2026-001', descripcion: 'Reabasto mensual de filtros y aceites.',
      partes: [{"nombre":"Filtro de aceite","cantidad":10,"precioUnitario":45.00},{"nombre":"Aceite 5W-30 1L","cantidad":20,"precioUnitario":85.00},{"nombre":"Filtro de aire","cantidad":5,"precioUnitario":95.00}],
      total: 2625.00, estado: 'recibida',
      pagos: [{"id":"pc-001","fecha":"2026-06-07","monto":2625.00,"metodo":"transferencia"}],
    },
    {
      id: '20000000-0000-0000-0000-000000000002', taller_id: TALLER_ID,
      proveedor_id: '90000000-0000-0000-0000-000000000002',
      numero_orden: 'OC-2026-002', descripcion: 'Pastillas de freno y correas de distribución.',
      partes: [{"nombre":"Pastillas de freno del.","cantidad":4,"precioUnitario":280.00},{"nombre":"Correa de distribución","cantidad":2,"precioUnitario":450.00}],
      total: 2020.00, estado: 'pendiente',
      pagos: [],
    },
  ], { onConflict: 'id' });
  r.ordenes_compra = e6 ? `error: ${e6.message}` : 'ok';

  // ── 7. Facturas ───────────────────────────────────────────────────────────
  const { error: e7 } = await db.from('facturas').upsert([
    {
      id: '30000000-0000-0000-0000-000000000001', taller_id: TALLER_ID,
      numero_factura: 'FAC-2026-001', trabajo_id: null,
      cliente_id: 'd0000000-0000-0000-0000-000000000001', vehiculo_id: 'e0000000-0000-0000-0000-000000000001',
      conceptos: [{"descripcion":"Cambio de aceite 5W-30 y filtros. Revisión general.","cantidad":1,"precioUnitario":775.00,"subtotal":775.00}],
      subtotal: 668.10, iva: 106.90, total: 775.00,
      pagos: [{"id":"fp-001","fecha":"2026-06-05","monto":775.00,"metodo":"efectivo"}],
      notas: 'Mantenimiento preventivo F-150 2018.',
    },
    {
      id: '30000000-0000-0000-0000-000000000002', taller_id: TALLER_ID,
      numero_factura: 'FAC-2026-002', trabajo_id: null,
      cliente_id: 'd0000000-0000-0000-0000-000000000002', vehiculo_id: 'e0000000-0000-0000-0000-000000000003',
      conceptos: [{"descripcion":"Cambio de pastillas de freno delanteras (2 juegos). Ajuste y prueba.","cantidad":1,"precioUnitario":910.00,"subtotal":910.00}],
      subtotal: 784.48, iva: 125.52, total: 910.00,
      pagos: [],
      notas: 'Pendiente de pago.',
    },
  ], { onConflict: 'id' });
  r.facturas = e7 ? `error: ${e7.message}` : 'ok';

  const errors = Object.entries(r).filter(([, v]) => v.startsWith('error'));
  return NextResponse.json({ ok: errors.length === 0, results: r, errors_count: errors.length });
}
