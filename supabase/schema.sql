-- ─── Taller Mecánico — Supabase Schema ──────────────────────────────────────
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Order matters for FK references

-- 1. proveedores (no dependencies)
create table if not exists proveedores (
  id text primary key,
  nombre text not null,
  telefono text,
  contacto text,
  notas text,
  created_at timestamptz default now()
);

-- 2. clientes (no dependencies)
create table if not exists clientes (
  id text primary key,
  nombre text not null,
  telefono text not null,
  created_at timestamptz default now()
);

-- 3. vehiculos (→ clientes)
create table if not exists vehiculos (
  id text primary key,
  cliente_id text not null references clientes(id) on delete cascade,
  marca text not null,
  modelo text not null,
  anio text,
  placa text,
  created_at timestamptz default now()
);

-- 4. refacciones (→ vehiculos, proveedores — both optional)
create table if not exists refacciones (
  id text primary key,
  nombre text not null,
  codigo text,
  categoria text not null,
  unidad text not null default 'pza',
  precio_compra numeric not null,
  stock integer not null default 0,
  stock_minimo integer not null default 1,
  vehiculo_id text references vehiculos(id) on delete set null,
  proveedor_id text references proveedores(id) on delete set null,
  compatibilidad jsonb,
  created_at timestamptz default now()
);

-- 5. trabajos (→ clientes, vehiculos)
create table if not exists trabajos (
  id text primary key,
  cliente_id text not null references clientes(id),
  vehiculo_id text not null references vehiculos(id),
  fecha text not null,
  descripcion text not null,
  mano_de_obra numeric not null default 0,
  refacciones_total numeric not null default 0,
  costo_refacciones numeric not null default 0,
  requiere_factura boolean not null default false,
  folio_fiscal text,
  iva numeric not null default 0,
  total numeric not null,
  estado text not null default 'pendiente',
  estado_facturacion text not null default 'sin_facturar',
  factura_id text,
  created_at timestamptz default now()
);

-- 6. trabajo_partes (→ trabajos)
create table if not exists trabajo_partes (
  id text primary key,
  trabajo_id text not null references trabajos(id) on delete cascade,
  refaccion_id text,
  nombre text not null,
  codigo text,
  cantidad numeric not null,
  precio_compra numeric not null,
  precio_venta numeric not null,
  subtotal numeric not null,
  costo_total numeric not null
);

-- 7. trabajo_labor_items (→ trabajos)
create table if not exists trabajo_labor_items (
  id text primary key,
  trabajo_id text not null references trabajos(id) on delete cascade,
  concepto text not null,
  precio numeric not null
);

-- 8. trabajo_pagos (→ trabajos)
create table if not exists trabajo_pagos (
  id text primary key,
  trabajo_id text not null references trabajos(id) on delete cascade,
  fecha text not null,
  monto numeric not null,
  nota text
);

-- 9. ordenes_compra (→ proveedores)
create table if not exists ordenes_compra (
  id text primary key,
  proveedor_id text not null references proveedores(id),
  fecha text not null,
  numero_orden text,
  descripcion text,
  total numeric not null,
  estado text not null default 'pendiente',
  fecha_recibida text,
  created_at timestamptz default now()
);

-- 10. orden_partes (→ ordenes_compra)
create table if not exists orden_partes (
  id text primary key,
  orden_id text not null references ordenes_compra(id) on delete cascade,
  refaccion_id text,
  nombre text not null,
  cantidad numeric not null,
  precio_compra numeric not null,
  subtotal numeric not null
);

-- 11. orden_pagos (→ ordenes_compra)
create table if not exists orden_pagos (
  id text primary key,
  orden_id text not null references ordenes_compra(id) on delete cascade,
  fecha text not null,
  monto numeric not null,
  nota text
);

-- 12. facturas (→ clientes, vehiculos; trabajos ref added below)
create table if not exists facturas (
  id text primary key,
  numero_factura text not null,
  trabajo_id text references trabajos(id) on delete set null,
  cliente_id text not null references clientes(id),
  vehiculo_id text references vehiculos(id),
  fecha text not null,
  fecha_vencimiento text,
  subtotal numeric not null,
  iva numeric default 0,
  total numeric not null,
  notas text,
  created_at timestamptz default now()
);

-- 13. factura_conceptos (→ facturas)
create table if not exists factura_conceptos (
  id text primary key,
  factura_id text not null references facturas(id) on delete cascade,
  tipo text not null,
  descripcion text not null,
  cantidad numeric not null,
  precio_unitario numeric not null,
  subtotal numeric not null
);

-- 14. factura_pagos (→ facturas)
create table if not exists factura_pagos (
  id text primary key,
  factura_id text not null references facturas(id) on delete cascade,
  fecha text not null,
  monto numeric not null,
  metodo_pago text not null
);

-- Add FK from trabajos → facturas (added after facturas table exists)
alter table trabajos
  add constraint trabajos_factura_id_fkey
  foreign key (factura_id) references facturas(id) on delete set null
  not valid;  -- 'not valid' avoids scanning existing rows

-- ─── Disable RLS on all tables (single-shop internal tool, no auth yet) ─────
alter table clientes       disable row level security;
alter table vehiculos      disable row level security;
alter table refacciones    disable row level security;
alter table proveedores    disable row level security;
alter table trabajos       disable row level security;
alter table trabajo_partes disable row level security;
alter table trabajo_labor_items disable row level security;
alter table trabajo_pagos  disable row level security;
alter table ordenes_compra disable row level security;
alter table orden_partes   disable row level security;
alter table orden_pagos    disable row level security;
alter table facturas       disable row level security;
alter table factura_conceptos disable row level security;
alter table factura_pagos  disable row level security;

-- ─── Enable realtime on key tables ─────────────────────────────────────────
-- Run in Supabase Dashboard → Database → Replication → enable for these tables:
-- clientes, vehiculos, refacciones, trabajos, proveedores, ordenes_compra, facturas
-- (Or use: alter publication supabase_realtime add table clientes, vehiculos, ...;)
