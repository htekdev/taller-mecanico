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
  marca: string;     // "Ford", "Isuzu", "Volkswagen"
  modelos: string[]; // ["F-150", "F-250"] — empty = any model of that marca
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
  compatibilidad?: CompatibilidadVehiculo[]; // undefined = universal
}

export interface TrabajoRefaccion {
  refaccionId: string;
  nombre: string;         // snapshot at time of job
  codigo: string;         // snapshot
  cantidad: number;
  precioCompra: number;   // snapshot — supplier cost
  precioVenta: number;    // snapshot — sale price to customer
  subtotal: number;       // cantidad × precioVenta
  costoTotal: number;     // cantidad × precioCompra
}

export interface ManoDeObraItem {
  id: string;
  concepto: string;
  precio: number;
}

export interface Pago {
  id: string;
  fecha: string; // YYYY-MM-DD
  monto: number;
  nota?: string;
}

export interface Trabajo {
  id: string;
  clienteId: string;
  vehiculoId: string;
  fecha: string;
  descripcion: string;
  manoDeObra: number;          // derived: sum of manoDeObraItems
  manoDeObraItems: ManoDeObraItem[];
  refacciones: number;         // revenue: sum of partes.subtotal
  costoRefacciones: number;    // cost: sum of partes.costoTotal
  total: number;               // manoDeObra + refacciones
  partes: TrabajoRefaccion[];
  pagos: Pago[];               // payment history — empty = pending
  estado: 'pendiente' | 'completado' | 'pagado';
}

// ─── Proveedores & Compras ────────────────────────────────────────────────────

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

export interface Compra {
  id: string;
  proveedorId: string;
  fecha: string;
  descripcion: string;
  items: CompraItem[];
  total: number;
  pagos: PagoCompra[];
}

// ─── Pricing Intelligence ─────────────────────────────────────────────────────

export interface PricingIntel {
  cost: number;
  markups: { pct: number; price: number }[];        // 30/40/50% margin-on-sale suggestions
  clientLastSale: { precio: number; fecha: string } | null; // highest price to this client
  clientAllSales: { precio: number; fecha: string }[];
  otherMin: number | null;  // min price to other clients
  otherMax: number | null;  // max price to other clients
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type Vista =
  | 'clientes'
  | 'inventario'
  | 'trabajos'
  | 'cuentas'
  | 'proveedores'
  | 'pagos'
  | 'resumen';

export type FiltroCuenta = 'todos' | 'pendiente' | 'parcial' | 'pagado';

export type EstadoPago = 'pendiente' | 'parcial' | 'pagado';
