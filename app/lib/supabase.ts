import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Lazy singleton — only valid at runtime (not during SSR/prerender without env vars)
export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseAnon || 'placeholder-anon-key',
);

// ── Database row types (snake_case from Supabase) ──────────────

export interface TallerRow {
  id: string;
  nombre: string;
  created_by: string | null;
  created_at: string;
}

/** TallerRow enriched with the current user's role in that taller */
export interface TallerConRol extends TallerRow {
  role: 'owner' | 'mechanic';
}

export interface TallerMemberRow {
  id: string;
  taller_id: string;
  user_id: string;
  role: 'owner' | 'mechanic';
  created_at: string;
}

export interface TallerInviteRow {
  id: string;
  taller_id: string;
  email: string;
  token: string;
  invited_by: string | null;
  used_at: string | null;
  created_at: string;
}

export interface ClienteRow {
  id: string;
  taller_id: string;
  nombre: string;
  telefono: string;
  created_at: string;
}

export interface VehiculoRow {
  id: string;
  taller_id: string;
  cliente_id: string | null;
  marca: string;
  modelo: string;
  anio: string;
  placa: string;
  created_at: string;
}

export interface RefaccionRow {
  id: string;
  taller_id: string;
  nombre: string;
  codigo: string;
  categoria: string;
  unidad: string;
  precio_compra: number;
  stock: number;
  stock_minimo: number;
  vehiculo_id: string | null;
  proveedor_id: string | null;
  compatibilidad: unknown | null;
  created_at: string;
}

export interface ProveedorRow {
  id: string;
  taller_id: string;
  nombre: string;
  telefono: string;
  contacto: string | null;
  notas: string | null;
  created_at: string;
}

export interface TrabajoRow {
  id: string;
  taller_id: string;
  cliente_id: string | null;
  vehiculo_id: string | null;
  fecha: string;
  descripcion: string;
  mano_de_obra: number;
  mano_de_obra_items: unknown[];
  refacciones_total: number;
  costo_refacciones: number;
  requiere_factura: boolean;
  folio_fiscal: string | null;
  iva: number;
  total: number;
  partes: unknown[];
  pagos: unknown[];
  factura_id: string | null;
  estado_facturacion: 'sin_facturar' | 'facturado';
  factura_pdf_url: string | null;
  estado: 'pendiente' | 'completado' | 'pagado';
  created_at: string;
}

export interface OrdenCompraRow {
  id: string;
  taller_id: string;
  proveedor_id: string | null;
  fecha: string;
  numero_orden: string | null;
  descripcion: string;
  partes: unknown[];
  total: number;
  estado: 'pendiente' | 'recibida' | 'cancelada';
  fecha_recibida: string | null;
  pagos: unknown[];
  created_at: string;
}

export interface FacturaRow {
  id: string;
  taller_id: string;
  numero_factura: string | null;
  trabajo_id: string | null;
  cliente_id: string | null;
  vehiculo_id: string | null;
  fecha: string;
  fecha_vencimiento: string | null;
  conceptos: unknown[];
  subtotal: number;
  iva: number | null;
  total: number;
  pagos: unknown[];
  notas: string | null;
  created_at: string;
}
// ── Supabase Storage: Invoice PDF upload ──────────────────────────────────────

/**
 * Upload an invoice PDF to Supabase Storage.
 * Path: facturas/{tallerId}/{trabajoId}/factura.pdf
 * Returns the public URL on success, throws on error.
 */
export async function uploadFacturaPdf(
  tallerId: string,
  trabajoId: string,
  file: File,
): Promise<string> {
  const path = `facturas/${tallerId}/${trabajoId}/factura.pdf`;
  const { error } = await supabase.storage
    .from('facturas')
    .upload(path, file, { contentType: 'application/pdf', upsert: true });
  if (error) throw new Error(`uploadFacturaPdf: ${error.message}`);
  const { data } = supabase.storage.from('facturas').getPublicUrl(path);
  return data.publicUrl;
}
// ── Supabase Storage: Invoice PDF upload ──────────────────────────────────────

/**
 * Upload an invoice PDF to Supabase Storage.
 * Path: facturas/{tallerId}/{trabajoId}/factura.pdf
 * Returns the public URL on success, throws on error.
 */
export async function uploadFacturaPdf(
  tallerId: string,
  trabajoId: string,
  file: File,
): Promise<string> {
  const path = `facturas/${tallerId}/${trabajoId}/factura.pdf`;
  const { error } = await supabase.storage
    .from('facturas')
    .upload(path, file, { contentType: 'application/pdf', upsert: true });
  if (error) throw new Error(`uploadFacturaPdf: ${error.message}`);
  const { data } = supabase.storage.from('facturas').getPublicUrl(path);
  return data.publicUrl;
}
