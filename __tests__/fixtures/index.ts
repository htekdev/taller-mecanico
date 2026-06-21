import type {
  Cliente, Vehiculo, Refaccion, Trabajo, Proveedor, OrdenCompra, Factura,
  ManoDeObraItem, TrabajoRefaccion, Pago,
} from '@/app/types';

export const mockCliente: Cliente = {
  id: 'c1',
  nombre: 'Juan García',
  telefono: '555-1234',
};

export const mockCliente2: Cliente = {
  id: 'c2',
  nombre: 'Pedro Martínez',
  telefono: '555-5678',
};

export const mockVehiculo: Vehiculo = {
  id: 'v1',
  clienteId: 'c1',
  marca: 'Ford',
  modelo: 'F-150',
  anio: '2020',
  placa: 'ABC-123',
};

export const mockVehiculo2: Vehiculo = {
  id: 'v2',
  clienteId: 'c2',
  marca: 'Volkswagen',
  modelo: 'Jetta',
  anio: '2019',
  placa: '',
};

export const mockRefaccion: Refaccion = {
  id: 'r1',
  nombre: 'Filtro de aceite',
  codigo: 'FLT-001',
  categoria: 'Filtros',
  unidad: 'pza',
  precioCompra: 150,
  stock: 10,
  stockMinimo: 2,
};

export const mockRefaccionBajoStock: Refaccion = {
  id: 'r2',
  nombre: 'Pastilla de freno',
  codigo: 'FRN-001',
  categoria: 'Frenos',
  unidad: 'par',
  precioCompra: 300,
  stock: 1,
  stockMinimo: 3,
};

export const mockManoDeObraItem: ManoDeObraItem = {
  id: 'mo1',
  concepto: 'Cambio de aceite',
  precio: 200,
};

export const mockPago: Pago = {
  id: 'p1',
  fecha: '2026-06-15',
  monto: 500,
};

export const mockTrabajoRefaccion: TrabajoRefaccion = {
  refaccionId: 'r1',
  nombre: 'Filtro de aceite',
  codigo: 'FLT-001',
  cantidad: 1,
  precioCompra: 150,
  precioVenta: 200,
  subtotal: 200,
  costoTotal: 150,
};

// Trabajo sin pagos (estado: pendiente)
export const mockTrabajo: Trabajo = {
  id: 't1',
  clienteId: 'c1',
  vehiculoId: 'v1',
  fecha: '2026-06-01',
  descripcion: 'Cambio de aceite',
  manoDeObra: 200,
  manoDeObraItems: [mockManoDeObraItem],
  refacciones: 200,
  costoRefacciones: 150,
  requiereFactura: false,
  iva: 0,
  total: 400,
  partes: [mockTrabajoRefaccion],
  pagos: [],
  facturaId: undefined,
  estadoFacturacion: 'sin_facturar',
  estado: 'pendiente',
};

// Trabajo con IVA y pago parcial
export const mockTrabajoConIVA: Trabajo = {
  id: 't2',
  clienteId: 'c2',
  vehiculoId: 'v2',
  fecha: '2026-06-15',
  descripcion: 'Frenos delanteros',
  manoDeObra: 500,
  manoDeObraItems: [{ id: 'mo2', concepto: 'Cambio frenos', precio: 500 }],
  refacciones: 600,
  costoRefacciones: 300,
  requiereFactura: true,
  iva: 176,
  total: 1276,
  partes: [{
    refaccionId: 'r2',
    nombre: 'Pastilla de freno',
    codigo: 'FRN-001',
    cantidad: 2,
    precioCompra: 150,
    precioVenta: 300,
    subtotal: 600,
    costoTotal: 300,
  }],
  pagos: [mockPago],
  facturaId: undefined,
  estadoFacturacion: 'sin_facturar',
  estado: 'pendiente',
};

// Trabajo totalmente pagado
export const mockTrabajoPagado: Trabajo = {
  ...mockTrabajo,
  id: 't3',
  pagos: [{ id: 'p3', fecha: '2026-06-01', monto: 400 }],
};

export const mockProveedor: Proveedor = {
  id: 'pv1',
  nombre: 'Auto Parts Monterrey',
  telefono: '555-9999',
};

export const mockOrden: OrdenCompra = {
  id: 'o1',
  proveedorId: 'pv1',
  fecha: '2026-06-01',
  numeroOrden: 'OC-2026-001',
  descripcion: 'Reposición filtros',
  total: 1500,
  estado: 'pendiente',
  partes: [{
    refaccionId: 'r1',
    nombre: 'Filtro de aceite',
    cantidad: 10,
    precioCompra: 150,
    subtotal: 1500,
  }],
  pagos: [],
};

export const mockOrdenRecibida: OrdenCompra = {
  ...mockOrden,
  id: 'o2',
  estado: 'recibida',
  fechaRecibida: '2026-06-05',
  pagos: [{ id: 'pc1', fecha: '2026-06-05', monto: 1500 }],
};

export const mockFactura: Factura = {
  id: 'f1',
  numeroFactura: 'FAC-2026-001',
  trabajoId: 't2',
  clienteId: 'c2',
  vehiculoId: 'v2',
  fecha: '2026-06-15',
  conceptos: [
    { tipo: 'mano_de_obra', descripcion: 'Cambio frenos', cantidad: 1, precioUnitario: 500, subtotal: 500 },
    { tipo: 'parte', descripcion: 'Pastilla de freno', cantidad: 2, precioUnitario: 300, subtotal: 600 },
  ],
  subtotal: 1100,
  total: 1276,
  pagos: [],
};