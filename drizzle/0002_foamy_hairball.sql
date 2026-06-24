ALTER TABLE "clientes" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "email2" text;--> statement-breakpoint
ALTER TABLE "ordenes_compra" ADD COLUMN "subtotal_sin_iva" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "ordenes_compra" ADD COLUMN "iva_amount" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "ordenes_compra" ADD COLUMN "con_iva" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "taller_members" ADD COLUMN "email" text;