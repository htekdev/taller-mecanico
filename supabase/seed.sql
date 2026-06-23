-- ============================================================
-- Taller Mecánico — Seed Data for Preview Branches
-- Runs automatically on branch creation (Supabase branching)
-- ============================================================
--
-- TEST ACCOUNTS (password: Test1234! for all)
--   sofia@test.com      — owner de "Taller Diesel Mérida"
--   mecanico@test.com   — mecánico (role: mechanic)
--   invitado@test.com   — invitado pendiente (no es miembro aún)
--
-- FIXED UUIDs so cross-table references work on every fresh branch.
-- ============================================================

-- ── Auth Users ───────────────────────────────────────────────
-- Inserting directly into auth.users (seed runs as superuser).
-- pgcrypto is always available on Supabase preview branches.

INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  -- sofia@test.com — owner
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'sofia@test.com',
    crypt('Test1234!', gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre":"Sofía"}',
    NOW() - interval '30 days', NOW(),
    '', '', '', ''
  ),
  -- mecanico@test.com — mechanic
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'mecanico@test.com',
    crypt('Test1234!', gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre":"Miguel"}',
    NOW() - interval '25 days', NOW(),
    '', '', '', ''
  ),
  -- invitado@test.com — has pending invite, not yet a member
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated', 'invitado@test.com',
    crypt('Test1234!', gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre":"Invitado"}',
    NOW() - interval '2 days', NOW(),
    '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- ── Taller ───────────────────────────────────────────────────
INSERT INTO talleres (id, nombre, created_by, created_at) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Taller Diesel Mérida',
  'a0000000-0000-0000-0000-000000000001',
  NOW() - interval '30 days'
) ON CONFLICT (id) DO NOTHING;

-- ── Miembros ──────────────────────────────────────────────────
INSERT INTO taller_members (id, taller_id, user_id, role, email, created_at) VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'owner', 'sofia@test.com', NOW() - interval '30 days'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'mechanic', 'mecanico@test.com', NOW() - interval '25 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ── Invitación pendiente (invitado@test.com) ──────────────────
INSERT INTO taller_invites (id, taller_id, email, token, invited_by, used_at, created_at) VALUES (
  'c1000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'invitado@test.com',
  'preview-seed-token-invitado-2026',
  'a0000000-0000-0000-0000-000000000001',
  NULL,
  NOW() - interval '2 days'
) ON CONFLICT (id) DO NOTHING;

-- ── Proveedores ───────────────────────────────────────────────
INSERT INTO proveedores (id, taller_id, nombre, telefono, contacto, notas, created_at) VALUES
  (
    '90000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'AutoParts Mérida', '9991234567', 'Luis Ortega',
    'Proveedor principal de filtros y aceites. Entrega martes y jueves.',
    NOW() - interval '28 days'
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'Distribuidora del Sureste', '9997654321', 'Ana García',
    'Refacciones eléctricas, correas y transmisión.',
    NOW() - interval '20 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ── Clientes ─────────────────────────────────────────────────
INSERT INTO clientes (id, taller_id, nombre, telefono, created_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Carlos Medina',  '9991112233', NOW() - interval '28 days'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Juan Torres',    '9994455667', NOW() - interval '22 days'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'María Pérez',    '9998889900', NOW() - interval '18 days'),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Roberto Santos', '9993332211', NOW() - interval '10 days'),
  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Andrés Flores',  '9996667788', NOW() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- ── Vehículos ────────────────────────────────────────────────
-- Carlos tiene 2 unidades; cada cliente tiene 1 más
INSERT INTO vehiculos (id, taller_id, cliente_id, marca, modelo, anio, placa, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Ford',      'F-150',    '2018', 'YUC-123-A', NOW() - interval '28 days'),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Chevrolet', 'Silverado','2020', 'YUC-456-B', NOW() - interval '28 days'),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Nissan',    'Tsuru',    '2015', 'YUC-789-C', NOW() - interval '22 days'),
  ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'Chevrolet', 'Aveo',     '2017', 'YUC-321-D', NOW() - interval '18 days'),
  ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 'Nissan',    'Frontier', '2019', 'YUC-654-E', NOW() - interval '10 days'),
  ('e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', 'Chevrolet', 'Corsa',    '2010', 'YUC-987-F', NOW() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- ── Inventario (Refacciones) ──────────────────────────────────
INSERT INTO refacciones (id, taller_id, nombre, codigo, categoria, unidad, precio_compra, stock, stock_minimo, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Filtro de aceite',          'FLT-ACE-001', 'Filtros',     'pieza',   45.00,  8, 3, NOW() - interval '25 days'),
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Aceite 5W-30 1L',           'ACE-5W30-1L', 'Lubricantes', 'litro',   85.00, 20, 5, NOW() - interval '25 days'),
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Filtro de aire',            'FLT-AIR-002', 'Filtros',     'pieza',   95.00,  5, 2, NOW() - interval '25 days'),
  ('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Pastillas de freno del.',   'PAD-DEL-001', 'Frenos',      'juego',  280.00,  4, 2, NOW() - interval '20 days'),
  ('f0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Bujías (juego de 4)',       'BUJ-NGK-004', 'Encendido',   'juego',  160.00,  6, 2, NOW() - interval '20 days'),
  ('f0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'Aceite de transmisión 1L', 'ACE-TRANS-1', 'Lubricantes', 'litro',   95.00, 10, 3, NOW() - interval '18 days'),
  ('f0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'Filtro de combustible',     'FLT-COMB-03', 'Filtros',     'pieza',   65.00,  2, 2, NOW() - interval '18 days'),
  ('f0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'Correa de distribución',    'COR-DIST-F1', 'Motor',       'pieza',  450.00,  2, 1, NOW() - interval '15 days'),
  ('f0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001', 'Anticongelante 1L',         'ANTI-COOL-1', 'Lubricantes', 'litro',   55.00, 12, 4, NOW() - interval '12 days'),
  ('f0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 'Disco de freno trasero',    'DSC-TRA-002', 'Frenos',      'pieza',  320.00,  2, 1, NOW() - interval '8 days')
ON CONFLICT (id) DO NOTHING;

-- ── Trabajos ──────────────────────────────────────────────────

-- Trabajo 1: Cambio de aceite — Carlos / F-150 — PAGADO ✅
INSERT INTO trabajos (
  id, taller_id, cliente_id, vehiculo_id, fecha, descripcion,
  mano_de_obra, mano_de_obra_items,
  refacciones_total, costo_refacciones,
  requiere_factura, iva, total,
  partes, pagos,
  estado_facturacion, estado, tipo_documento, fecha_finalizacion, created_at
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  (NOW() - interval '20 days')::DATE,
  'Cambio de aceite 5W-30 y filtros (aceite + aire). Revisión general.',
  200.00,
  '[{"id":"mo-001","concepto":"Cambio de aceite y filtros","precio":150},{"id":"mo-002","concepto":"Revisión general","precio":50}]',
  575.00, 385.00,
  false, 0.00, 775.00,
  '[{"refaccionId":"f0000000-0000-0000-0000-000000000001","nombre":"Filtro de aceite","cantidad":1,"precioVenta":80.00,"precioCompra":45.00},{"refaccionId":"f0000000-0000-0000-0000-000000000002","nombre":"Aceite 5W-30 1L","cantidad":4,"precioVenta":115.00,"precioCompra":85.00},{"refaccionId":"f0000000-0000-0000-0000-000000000003","nombre":"Filtro de aire","cantidad":1,"precioVenta":155.00,"precioCompra":95.00}]',
  '[{"id":"pago-g1-001","fecha":"2026-06-05","monto":775.00,"metodo":"efectivo"}]',
  'sin_facturar', 'pagado', 'nota',
  NOW() - interval '19 days', NOW() - interval '20 days'
) ON CONFLICT (id) DO NOTHING;

-- Trabajo 2: Frenos — Juan / Tsuru — COMPLETADO (por cobrar)
INSERT INTO trabajos (
  id, taller_id, cliente_id, vehiculo_id, fecha, descripcion,
  mano_de_obra, mano_de_obra_items,
  refacciones_total, costo_refacciones,
  requiere_factura, iva, total,
  partes, pagos,
  estado_facturacion, estado, tipo_documento, fecha_finalizacion, created_at
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000003',
  (NOW() - interval '12 days')::DATE,
  'Cambio de pastillas de freno delanteras (2 juegos). Ajuste y prueba de frenado.',
  350.00,
  '[{"id":"mo-003","concepto":"Cambio pastillas freno delanteras","precio":350}]',
  560.00, 280.00,
  false, 0.00, 910.00,
  '[{"refaccionId":"f0000000-0000-0000-0000-000000000004","nombre":"Pastillas de freno del.","cantidad":2,"precioVenta":280.00,"precioCompra":280.00}]',
  '[]',
  'sin_facturar', 'completado', 'nota',
  NOW() - interval '11 days', NOW() - interval '12 days'
) ON CONFLICT (id) DO NOTHING;

-- Trabajo 3: Afinación — María / Aveo — PENDIENTE (en proceso, requiere factura)
INSERT INTO trabajos (
  id, taller_id, cliente_id, vehiculo_id, fecha, descripcion,
  mano_de_obra, mano_de_obra_items,
  refacciones_total, costo_refacciones,
  requiere_factura, iva, total,
  partes, pagos,
  estado_facturacion, estado, created_at
) VALUES (
  '10000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000003',
  'e0000000-0000-0000-0000-000000000004',
  NOW()::DATE,
  'Afinación completa: bujías, filtro de aceite, aceite 5W-30. Diagnóstico eléctrico.',
  400.00,
  '[{"id":"mo-004","concepto":"Afinación completa","precio":300},{"id":"mo-005","concepto":"Diagnóstico eléctrico","precio":100}]',
  590.00, 370.00,
  true, 0.00, 990.00,
  '[{"refaccionId":"f0000000-0000-0000-0000-000000000005","nombre":"Bujías (juego de 4)","cantidad":1,"precioVenta":250.00,"precioCompra":160.00},{"refaccionId":"f0000000-0000-0000-0000-000000000001","nombre":"Filtro de aceite","cantidad":1,"precioVenta":80.00,"precioCompra":45.00},{"refaccionId":"f0000000-0000-0000-0000-000000000002","nombre":"Aceite 5W-30 1L","cantidad":3,"precioVenta":115.00,"precioCompra":85.00}]',
  '[]',
  'sin_facturar', 'pendiente', NOW() - interval '1 day'
) ON CONFLICT (id) DO NOTHING;

-- Trabajo 4: Distribución — Roberto / Frontier — PENDIENTE (trabajo grande)
INSERT INTO trabajos (
  id, taller_id, cliente_id, vehiculo_id, fecha, descripcion,
  mano_de_obra, mano_de_obra_items,
  refacciones_total, costo_refacciones,
  requiere_factura, iva, total,
  partes, pagos,
  estado_facturacion, estado, created_at
) VALUES (
  '10000000-0000-0000-0000-000000000004',
  'b0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000004',
  'e0000000-0000-0000-0000-000000000005',
  NOW()::DATE,
  'Cambio de correa de distribución y revisión sistema de enfriamiento. Anticongelante.',
  800.00,
  '[{"id":"mo-006","concepto":"Cambio correa distribución","precio":600},{"id":"mo-007","concepto":"Revisión enfriamiento + anticongelante","precio":200}]',
  1010.00, 560.00,
  true, 0.00, 1810.00,
  '[{"refaccionId":"f0000000-0000-0000-0000-000000000008","nombre":"Correa de distribución","cantidad":2,"precioVenta":505.00,"precioCompra":450.00},{"refaccionId":"f0000000-0000-0000-0000-000000000009","nombre":"Anticongelante 1L","cantidad":2,"precioVenta":100.00,"precioCompra":55.00}]',
  '[]',
  'sin_facturar', 'pendiente', NOW()
) ON CONFLICT (id) DO NOTHING;

-- Trabajo 5: Cambio de aceite — Carlos / Silverado — PAGADO (trabajo anterior)
INSERT INTO trabajos (
  id, taller_id, cliente_id, vehiculo_id, fecha, descripcion,
  mano_de_obra, mano_de_obra_items,
  refacciones_total, costo_refacciones,
  requiere_factura, iva, total,
  partes, pagos,
  estado_facturacion, estado, tipo_documento, fecha_finalizacion, created_at
) VALUES (
  '10000000-0000-0000-0000-000000000005',
  'b0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002',
  (NOW() - interval '15 days')::DATE,
  'Cambio de aceite de motor y transmisión. Revisión de niveles.',
  250.00,
  '[{"id":"mo-008","concepto":"Cambio aceite motor","precio":150},{"id":"mo-009","concepto":"Cambio aceite transmisión","precio":100}]',
  460.00, 260.00,
  false, 0.00, 710.00,
  '[{"refaccionId":"f0000000-0000-0000-0000-000000000002","nombre":"Aceite 5W-30 1L","cantidad":3,"precioVenta":115.00,"precioCompra":85.00},{"refaccionId":"f0000000-0000-0000-0000-000000000006","nombre":"Aceite de transmisión 1L","cantidad":2,"precioVenta":115.00,"precioCompra":95.00}]',
  '[{"id":"pago-g5-001","fecha":"2026-06-10","monto":710.00,"metodo":"transferencia"}]',
  'sin_facturar', 'pagado', 'nota',
  NOW() - interval '14 days', NOW() - interval '15 days'
) ON CONFLICT (id) DO NOTHING;

-- ── Órdenes de Compra ─────────────────────────────────────────

-- OC 1: Reabasto de filtros y aceites — RECIBIDA
INSERT INTO ordenes_compra (
  id, taller_id, proveedor_id, fecha, numero_orden, descripcion,
  partes, total, estado, fecha_recibida, pagos, created_at
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000001',
  (NOW() - interval '18 days')::DATE,
  'OC-2026-001',
  'Reabasto mensual de filtros y aceites para servicios preventivos.',
  '[{"nombre":"Filtro de aceite","cantidad":10,"precioUnitario":45.00},{"nombre":"Aceite 5W-30 1L","cantidad":20,"precioUnitario":85.00},{"nombre":"Filtro de aire","cantidad":5,"precioUnitario":95.00}]',
  2625.00, 'recibida',
  (NOW() - interval '16 days')::DATE,
  '[{"id":"pc-001","fecha":"2026-06-07","monto":2625.00,"metodo":"transferencia"}]',
  NOW() - interval '18 days'
) ON CONFLICT (id) DO NOTHING;

-- OC 2: Pastillas y correas — PENDIENTE
INSERT INTO ordenes_compra (
  id, taller_id, proveedor_id, fecha, numero_orden, descripcion,
  partes, total, estado, fecha_recibida, pagos, created_at
) VALUES (
  '20000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  NOW()::DATE,
  'OC-2026-002',
  'Pastillas de freno y correas de distribución para trabajos programados.',
  '[{"nombre":"Pastillas de freno del.","cantidad":4,"precioUnitario":280.00},{"nombre":"Correa de distribución","cantidad":2,"precioUnitario":450.00}]',
  2020.00, 'pendiente',
  NULL,
  '[]',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ── Facturas ──────────────────────────────────────────────────

-- Factura 1: Carlos Medina — PAGADA
INSERT INTO facturas (
  id, taller_id, numero_factura, trabajo_id, cliente_id, vehiculo_id,
  fecha, fecha_vencimiento, conceptos, subtotal, iva, total, pagos, notas, created_at
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'FAC-2026-001', NULL,
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  (NOW() - interval '19 days')::DATE,
  (NOW() - interval '4 days')::DATE,
  '[{"descripcion":"Cambio de aceite 5W-30 y filtros. Revisión general.","cantidad":1,"precioUnitario":775.00,"subtotal":775.00}]',
  668.10, 106.90, 775.00,
  '[{"id":"fp-001","fecha":"2026-06-05","monto":775.00,"metodo":"efectivo"}]',
  'Mantenimiento preventivo F-150 2018.',
  NOW() - interval '19 days'
) ON CONFLICT (id) DO NOTHING;

-- Factura 2: Juan Torres — PENDIENTE DE COBRO
INSERT INTO facturas (
  id, taller_id, numero_factura, trabajo_id, cliente_id, vehiculo_id,
  fecha, fecha_vencimiento, conceptos, subtotal, iva, total, pagos, notas, created_at
) VALUES (
  '30000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000001',
  'FAC-2026-002', NULL,
  'd0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000003',
  (NOW() - interval '11 days')::DATE,
  (NOW() + interval '4 days')::DATE,
  '[{"descripcion":"Cambio de pastillas de freno delanteras (2 juegos). Ajuste y prueba.","cantidad":1,"precioUnitario":910.00,"subtotal":910.00}]',
  784.48, 125.52, 910.00,
  '[]',
  'Pendiente de pago. Vence en 4 días.',
  NOW() - interval '11 days'
) ON CONFLICT (id) DO NOTHING;

