CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facturas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"numero_factura" text,
	"trabajo_id" uuid,
	"cliente_id" uuid,
	"vehiculo_id" uuid,
	"fecha" date NOT NULL,
	"fecha_vencimiento" date,
	"conceptos" jsonb DEFAULT '[]'::jsonb,
	"subtotal" numeric(12, 2) DEFAULT '0',
	"iva" numeric(12, 2),
	"total" numeric(12, 2) DEFAULT '0',
	"pagos" jsonb DEFAULT '[]'::jsonb,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ordenes_compra" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"proveedor_id" uuid,
	"fecha" date NOT NULL,
	"numero_orden" text,
	"descripcion" text DEFAULT '',
	"partes" jsonb DEFAULT '[]'::jsonb,
	"total" numeric(12, 2) DEFAULT '0',
	"estado" text DEFAULT 'pendiente',
	"fecha_recibida" date,
	"pagos" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ordenes_compra_estado_check" CHECK ("ordenes_compra"."estado" IN ('pendiente', 'recibida', 'cancelada'))
);
--> statement-breakpoint
CREATE TABLE "proveedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text DEFAULT '',
	"contacto" text,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refacciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"codigo" text DEFAULT '',
	"categoria" text DEFAULT '',
	"unidad" text DEFAULT 'pieza',
	"precio_compra" numeric(12, 2) DEFAULT '0',
	"stock" integer DEFAULT 0,
	"stock_minimo" integer DEFAULT 0,
	"vehiculo_id" uuid,
	"proveedor_id" uuid,
	"compatibilidad" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "taller_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token" text DEFAULT gen_random_uuid()::TEXT,
	"invited_by" uuid,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "taller_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'mechanic',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "taller_members_taller_id_user_id_key" UNIQUE("taller_id","user_id"),
	CONSTRAINT "taller_members_role_check" CHECK ("taller_members"."role" IN ('owner', 'mechanic'))
);
--> statement-breakpoint
CREATE TABLE "talleres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trabajos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"cliente_id" uuid,
	"vehiculo_id" uuid,
	"fecha" date NOT NULL,
	"descripcion" text DEFAULT '',
	"mano_de_obra" numeric(12, 2) DEFAULT '0',
	"mano_de_obra_items" jsonb DEFAULT '[]'::jsonb,
	"refacciones_total" numeric(12, 2) DEFAULT '0',
	"costo_refacciones" numeric(12, 2) DEFAULT '0',
	"requiere_factura" boolean DEFAULT false,
	"folio_fiscal" text,
	"iva" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2) DEFAULT '0',
	"partes" jsonb DEFAULT '[]'::jsonb,
	"pagos" jsonb DEFAULT '[]'::jsonb,
	"factura_id" uuid,
	"estado_facturacion" text DEFAULT 'sin_facturar',
	"estado" text DEFAULT 'pendiente',
	"tipo_documento" text,
	"fecha_finalizacion" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "trabajos_estado_facturacion_check" CHECK ("trabajos"."estado_facturacion" IN ('sin_facturar', 'facturado')),
	CONSTRAINT "trabajos_estado_check" CHECK ("trabajos"."estado" IN ('pendiente', 'completado', 'pagado')),
	CONSTRAINT "trabajos_tipo_documento_check" CHECK ("trabajos"."tipo_documento" IN ('factura', 'nota'))
);
--> statement-breakpoint
CREATE TABLE "vehiculos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"cliente_id" uuid,
	"marca" text NOT NULL,
	"modelo" text DEFAULT '',
	"anio" text DEFAULT '',
	"placa" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_trabajo_id_trabajos_id_fk" FOREIGN KEY ("trabajo_id") REFERENCES "public"."trabajos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_vehiculo_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refacciones" ADD CONSTRAINT "refacciones_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_invites" ADD CONSTRAINT "taller_invites_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taller_members" ADD CONSTRAINT "taller_members_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trabajos" ADD CONSTRAINT "trabajos_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trabajos" ADD CONSTRAINT "trabajos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trabajos" ADD CONSTRAINT "trabajos_vehiculo_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;