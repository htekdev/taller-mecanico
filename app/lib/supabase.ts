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
  factura_pdf_url: string | null;
  estado_facturacion: 'sin_facturar' | 'facturado';
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
 * Upload invoice PDF to Supabase Storage (private bucket 'facturas').
 * Path: {tallerId}/{trabajoId}/factura.pdf — returns path (not URL).
 * Use createFacturaPdfSignedUrl() to get a viewable URL.
 *
 * Validates:
 * - MIME type must be 'application/pdf' (allows empty for iOS Safari quirk)
 * - File size must not exceed 10 MB
 * - File must start with PDF magic number (%PDF = 0x25 0x50 0x44 0x46)
 */
export async function uploadFacturaPdf(
  tallerId: string,
  trabajoId: string,
  file: File,
): Promise<string> {
  // iOS Safari returns '' for PDFs from Files app — allow empty MIME and rely on magic bytes
  if (file.type !== '' && file.type !== 'application/pdf') {
    throw new Error('MIME_ERROR: Solo se aceptan archivos PDF.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('SIZE_ERROR: El PDF no puede exceder 10 MB.');
  }
  // PDF magic number: %PDF = 0x25 0x50 0x44 0x46
  const buf = await file.slice(0, 4).arrayBuffer();
  const u8 = new Uint8Array(buf);
  if (!(u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46)) {
    throw new Error('MAGIC_ERROR: El archivo no es un PDF válido (encabezado inválido).');
  }

  const path = `${tallerId}/${trabajoId}/factura.pdf`;
  const { error } = await supabase.storage
    .from('facturas')
    .upload(path, file, { contentType: 'application/pdf', upsert: true });
  if (error) throw new Error(`UPLOAD_ERROR: ${error.message}`);
  return path;
}

/**
 * Generate a 1-hour signed URL for viewing a factura PDF.
 */
export async function createFacturaPdfSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('facturas')
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) {
    throw new Error(`createFacturaPdfSignedUrl: ${error?.message ?? 'no signed URL'}`);
  }
  return data.signedUrl;
}
