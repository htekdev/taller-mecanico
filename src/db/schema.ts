/**
 * Drizzle ORM Schema — Taller Mecánico
 *
 * This is the single source of truth for the database schema.
 * Any schema changes should be made here, then generate a migration with:
 *   npm run db:generate
 *
 * Tables mirror the existing Supabase schema (supabase/schema.sql).
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  boolean,
  integer,
  decimal,
  jsonb,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Talleres (Shops) ─────────────────────────────────────────

export const talleres = pgTable('talleres', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: text('nombre').notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── Taller Members ───────────────────────────────────────────

export const tallerMembers = pgTable('taller_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  tallerId: uuid('taller_id').notNull().references(() => talleres.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  role: text('role').default('mechanic'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  unique('taller_members_taller_id_user_id_key').on(table.tallerId, table.userId),
  check('taller_members_role_check', sql`${table.role} IN ('owner', 'mechanic')`),
]);

// ── Taller Invites ───────────────────────────────────────────

export const tallerInvites = pgTable('taller_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  tallerId: uuid('taller_id').notNull().references(() => talleres.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  token: text('token').default(sql`gen_random_uuid()::TEXT`),
  invitedBy: uuid('invited_by'),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── Clientes ─────────────────────────────────────────────────

export const clientes = pgTable('clientes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tallerId: uuid('taller_id').notNull().references(() => talleres.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  telefono: text('telefono').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── Vehículos ────────────────────────────────────────────────

export const vehiculos = pgTable('vehiculos', {
  id: uuid('id').defaultRandom().primaryKey(),
  tallerId: uuid('taller_id').notNull().references(() => talleres.id, { onDelete: 'cascade' }),
  clienteId: uuid('cliente_id').references(() => clientes.id, { onDelete: 'cascade' }),
  marca: text('marca').notNull(),
  modelo: text('modelo').default(''),
  anio: text('anio').default(''),
  placa: text('placa').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── Refacciones (Inventario) ─────────────────────────────────

export const refacciones = pgTable('refacciones', {
  id: uuid('id').defaultRandom().primaryKey(),
  tallerId: uuid('taller_id').notNull().references(() => talleres.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  codigo: text('codigo').default(''),
  categoria: text('categoria').default(''),
  unidad: text('unidad').default('pieza'),
  precioCompra: decimal('precio_compra', { precision: 12, scale: 2 }).default('0'),
  stock: integer('stock').default(0),
  stockMinimo: integer('stock_minimo').default(0),
  vehiculoId: uuid('vehiculo_id'),
  proveedorId: uuid('proveedor_id'),
  compatibilidad: jsonb('compatibilidad'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── Proveedores ──────────────────────────────────────────────

export const proveedores = pgTable('proveedores', {
  id: uuid('id').defaultRandom().primaryKey(),
  tallerId: uuid('taller_id').notNull().references(() => talleres.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  telefono: text('telefono').default(''),
  contacto: text('contacto'),
  notas: text('notas'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── Trabajos (Work Orders) ───────────────────────────────────

export const trabajos = pgTable('trabajos', {
  id: uuid('id').defaultRandom().primaryKey(),
  tallerId: uuid('taller_id').notNull().references(() => talleres.id, { onDelete: 'cascade' }),
  clienteId: uuid('cliente_id').references(() => clientes.id, { onDelete: 'set null' }),
  vehiculoId: uuid('vehiculo_id').references(() => vehiculos.id, { onDelete: 'set null' }),
  fecha: date('fecha').notNull(),
  descripcion: text('descripcion').default(''),
  manoDeObra: decimal('mano_de_obra', { precision: 12, scale: 2 }).default('0'),
  manoDeObraItems: jsonb('mano_de_obra_items').default([]),
  refaccionesTotal: decimal('refacciones_total', { precision: 12, scale: 2 }).default('0'),
  costoRefacciones: decimal('costo_refacciones', { precision: 12, scale: 2 }).default('0'),
  requiereFactura: boolean('requiere_factura').default(false),
  folioFiscal: text('folio_fiscal'),
  iva: decimal('iva', { precision: 12, scale: 2 }).default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).default('0'),
  partes: jsonb('partes').default([]),
  pagos: jsonb('pagos').default([]),
  facturaId: uuid('factura_id'),
  estadoFacturacion: text('estado_facturacion').default('sin_facturar'),
  estado: text('estado').default('pendiente'),
  tipoDocumento: text('tipo_documento'),
  fechaFinalizacion: timestamp('fecha_finalizacion', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  check('trabajos_estado_facturacion_check', sql`${table.estadoFacturacion} IN ('sin_facturar', 'facturado')`),
  check('trabajos_estado_check', sql`${table.estado} IN ('pendiente', 'completado', 'pagado')`),
  check('trabajos_tipo_documento_check', sql`${table.tipoDocumento} IN ('factura', 'nota')`),
]);

// ── Órdenes de Compra ────────────────────────────────────────

export const ordenesCompra = pgTable('ordenes_compra', {
  id: uuid('id').defaultRandom().primaryKey(),
  tallerId: uuid('taller_id').notNull().references(() => talleres.id, { onDelete: 'cascade' }),
  proveedorId: uuid('proveedor_id').references(() => proveedores.id, { onDelete: 'set null' }),
  fecha: date('fecha').notNull(),
  numeroOrden: text('numero_orden'),
  descripcion: text('descripcion').default(''),
  partes: jsonb('partes').default([]),
  total: decimal('total', { precision: 12, scale: 2 }).default('0'),
  estado: text('estado').default('pendiente'),
  fechaRecibida: date('fecha_recibida'),
  pagos: jsonb('pagos').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  check('ordenes_compra_estado_check', sql`${table.estado} IN ('pendiente', 'recibida', 'cancelada')`),
]);

// ── Facturas ─────────────────────────────────────────────────

export const facturas = pgTable('facturas', {
  id: uuid('id').defaultRandom().primaryKey(),
  tallerId: uuid('taller_id').notNull().references(() => talleres.id, { onDelete: 'cascade' }),
  numeroFactura: text('numero_factura'),
  trabajoId: uuid('trabajo_id').references(() => trabajos.id, { onDelete: 'set null' }),
  clienteId: uuid('cliente_id').references(() => clientes.id, { onDelete: 'set null' }),
  vehiculoId: uuid('vehiculo_id').references(() => vehiculos.id, { onDelete: 'set null' }),
  fecha: date('fecha').notNull(),
  fechaVencimiento: date('fecha_vencimiento'),
  conceptos: jsonb('conceptos').default([]),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).default('0'),
  iva: decimal('iva', { precision: 12, scale: 2 }),
  total: decimal('total', { precision: 12, scale: 2 }).default('0'),
  pagos: jsonb('pagos').default([]),
  notas: text('notas'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
