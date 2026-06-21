-- ============================================================
-- Taller Mecánico — Supabase Multi-Tenant Schema
-- Run this in the Supabase SQL editor to initialize the DB
-- ============================================================

-- ── Talleres (Shops) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS talleres (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre     TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Taller Members ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_members (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id  UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role       TEXT DEFAULT 'mechanic' CHECK (role IN ('owner', 'mechanic')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (taller_id, user_id)
);

-- ── Taller Invites ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_invites (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id   UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  email       TEXT NOT NULL,
  token       TEXT DEFAULT gen_random_uuid()::TEXT,
  invited_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Clientes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id  UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  nombre     TEXT NOT NULL,
  telefono   TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Vehículos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehiculos (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id  UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  marca      TEXT NOT NULL,
  modelo     TEXT DEFAULT '',
  anio       TEXT DEFAULT '',
  placa      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Refacciones (Inventario) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS refacciones (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id      UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  nombre         TEXT NOT NULL,
  codigo         TEXT DEFAULT '',
  categoria      TEXT DEFAULT '',
  unidad         TEXT DEFAULT 'pieza',
  precio_compra  DECIMAL(12,2) DEFAULT 0,
  stock          INTEGER DEFAULT 0,
  stock_minimo   INTEGER DEFAULT 0,
  vehiculo_id    UUID,
  proveedor_id   UUID,
  compatibilidad JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Proveedores ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedores (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id  UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  nombre     TEXT NOT NULL,
  telefono   TEXT DEFAULT '',
  contacto   TEXT,
  notas      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Trabajos (Work Orders) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS trabajos (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id           UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  cliente_id          UUID REFERENCES clientes(id) ON DELETE SET NULL,
  vehiculo_id         UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
  fecha               DATE NOT NULL,
  descripcion         TEXT DEFAULT '',
  mano_de_obra        DECIMAL(12,2) DEFAULT 0,
  mano_de_obra_items  JSONB DEFAULT '[]',
  refacciones_total   DECIMAL(12,2) DEFAULT 0,
  costo_refacciones   DECIMAL(12,2) DEFAULT 0,
  requiere_factura    BOOLEAN DEFAULT false,
  folio_fiscal        TEXT,
  iva                 DECIMAL(12,2) DEFAULT 0,
  total               DECIMAL(12,2) DEFAULT 0,
  partes              JSONB DEFAULT '[]',
  pagos               JSONB DEFAULT '[]',
  factura_id          UUID,
  estado_facturacion  TEXT DEFAULT 'sin_facturar' CHECK (estado_facturacion IN ('sin_facturar', 'facturado')),
  estado              TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado', 'pagado')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Órdenes de Compra ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ordenes_compra (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id      UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  proveedor_id   UUID REFERENCES proveedores(id) ON DELETE SET NULL,
  fecha          DATE NOT NULL,
  numero_orden   TEXT,
  descripcion    TEXT DEFAULT '',
  partes         JSONB DEFAULT '[]',
  total          DECIMAL(12,2) DEFAULT 0,
  estado         TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'recibida', 'cancelada')),
  fecha_recibida DATE,
  pagos          JSONB DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Facturas ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facturas (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taller_id         UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
  numero_factura    TEXT,
  trabajo_id        UUID REFERENCES trabajos(id) ON DELETE SET NULL,
  cliente_id        UUID REFERENCES clientes(id) ON DELETE SET NULL,
  vehiculo_id       UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
  fecha             DATE NOT NULL,
  fecha_vencimiento DATE,
  conceptos         JSONB DEFAULT '[]',
  subtotal          DECIMAL(12,2) DEFAULT 0,
  iva               DECIMAL(12,2),
  total             DECIMAL(12,2) DEFAULT 0,
  pagos             JSONB DEFAULT '[]',
  notas             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row-Level Security (RLS)
-- All tables: user must be a member of the taller
-- ============================================================

ALTER TABLE talleres       ENABLE ROW LEVEL SECURITY;
ALTER TABLE taller_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE taller_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE refacciones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas       ENABLE ROW LEVEL SECURITY;

-- Helper function: is current user a member of a given taller?
CREATE OR REPLACE FUNCTION is_taller_member(tid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM taller_members
    WHERE taller_id = tid AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- talleres: creator can always see their own taller; members can see talleres they belong to
CREATE POLICY "ver_mis_talleres" ON talleres
  FOR SELECT USING (created_by = auth.uid() OR is_taller_member(id));

-- Any authenticated user can create a new taller
CREATE POLICY "crear_taller" ON talleres
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "editar_mi_taller" ON talleres
  FOR UPDATE USING (is_taller_member(id));

-- taller_members: see your own memberships + your taller's members
CREATE POLICY "ver_mis_memberships" ON taller_members
  FOR SELECT USING (user_id = auth.uid() OR is_taller_member(taller_id));

-- Users can add themselves; existing members can add others (invite flow)
CREATE POLICY "insertar_membership" ON taller_members
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_taller_member(taller_id));

-- taller_invites: only taller members can manage invites
CREATE POLICY "ver_invitaciones" ON taller_invites
  FOR ALL USING (is_taller_member(taller_id));

-- Business tables: full CRUD for taller members
CREATE POLICY "crud_clientes"       ON clientes       FOR ALL USING (is_taller_member(taller_id)) WITH CHECK (is_taller_member(taller_id));
CREATE POLICY "crud_vehiculos"      ON vehiculos      FOR ALL USING (is_taller_member(taller_id)) WITH CHECK (is_taller_member(taller_id));
CREATE POLICY "crud_refacciones"    ON refacciones    FOR ALL USING (is_taller_member(taller_id)) WITH CHECK (is_taller_member(taller_id));
CREATE POLICY "crud_proveedores"    ON proveedores    FOR ALL USING (is_taller_member(taller_id)) WITH CHECK (is_taller_member(taller_id));
CREATE POLICY "crud_trabajos"       ON trabajos       FOR ALL USING (is_taller_member(taller_id)) WITH CHECK (is_taller_member(taller_id));
CREATE POLICY "crud_ordenes_compra" ON ordenes_compra FOR ALL USING (is_taller_member(taller_id)) WITH CHECK (is_taller_member(taller_id));
CREATE POLICY "crud_facturas"       ON facturas       FOR ALL USING (is_taller_member(taller_id)) WITH CHECK (is_taller_member(taller_id));
