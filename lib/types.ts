// ─── Core domain types for Taller Mecánico ───────────────────────────────────

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
  marca: string;
  modelos: string[];
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
  compatibilidad?: CompatibilidadVehiculo[];
}

export interface TrabajoRefaccion {
  refaccionId: string;
  nombre: string;
  codigo: string;
  cantidad: number;
  precioCompra: number;
  precioVenta: number;
  subtotal: number;
  costoTotal: number;
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

export interface Trabajo {
  id: string;
  clienteId: string;
  vehiculoId: string;
  fecha: string;
  descripcion: string;
  manoDeObra: number;
  manoDeObraItems: ManoDeObraItem[];
  refacciones: number;
  costoRefacciones: number;
  requiereFactura: boolean;
  folioFiscal?: string;
  iva: number;
  total: number;
  partes: TrabajoRefaccion[];
  pagos: Pago[];
  facturaId?: string;
  estadoFacturacion?: 'sin_facturar' | 'facturado';
  estado: 'pendiente' | 'completado' | 'pagado';
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
  nombre: string;
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

// Legacy shape kept for localStorage migration compatibility.
export interface Compra {
  id: string;
  proveedorId: string;
  fecha: string;
  descripcion: string;
  items: CompraItem[];
  total: number;
  pagos: PagoCompra[];
}

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

export interface PagoFactura {
  id: string;
  fecha: string;
  monto: number;
  metodoPago: string;
}

export interface FacturaConcepto {
  tipo: 'parte' | 'mano_de_obra';
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

/** Formal fiscal invoice generated from a Trabajo */
export interface Factura {
  id: string;
  numeroFactura: string;
  trabajoId: string;
  clienteId: string;
  vehiculoId: string;
  fecha: string;
  fechaVencimiento?: string;
  conceptos: FacturaConcepto[];
  subtotal: number;
  iva?: number;
  total: number;
  pagos: PagoFactura[];
  notas?: string;
}

// ─── Pricing Intelligence ─────────────────────────────────────────────────────

export interface PricingIntel {
  cost: number;
  markups: { pct: number; price: number }[];
  clientLastSale: { precio: number; fecha: string } | null;
  clientAllSales: { precio: number; fecha: string }[];
  otherMin: number | null;
  otherMax: number | null;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type Vista =
  | 'clientes'
  | 'inventario'
  | 'trabajos'
  | 'cuentas'
  | 'proveedores'
  | 'ordenes'
  | 'facturas'
  | 'resumen';

export type FiltroCuenta = 'todos' | 'pendiente' | 'parcial' | 'pagado';

export type EstadoPago = 'pendiente' | 'parcial' | 'pagado';
