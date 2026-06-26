// ─── Types ────────────────────────────────────────────────────────────────────

export interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;   // opcional — no todos los clientes dan teléfono
  email?: string;      // correo principal
  email2?: string;     // correo secundario (opcional)
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

// Pago individual al proveedor de un servicio externo
export interface PagoServicioExterno {
  id: string;
  fecha: string;
  monto: number;
  metodoPago?: string;
  nota?: string;
}

export interface ManoDeObraItem {
  id: string;
  concepto: string;
  precio: number;       // precio cobrado al cliente
  // ── Servicios externos (Opción 4) ─────────────────────────
  tipo?: 'interno' | 'externo';
  proveedorId?: string;       // FK a Proveedor
  proveedorNombre?: string;   // snapshot del nombre
  costoTaller?: number;       // lo que le cobran al taller
  pagosServicio?: PagoServicioExterno[]; // pagos al proveedor externo
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

export interface ItemCompatibilidad {
  marca: string;    // ej. "Ford", "Isuzu" — obligatoria
  modelo?: string;  // ej. "F-150", "ELF" — opcional
}

export interface CompraItem {
  refaccionId: string;
  nombre: string;    // snapshot
  cantidad: number;
  precioCompra: number;
  subtotal: number;
  compatibilidad?: ItemCompatibilidad[]; // vehículos compatibles con esta pieza
}

export interface PagoCompra {
  id: string;
  fecha: string;
  monto: number;
  metodoPago?: string;
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
  subtotalSinIVA: number;  // total de piezas sin IVA
  ivaAmount: number;       // 16% IVA si conIVA=true, 0 si no
  total: number;           // subtotalSinIVA + ivaAmount
  conIVA: boolean;         // ¿la factura del proveedor incluye IVA?
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
  kilometraje?: number;            // Kilometraje registrado al ingreso del vehículo
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
  /** Set at finalization: 'factura' = with IVA (16%), 'nota' = without IVA */
  tipoDocumento?: 'factura' | 'nota';
  /** ISO date-time when the job was finalized (truck left the shop) */
  fechaFinalizacion?: string;
  /** 'general' for regular clients, 'ayuntamiento' for government municipality */
  tipoCliente?: 'general' | 'ayuntamiento';
  departamento?: string;
  inventarioNum?: string;
  ordenServicioGob?: string;
  tftNumero?: string;
  tftEstado?: 'sin_tft' | 'con_tft';
  fechaEntrada?: string;
  fechaSalida?: string;
  /** True when job was converted from cotización without all parts in inventory */
  pendienteRefacciones?: boolean;
  /** Names of parts that were missing from inventory at conversion time */
  refaccionesPendientesNombres?: string[];
}

export interface PricingIntel {
  cost: number;
  markups: { pct: number; price: number }[];        // 30/40/50% suggestions
  clientLastSale: { precio: number; fecha: string } | null;  // last price to THIS client
  clientAllSales: { precio: number; fecha: string }[];
  otherMin: number | null;   // min price charged to other clients
  otherMax: number | null;   // max price charged to other clients
}

// ─── Gastos (Operating Expenses) ─────────────────────────────────────────────

export type GastoCategoria = 'operativo' | 'administrativo' | 'impuesto' | 'nomina';

export const GASTO_CATEGORIAS: { key: GastoCategoria; label: string; emoji: string }[] = [
  { key: 'operativo',      label: 'Operativos',       emoji: '🏠' },
  { key: 'administrativo', label: 'Administrativos',   emoji: '🌐' },
  { key: 'impuesto',       label: 'Impuestos',         emoji: '🧾' },
  { key: 'nomina',         label: 'Nómina',            emoji: '👷' },
];

export const GASTO_SUBCATEGORIAS: Record<GastoCategoria, string[]> = {
  operativo:      ['Renta', 'Agua', 'Luz / CFE', 'Internet', 'Comida empleados', 'Herramientas', 'Materiales', 'Otro'],
  administrativo: ['Papelería', 'Software', 'Teléfono', 'Contabilidad', 'Otro'],
  impuesto:       ['ISR', 'IVA por pagar', 'Tenencias', 'IMSS', 'Otro'],
  nomina:         ['Salario', 'Aguinaldo', 'Vacaciones', 'Bonos', 'Otro'],
};

export interface Gasto {
  id: string;
  tallerId: string;
  categoria: GastoCategoria;
  subcategoria: string;
  concepto: string;
  monto: number;
  fecha: string;       // ISO date YYYY-MM-DD
  notas?: string;
}
