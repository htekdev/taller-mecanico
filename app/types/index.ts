// ─── Types ────────────────────────────────────────────────────────────────────

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
}

export interface Vehiculo {
  id: string;
  clienteId: string;
  marca: string;
  modelo: string;
  anio: string;
  placa: string;
}

export interface CompatibilidadVehiculo {
  marca: string;     // "Ford", "Isuzu", "Volkswagen"
  modelos: string[]; // ["F-150", "F-250"] — empty means any model of that marca
}

export interface Refaccion {
  id: string;
  nombre: string;
  codigo: string;
  categoria: string;
  unidad: string;
  precioCompra: number;
  stock: number;
  stockMinimo: number;
  vehiculoId?: string;
  proveedorId?: string;
  compatibilidad?: CompatibilidadVehiculo[];  // vacío/undefined = universal (aplica a todos)
}

export interface TrabajoRefaccion {
  refaccionId: string;
  nombre: string;         // SNAPSHOT
  codigo: string;         // SNAPSHOT
  cantidad: number;
  precioCompra: number;   // SNAPSHOT costo proveedor — para calcular utilidad
  precioVenta: number;    // precio cobrado al cliente (editable, defecto = precioCompra)
  subtotal: number;       // cantidad × precioVenta — lo que cobras
  costoTotal: number;     // cantidad × precioCompra — lo que pagaste
}

export interface ManoDeObraItem {
  id: string;
  concepto: string;
  precio: number;
}

export interface Pago {
  id: string;
  fecha: string;
  monto: number;
  nota?: string;
}

// ─── Proveedores, Órdenes de Compra & Facturas ───────────────────────────────

export interface Proveedor {
  id: string;
  nombre: string;
  telefono: string;
  contacto?: string;
  notas?: string;
}

export interface CompraItem {
  refaccionId: string;
  nombre: string;    // snapshot
  cantidad: number;
  precioCompra: number;
  subtotal: number;
}

export interface PagoCompra {
  id: string;
  fecha: string;
  monto: number;
  nota?: string;
}

/** Purchase Order — starts as 'pendiente', inventory increased when 'recibida' */
export interface OrdenCompra {
  id: string;
  proveedorId: string;
  fecha: string;
  numeroOrden?: string;
  descripcion: string;
  partes: CompraItem[];
  total: number;
  estado: 'pendiente' | 'recibida' | 'cancelada';
  fechaRecibida?: string;
  pagos: PagoCompra[];
}

export interface FacturaConcepto {
  tipo: 'parte' | 'mano_de_obra';
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PagoFactura {
  id: string;
  fecha: string;
  monto: number;
  metodoPago: string;  // efectivo, transferencia, tarjeta, cheque...
}

/** Formal invoice generated from a Trabajo */
export interface Factura {
  id: string;
  numeroFactura: string;   // auto-generated e.g. FAC-2026-001
  trabajoId: string;
  clienteId: string;
  vehiculoId: string;
  fecha: string;
  fechaVencimiento?: string;
  conceptos: FacturaConcepto[];
  subtotal: number;
  iva?: number;            // optional tax %
  total: number;
  pagos: PagoFactura[];
  notas?: string;
}

export interface Trabajo {
  id: string;
  clienteId: string;
  vehiculoId: string;
  fecha: string;
  numeroOrden?: string;            // Número de orden manual del taller
  descripcion: string;
  manoDeObra: number;
  manoDeObraItems: ManoDeObraItem[];
  refacciones: number;             // subtotal of parts (before IVA)
  costoRefacciones: number;
  requiereFactura: boolean;        // Mexican fiscal invoice required?
  folioFiscal?: string;            // Tax invoice folio/number
  iva: number;                     // 16% IVA (0 if requiereFactura=false)
  total: number;                   // subtotal + iva = final amount charged
  partes: TrabajoRefaccion[];
  pagos: Pago[];
  facturaId?: string;
  estadoFacturacion?: 'sin_facturar' | 'facturado';
  estado: 'pendiente' | 'completado' | 'pagado';
  /** Set at finalization: 'factura' = with IVA, 'nota' = without IVA */
  tipoDocumento?: 'factura' | 'nota';
  /** ISO date-time when the job was finalized (truck left the shop) */
  fechaFinalizacion?: string;
}

export interface PricingIntel {
  cost: number;
  markups: { pct: number; price: number }[];        // 30/40/50% suggestions
  clientLastSale: { precio: number; fecha: string } | null;  // last price to THIS client
  clientAllSales: { precio: number; fecha: string }[];
  otherMin: number | null;   // min price charged to other clients
  otherMax: number | null;   // max price charged to other clients
}
