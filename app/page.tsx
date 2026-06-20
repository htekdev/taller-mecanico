'use client';

import { useState, useEffect, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
}

interface Vehiculo {
  id: string;
  clienteId: string;
  marca: string;
  modelo: string;
  anio: string;
  placa: string;
}

interface CompatibilidadVehiculo {
  marca: string;     // "Ford", "Isuzu", "Volkswagen"
  modelos: string[]; // ["F-150", "F-250"] — empty means any model of that marca
}

interface Refaccion {
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

interface TrabajoRefaccion {
  refaccionId: string;
  nombre: string;         // SNAPSHOT
  codigo: string;         // SNAPSHOT
  cantidad: number;
  precioCompra: number;   // SNAPSHOT costo proveedor — para calcular utilidad
  precioVenta: number;    // precio cobrado al cliente (editable, defecto = precioCompra)
  subtotal: number;       // cantidad × precioVenta — lo que cobras
  costoTotal: number;     // cantidad × precioCompra — lo que pagaste
}

interface ManoDeObraItem {
  id: string;
  concepto: string;
  precio: number;
}

interface Pago {
  id: string;
  fecha: string;
  monto: number;
  nota?: string;
}

// ─── Proveedores, Órdenes de Compra & Facturas ───────────────────────────────

interface Proveedor {
  id: string;
  nombre: string;
  telefono: string;
  contacto?: string;
  notas?: string;
}

interface CompraItem {
  refaccionId: string;
  nombre: string;    // snapshot
  cantidad: number;
  precioCompra: number;
  subtotal: number;
}

interface PagoCompra {
  id: string;
  fecha: string;
  monto: number;
  nota?: string;
}

/** Purchase Order — starts as 'pendiente', inventory increased when 'recibida' */
interface OrdenCompra {
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

interface FacturaConcepto {
  tipo: 'parte' | 'mano_de_obra';
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface PagoFactura {
  id: string;
  fecha: string;
  monto: number;
  metodoPago: string;  // efectivo, transferencia, tarjeta, cheque...
}

/** Formal invoice generated from a Trabajo */
interface Factura {
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

interface Trabajo {
  id: string;
  clienteId: string;
  vehiculoId: string;
  fecha: string;
  descripcion: string;
  manoDeObra: number;
  manoDeObraItems: ManoDeObraItem[];
  refacciones: number;
  costoRefacciones: number;
  total: number;
  partes: TrabajoRefaccion[];
  pagos: Pago[];                   // legacy: direct payments (pre-invoice system)
  facturaId?: string;              // set when a Factura has been generated
  estadoFacturacion?: 'sin_facturar' | 'facturado';  // invoice status
  estado: 'pendiente' | 'completado' | 'pagado';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMontoPagado(t: Trabajo): number {
  return (t.pagos ?? []).reduce((s, p) => s + p.monto, 0);
}
function getEstadoPago(t: Trabajo): 'pendiente' | 'parcial' | 'pagado' {
  const pagado = getMontoPagado(t);
  if (pagado <= 0)        return 'pendiente';
  if (pagado >= t.total)  return 'pagado';
  return 'parcial';
}
function getSaldo(t: Trabajo): number {
  return Math.max(0, t.total - getMontoPagado(t));
}

function getMontoPagadoOrden(o: OrdenCompra): number {
  return (o.pagos ?? []).reduce((s, p) => s + p.monto, 0);
}
function getEstadoPagoOrden(o: OrdenCompra): 'pendiente' | 'parcial' | 'pagado' {
  const p = getMontoPagadoOrden(o);
  if (p <= 0) return 'pendiente';
  if (p >= o.total) return 'pagado';
  return 'parcial';
}
function getSaldoOrden(o: OrdenCompra): number {
  return Math.max(0, o.total - getMontoPagadoOrden(o));
}

function getMontoPagadoFactura(f: Factura): number {
  return (f.pagos ?? []).reduce((s, p) => s + p.monto, 0);
}
function getEstadoPagoFactura(f: Factura): 'pendiente' | 'parcial' | 'pagado' {
  const p = getMontoPagadoFactura(f);
  if (p <= 0) return 'pendiente';
  if (p >= f.total) return 'pagado';
  return 'parcial';
}
function getSaldoFactura(f: Factura): number {
  return Math.max(0, f.total - getMontoPagadoFactura(f));
}

/** Auto-generate a factura number like FAC-2026-001 */
function generarNumeroFactura(facturas: Factura[]): string {
  const year = new Date().getFullYear();
  const count = facturas.filter(f => f.numeroFactura.startsWith(`FAC-${year}`)).length + 1;
  return `FAC-${year}-${String(count).padStart(3, '0')}`;
}

/** Auto-generate a purchase order number like OC-2026-001 */
function generarNumeroOrden(ordenes: OrdenCompra[]): string {
  const year = new Date().getFullYear();
  const count = ordenes.filter(o => (o.numeroOrden ?? '').startsWith(`OC-${year}`)).length + 1;
  return `OC-${year}-${String(count).padStart(3, '0')}`;
}

function labelVehiculo(v: Vehiculo) {
  const base = [v.anio, v.marca, v.modelo].filter(Boolean).join(' ');
  return v.placa ? `${base} — ${v.placa}` : base;
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-sm ${props.className ?? ''}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  const { children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-sm ${rest.className ?? ''}`}
    >
      {children}
    </select>
  );
}

function Btn({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  type = 'button',
  onClick,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
}) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm' };
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500 shadow-sm',
    ghost:   'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400',
    danger:  'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 focus:ring-rose-400',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center">
        <div className="text-slate-400 text-sm">{message}</div>
      </td>
    </tr>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function TallerMecanico() {
  const [clientes,    setClientes]    = useState<Cliente[]>([]);
  const [vehiculos,   setVehiculos]   = useState<Vehiculo[]>([]);
  const [inventario,  setInventario]  = useState<Refaccion[]>([]);
  const [trabajos,    setTrabajos]    = useState<Trabajo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenes,     setOrdenes]     = useState<OrdenCompra[]>([]);   // POs
  const [facturas,    setFacturas]    = useState<Factura[]>([]);
  const [vista, setVista] = useState<'clientes'|'inventario'|'trabajos'|'proveedores'|'ordenes'|'facturas'|'cuentas'|'pagos'|'resumen'>('clientes');
  const [mesActual, setMesActual] = useState(new Date().toISOString().slice(0, 7));

  // ── Cargar datos con migración de formatos anteriores ──
  useEffect(() => {
    const rawClientes    = localStorage.getItem('clientes');
    const rawVehiculos   = localStorage.getItem('vehiculos');
    const rawInventario  = localStorage.getItem('inventario');
    const rawTrabajos    = localStorage.getItem('trabajos');
    const rawProveedores = localStorage.getItem('proveedores');
    const rawOrdenes     = localStorage.getItem('ordenes');
    const rawCompras     = localStorage.getItem('compras');  // legacy key
    const rawFacturas    = localStorage.getItem('facturas');

    type ClienteViejo = Cliente & { vehiculo?: string };
    let parsedClientes: ClienteViejo[]  = rawClientes  ? JSON.parse(rawClientes)  : [];
    let parsedVehiculos: Vehiculo[]     = rawVehiculos  ? JSON.parse(rawVehiculos) : [];
    const parsedInventario: Refaccion[] = rawInventario ? JSON.parse(rawInventario) : [];

    if (parsedClientes.some(c => 'vehiculo' in c && c.vehiculo)) {
      const migrados: Vehiculo[] = [];
      parsedClientes = parsedClientes.map(({ vehiculo, ...c }) => {
        if (vehiculo) migrados.push({ id: `mig_${c.id}`, clienteId: c.id, marca: vehiculo, modelo: '', anio: '', placa: '' });
        return c;
      });
      parsedVehiculos = [...parsedVehiculos, ...migrados];
      localStorage.setItem('clientes',  JSON.stringify(parsedClientes));
      localStorage.setItem('vehiculos', JSON.stringify(parsedVehiculos));
    }

    const parsedTrabajos: Trabajo[] = (rawTrabajos ? JSON.parse(rawTrabajos) : [])
      .map((t: Trabajo & { manoDeObra: number }) => {
        const partes: TrabajoRefaccion[] = (t.partes ?? []).map(
          (p: TrabajoRefaccion & { precioUnitario?: number }) => ({
            ...p,
            precioCompra: p.precioCompra ?? p.precioUnitario ?? 0,
            precioVenta:  p.precioVenta  ?? p.precioUnitario ?? 0,
            costoTotal:   p.costoTotal   ?? p.subtotal       ?? 0,
          })
        );
        return {
          ...t, partes,
          manoDeObraItems: t.manoDeObraItems ?? (t.manoDeObra > 0 ? [{ id: `mig_${t.id}`, concepto: 'Mano de obra', precio: t.manoDeObra }] : []),
          costoRefacciones: t.costoRefacciones ?? partes.reduce((s, p) => s + p.costoTotal, 0) ?? t.refacciones,
          pagos: t.pagos ?? [],
          estadoFacturacion: t.estadoFacturacion ?? 'sin_facturar',
        };
      });

    // Migrate legacy `compras` → `ordenes` (all treated as already-received POs)
    let parsedOrdenes: OrdenCompra[] = rawOrdenes ? JSON.parse(rawOrdenes) : [];
    if (!rawOrdenes && rawCompras) {
      type CompraLegacy = { id: string; proveedorId: string; fecha: string; descripcion: string; items: CompraItem[]; total: number; pagos: PagoCompra[] };
      const legacyCompras: CompraLegacy[] = JSON.parse(rawCompras);
      parsedOrdenes = legacyCompras.map(c => ({
        id: c.id, proveedorId: c.proveedorId, fecha: c.fecha,
        descripcion: c.descripcion, partes: c.items, total: c.total,
        estado: 'recibida' as const, fechaRecibida: c.fecha,
        pagos: c.pagos ?? [],
        numeroOrden: undefined,
      }));
      localStorage.setItem('ordenes', JSON.stringify(parsedOrdenes));
    }

    setClientes(parsedClientes);
    setVehiculos(parsedVehiculos);
    setInventario(parsedInventario);
    setTrabajos(parsedTrabajos);
    setProveedores(rawProveedores ? JSON.parse(rawProveedores) : []);
    setOrdenes(parsedOrdenes);
    setFacturas(rawFacturas ? JSON.parse(rawFacturas) : []);
  }, []);

  // ── Handlers ──

  const guardarCliente = (data: Omit<Cliente, 'id'>) => {
    const nuevo: Cliente = { ...data, id: Date.now().toString() };
    const nuevos = [...clientes, nuevo];
    setClientes(nuevos); localStorage.setItem('clientes', JSON.stringify(nuevos));
  };
  const guardarVehiculo = (data: Omit<Vehiculo, 'id'>) => {
    const nuevo: Vehiculo = { ...data, id: Date.now().toString() };
    const nuevos = [...vehiculos, nuevo];
    setVehiculos(nuevos); localStorage.setItem('vehiculos', JSON.stringify(nuevos));
  };
  const guardarRefaccion = (data: Omit<Refaccion, 'id'>) => {
    const nuevo: Refaccion = { ...data, id: Date.now().toString() };
    const nuevos = [...inventario, nuevo];
    setInventario(nuevos); localStorage.setItem('inventario', JSON.stringify(nuevos));
  };
  const recibirStock = (refaccionId: string, cantidad: number) => {
    const nuevos = inventario.map(r => r.id === refaccionId ? { ...r, stock: r.stock + cantidad } : r);
    setInventario(nuevos); localStorage.setItem('inventario', JSON.stringify(nuevos));
  };
  const guardarTrabajo = (data: Omit<Trabajo, 'id' | 'total'>) => {
    const total = data.manoDeObra + data.refacciones;
    const nuevo: Trabajo = { ...data, id: Date.now().toString(), total, estadoFacturacion: 'sin_facturar' };
    if (data.partes.length > 0) {
      const nuevoInv = inventario.map(r => {
        const usada = data.partes.find(p => p.refaccionId === r.id);
        return usada ? { ...r, stock: r.stock - usada.cantidad } : r;
      });
      setInventario(nuevoInv); localStorage.setItem('inventario', JSON.stringify(nuevoInv));
    }
    const nuevos = [...trabajos, nuevo];
    setTrabajos(nuevos); localStorage.setItem('trabajos', JSON.stringify(nuevos));
  };
  const registrarPago = (trabajoId: string, pago: Omit<Pago, 'id'>) => {
    const nuevoPago: Pago = { ...pago, id: Date.now().toString() };
    const nuevos = trabajos.map(t => t.id === trabajoId ? { ...t, pagos: [...(t.pagos ?? []), nuevoPago] } : t);
    setTrabajos(nuevos); localStorage.setItem('trabajos', JSON.stringify(nuevos));
  };
  const guardarProveedor = (data: Omit<Proveedor, 'id'>) => {
    const nuevo: Proveedor = { ...data, id: Date.now().toString() };
    const nuevos = [...proveedores, nuevo];
    setProveedores(nuevos); localStorage.setItem('proveedores', JSON.stringify(nuevos));
  };

  // ── Purchase Order handlers ──
  const crearOrden = (data: Omit<OrdenCompra, 'id' | 'estado' | 'fechaRecibida' | 'pagos'>) => {
    const nueva: OrdenCompra = {
      ...data, id: Date.now().toString(),
      numeroOrden: data.numeroOrden || generarNumeroOrden(ordenes),
      estado: 'pendiente', pagos: [],
    };
    const nuevas = [...ordenes, nueva];
    setOrdenes(nuevas); localStorage.setItem('ordenes', JSON.stringify(nuevas));
  };
  const recibirOrden = (ordenId: string) => {
    const orden = ordenes.find(o => o.id === ordenId);
    if (!orden || orden.estado !== 'pendiente') return;
    // Mark as received
    const nuevasOrdenes = ordenes.map(o =>
      o.id === ordenId ? { ...o, estado: 'recibida' as const, fechaRecibida: new Date().toISOString().split('T')[0] } : o
    );
    setOrdenes(nuevasOrdenes); localStorage.setItem('ordenes', JSON.stringify(nuevasOrdenes));
    // Increase inventory
    if (orden.partes.length > 0) {
      const nuevoInv = inventario.map(r => {
        const item = orden.partes.find(p => p.refaccionId === r.id);
        return item ? { ...r, stock: r.stock + item.cantidad } : r;
      });
      setInventario(nuevoInv); localStorage.setItem('inventario', JSON.stringify(nuevoInv));
    }
  };
  const cancelarOrden = (ordenId: string) => {
    const nuevas = ordenes.map(o => o.id === ordenId ? { ...o, estado: 'cancelada' as const } : o);
    setOrdenes(nuevas); localStorage.setItem('ordenes', JSON.stringify(nuevas));
  };
  const registrarPagoOrden = (ordenId: string, pago: Omit<PagoCompra, 'id'>) => {
    const nuevoPago: PagoCompra = { ...pago, id: Date.now().toString() };
    const nuevas = ordenes.map(o => o.id === ordenId ? { ...o, pagos: [...(o.pagos ?? []), nuevoPago] } : o);
    setOrdenes(nuevas); localStorage.setItem('ordenes', JSON.stringify(nuevas));
  };

  // ── Invoice (Factura) handlers ──
  const generarFactura = (trabajoId: string) => {
    const trabajo = trabajos.find(t => t.id === trabajoId);
    if (!trabajo || trabajo.facturaId) return;
    // Build conceptos from trabajo
    const conceptos: FacturaConcepto[] = [
      ...trabajo.manoDeObraItems.map(m => ({
        tipo: 'mano_de_obra' as const,
        descripcion: m.concepto,
        cantidad: 1,
        precioUnitario: m.precio,
        subtotal: m.precio,
      })),
      ...trabajo.partes.map(p => ({
        tipo: 'parte' as const,
        descripcion: p.nombre,
        cantidad: p.cantidad,
        precioUnitario: p.precioVenta,
        subtotal: p.subtotal,
      })),
    ];
    const subtotal = conceptos.reduce((s, c) => s + c.subtotal, 0);
    const nuevaFactura: Factura = {
      id: Date.now().toString(),
      numeroFactura: generarNumeroFactura(facturas),
      trabajoId, clienteId: trabajo.clienteId, vehiculoId: trabajo.vehiculoId,
      fecha: new Date().toISOString().split('T')[0],
      conceptos, subtotal, total: subtotal, pagos: [],
    };
    const nuevasFacturas = [...facturas, nuevaFactura];
    setFacturas(nuevasFacturas); localStorage.setItem('facturas', JSON.stringify(nuevasFacturas));
    // Link factura back to trabajo
    const nuevosTrabajos = trabajos.map(t =>
      t.id === trabajoId ? { ...t, facturaId: nuevaFactura.id, estadoFacturacion: 'facturado' as const } : t
    );
    setTrabajos(nuevosTrabajos); localStorage.setItem('trabajos', JSON.stringify(nuevosTrabajos));
  };
  const registrarPagoFactura = (facturaId: string, pago: Omit<PagoFactura, 'id'>) => {
    const nuevoPago: PagoFactura = { ...pago, id: Date.now().toString() };
    const nuevas = facturas.map(f => f.id === facturaId ? { ...f, pagos: [...(f.pagos ?? []), nuevoPago] } : f);
    setFacturas(nuevas); localStorage.setItem('facturas', JSON.stringify(nuevas));
  };

  const calcularResumen = () => {
    const mes = trabajos.filter(t => t.fecha.startsWith(mesActual));
    const facturadoMes       = mes.reduce((s, t) => s + t.total, 0);
    const totalVentaRef      = mes.reduce((s, t) => s + t.refacciones, 0);
    const totalCostoRef      = mes.reduce((s, t) => s + (t.costoRefacciones ?? t.refacciones), 0);
    const totalManoObra      = mes.reduce((s, t) => s + t.manoDeObra, 0);
    const margenRef          = totalVentaRef - totalCostoRef;
    const ganancia           = totalManoObra + margenRef;
    // Cash metrics from invoices
    const cobradoEnMes = facturas.reduce((s, f) =>
      s + (f.pagos ?? []).filter(p => p.fecha.startsWith(mesActual)).reduce((s2, p) => s2 + p.monto, 0), 0);
    const porCobrarDelMes = facturas.filter(f => {
      const t = trabajos.find(t => t.id === f.trabajoId);
      return t?.fecha.startsWith(mesActual);
    }).reduce((s, f) => s + getSaldoFactura(f), 0);
    // POs this month
    const ordenesMes    = ordenes.filter(o => o.fecha.startsWith(mesActual) && o.estado !== 'cancelada');
    const totalOrdenes  = ordenesMes.reduce((s, o) => s + o.total, 0);
    const porPagarOrdenes = ordenesMes.filter(o => o.estado === 'recibida').reduce((s, o) => s + getSaldoOrden(o), 0);
    return {
      facturadoMes, totalVentaRef, totalCostoRef, margenRef, totalManoObra, ganancia,
      cantidad: mes.length, cobradoEnMes, porCobrarDelMes, totalOrdenes, porPagarOrdenes,
    };
  };

  const stockBajo              = inventario.filter(r => r.stock <= r.stockMinimo).length;
  const facturasPendientes     = facturas.filter(f => getEstadoPagoFactura(f) !== 'pagado').length;
  const ordenesPendientesPago  = ordenes.filter(o => o.estado === 'recibida' && getEstadoPagoOrden(o) !== 'pagado').length;
  const ordenesPendientesRecibir = ordenes.filter(o => o.estado === 'pendiente').length;

  const tabs = [
    { key: 'clientes',    icon: '👥', label: 'Clientes',         count: clientes.length },
    { key: 'inventario',  icon: '📦', label: 'Inventario',        count: stockBajo > 0 ? `⚠ ${stockBajo}` : inventario.length > 0 ? inventario.length : null },
    { key: 'trabajos',    icon: '🔧', label: 'Trabajos',          count: trabajos.length },
    { key: 'proveedores', icon: '🏪', label: 'Proveedores',       count: proveedores.length > 0 ? proveedores.length : null },
    { key: 'ordenes',     icon: '📋', label: 'Órdenes de Compra', count: ordenesPendientesRecibir > 0 ? ordenesPendientesRecibir : ordenes.length > 0 ? ordenes.length : null },
    { key: 'facturas',    icon: '🧾', label: 'Facturas',          count: facturas.length > 0 ? facturas.length : null },
    { key: 'cuentas',     icon: '💰', label: 'Por Cobrar',        count: facturasPendientes > 0 ? facturasPendientes : null },
    { key: 'pagos',       icon: '🔴', label: 'Por Pagar',         count: ordenesPendientesPago > 0 ? ordenesPendientesPago : null },
    { key: 'resumen',     icon: '📊', label: 'Resumen',           count: null },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0">🔧</div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Taller Mecánico</h1>
            <p className="text-slate-400 text-sm font-medium">Sistema de Gestión</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <nav className="flex gap-1 mb-6 bg-white rounded-xl p-1.5 shadow-sm border border-slate-200 overflow-x-auto">
          {tabs.map(({ key, icon, label, count }) => (
            <button key={key} onClick={() => setVista(key)}
              className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-150 whitespace-nowrap ${
                vista === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}>
              <span>{icon}</span>
              <span>{label}</span>
              {count !== null && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  vista === key ? 'bg-indigo-400 text-white'
                    : (typeof count === 'string' && count.startsWith('⚠')) ? 'bg-rose-100 text-rose-600'
                    : (key === 'cuentas' && facturasPendientes > 0) || (key === 'pagos' && ordenesPendientesPago > 0) || (key === 'ordenes' && ordenesPendientesRecibir > 0) ? 'bg-rose-100 text-rose-600'
                    : 'bg-slate-200 text-slate-600'
                }`}>{count}</span>
              )}
            </button>
          ))}
        </nav>

        <Card className="p-6 sm:p-8">
          {vista === 'clientes' && (
            <VistaClientes clientes={clientes} vehiculos={vehiculos}
              onGuardarCliente={guardarCliente} onGuardarVehiculo={guardarVehiculo} />
          )}
          {vista === 'inventario' && (
            <VistaInventario inventario={inventario} clientes={clientes} vehiculos={vehiculos}
              proveedores={proveedores}
              onGuardarRefaccion={guardarRefaccion} onRecibirStock={recibirStock} />
          )}
          {vista === 'trabajos' && (
            <VistaTrabajo clientes={clientes} vehiculos={vehiculos} inventario={inventario}
              trabajos={trabajos} facturas={facturas} onGuardar={guardarTrabajo}
              onIrAInventario={() => setVista('inventario')}
              onGenerarFactura={generarFactura}
              onIrAFacturas={() => setVista('facturas')} />
          )}
          {vista === 'proveedores' && (
            <VistaProveedores proveedores={proveedores} inventario={inventario}
              onGuardarProveedor={guardarProveedor} />
          )}
          {vista === 'ordenes' && (
            <VistaOrdenesCompra ordenes={ordenes} proveedores={proveedores} inventario={inventario}
              onCrearOrden={crearOrden} onRecibirOrden={recibirOrden} onCancelarOrden={cancelarOrden}
              onIrAProveedores={() => setVista('proveedores')} />
          )}
          {vista === 'facturas' && (
            <VistaFacturas facturas={facturas} clientes={clientes} vehiculos={vehiculos} trabajos={trabajos}
              onRegistrarPago={registrarPagoFactura} />
          )}
          {vista === 'cuentas' && (
            <VistaCuentas facturas={facturas} trabajos={trabajos} clientes={clientes} vehiculos={vehiculos}
              onRegistrarPagoFactura={registrarPagoFactura}
              onRegistrarPagoTrabajo={registrarPago} />
          )}
          {vista === 'pagos' && (
            <VistaCuentasPorPagar ordenes={ordenes} proveedores={proveedores}
              onRegistrarPago={registrarPagoOrden}
              onIrAOrdenes={() => setVista('ordenes')} />
          )}
          {vista === 'resumen' && (
            <VistaResumen mesActual={mesActual} setMesActual={setMesActual}
              resumen={calcularResumen()}
              trabajos={trabajos.filter(t => t.fecha.startsWith(mesActual))}
              clientes={clientes} vehiculos={vehiculos} />
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Pricing Intelligence ─────────────────────────────────────────────────────

interface PricingIntel {
  cost: number;
  markups: { pct: number; price: number }[];        // 30/40/50% suggestions
  clientLastSale: { precio: number; fecha: string } | null;  // last price to THIS client
  clientAllSales: { precio: number; fecha: string }[];
  otherMin: number | null;   // min price charged to other clients
  otherMax: number | null;   // max price charged to other clients
}

function getPricingIntel(
  refaccionId: string,
  clienteId: string,
  precioCompra: number,
  trabajos: Trabajo[]
): PricingIntel {
  const markups = [30, 40, 50].map(pct => ({
    pct,
    // Margen sobre venta: sale = cost / (1 - margin%)
    // Guarantees profit is `pct`% of the sale price, not of cost
    price: Math.round((precioCompra / (1 - pct / 100)) * 100) / 100,
  }));

  // All sales of this part to THIS client — sorted highest price first
  // (we want the max price ever charged, not the most recent, per Hector's rule:
  //  "never charge less than the highest you've ever charged this client")
  const clientSales = trabajos
    .filter(t => t.clienteId === clienteId)
    .flatMap(t =>
      t.partes
        .filter(p => p.refaccionId === refaccionId && p.precioVenta > 0)
        .map(p => ({ precio: p.precioVenta, fecha: t.fecha }))
    )
    .sort((a, b) => b.precio - a.precio);  // highest price first

  // Prices charged to OTHER clients
  const otherPrices = trabajos
    .filter(t => t.clienteId !== clienteId)
    .flatMap(t =>
      t.partes
        .filter(p => p.refaccionId === refaccionId && p.precioVenta > 0)
        .map(p => p.precioVenta)
    );

  return {
    cost: precioCompra,
    markups,
    clientLastSale: clientSales[0] ?? null,
    clientAllSales: clientSales,
    otherMin: otherPrices.length ? Math.min(...otherPrices) : null,
    otherMax: otherPrices.length ? Math.max(...otherPrices) : null,
  };
}

// ─── VistaClientes ────────────────────────────────────────────────────────────

function VistaClientes({
  clientes,
  vehiculos,
  onGuardarCliente,
  onGuardarVehiculo,
}: {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  onGuardarCliente: (c: Omit<Cliente, 'id'>) => void;
  onGuardarVehiculo: (v: Omit<Vehiculo, 'id'>) => void;
}) {
  const [formCliente, setFormCliente] = useState({ nombre: '', telefono: '' });
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null);
  const [formVehiculo, setFormVehiculo] = useState({ marca: '', modelo: '', anio: '', placa: '' });

  const handleSubmitCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (formCliente.nombre && formCliente.telefono) {
      onGuardarCliente(formCliente);
      setFormCliente({ nombre: '', telefono: '' });
    }
  };

  const handleSubmitVehiculo = (e: React.FormEvent, clienteId: string) => {
    e.preventDefault();
    if (formVehiculo.marca && formVehiculo.modelo) {
      onGuardarVehiculo({ ...formVehiculo, clienteId });
      setFormVehiculo({ marca: '', modelo: '', anio: '', placa: '' });
    }
  };

  const toggleCliente = (id: string) => {
    setClienteExpandido(clienteExpandido === id ? null : id);
    setFormVehiculo({ marca: '', modelo: '', anio: '', placa: '' });
  };

  return (
    <div>
      <SectionTitle
        title="Registro de Clientes"
        subtitle="Registra al cliente y toca su nombre para gestionar sus unidades (vehículos)."
      />

      {/* ── Formulario nuevo cliente ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Nuevo Cliente</h3>
        <form onSubmit={handleSubmitCliente} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Nombre</Label>
            <Input type="text" placeholder="Nombre completo" value={formCliente.nombre}
              onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })} required />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input type="tel" placeholder="Ej. 555-123-4567" value={formCliente.telefono}
              onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })} required />
          </div>
          <div className="flex items-end">
            <Btn type="submit" variant="primary" fullWidth>+ Agregar Cliente</Btn>
          </div>
        </form>
      </div>

      {/* ── Lista de clientes ── */}
      {clientes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-medium text-slate-500">Sin clientes registrados</p>
          <p className="text-sm mt-1">Agrega el primer cliente arriba.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientes.map(cliente => {
            const unidades = vehiculos.filter(v => v.clienteId === cliente.id);
            const expandido = clienteExpandido === cliente.id;
            return (
              <div key={cliente.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => toggleCliente(cliente.id)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{cliente.nombre}</div>
                      <div className="text-slate-500 text-xs">{cliente.telefono}</div>
                    </div>
                    <span className={`ml-2 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      unidades.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {unidades.length > 0 ? `${unidades.length} unidad${unidades.length !== 1 ? 'es' : ''}` : '⚠ Sin unidades'}
                    </span>
                  </div>
                  <span className="text-slate-400 text-xs font-medium ml-4 flex-shrink-0">
                    {expandido ? '▲ Cerrar' : '▼ Gestionar unidades'}
                  </span>
                </button>

                {expandido && (
                  <div className="px-5 pb-5 pt-4 bg-slate-50 border-t border-slate-200">
                    {unidades.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Unidades registradas</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {unidades.map(v => (
                            <div key={v.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
                              <span className="text-2xl flex-shrink-0">🚗</span>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800 text-sm truncate">
                                  {[v.anio, v.marca, v.modelo].filter(Boolean).join(' ') || '(sin datos)'}
                                </div>
                                {v.placa && (
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    Placa: <span className="font-mono font-semibold text-slate-700">{v.placa}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar nueva unidad</p>
                    <form onSubmit={e => handleSubmitVehiculo(e, cliente.id)}
                      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div><Label>Marca *</Label>
                        <Input type="text" placeholder="Ej. Ford" value={formVehiculo.marca}
                          onChange={e => setFormVehiculo({ ...formVehiculo, marca: e.target.value })} required /></div>
                      <div><Label>Modelo *</Label>
                        <Input type="text" placeholder="Ej. F-150" value={formVehiculo.modelo}
                          onChange={e => setFormVehiculo({ ...formVehiculo, modelo: e.target.value })} required /></div>
                      <div><Label>Año</Label>
                        <Input type="text" placeholder="Ej. 2020" value={formVehiculo.anio}
                          onChange={e => setFormVehiculo({ ...formVehiculo, anio: e.target.value })} maxLength={4} /></div>
                      <div><Label>Placa</Label>
                        <Input type="text" placeholder="Ej. ABC-123" value={formVehiculo.placa}
                          onChange={e => setFormVehiculo({ ...formVehiculo, placa: e.target.value.toUpperCase() })}
                          className="font-mono" /></div>
                      <div className="col-span-2 sm:col-span-1 flex items-end">
                        <Btn type="submit" variant="success" fullWidth>+ Agregar</Btn>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── VistaInventario ──────────────────────────────────────────────────────────

const CATEGORIAS = ['Filtros', 'Aceites', 'Frenos', 'Motor', 'Eléctrico', 'Transmisión', 'Suspensión', 'Otros'];
const UNIDADES   = ['pza', 'lt', 'par', 'kg', 'metro', 'rollo', 'caja'];

function VistaInventario({
  inventario,
  clientes,
  vehiculos,
  proveedores,
  onGuardarRefaccion,
  onRecibirStock,
}: {
  inventario: Refaccion[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  proveedores: Proveedor[];
  onGuardarRefaccion: (r: Omit<Refaccion, 'id'>) => void;
  onRecibirStock: (id: string, cantidad: number) => void;
}) {
  const [form, setForm] = useState({
    nombre: '', codigo: '', categoria: 'Filtros', unidad: 'pza',
    precioCompra: 0, stock: 0, stockMinimo: 1, vehiculoId: '', proveedorId: '',
  });
  const [formClienteId, setFormClienteId] = useState('');
  const [compatibilidad, setCompatibilidad] = useState<CompatibilidadVehiculo[]>([]);
  const [modeloInputs, setModeloInputs] = useState<Record<number, string>>({});
  const [expandido, setExpandido] = useState<string | null>(null);
  const [recibirCantidad, setRecibirCantidad] = useState<Record<string, number>>({});

  const vehiculosDelCliente = vehiculos.filter(v => v.clienteId === formClienteId);

  const addCompatMarca = () =>
    setCompatibilidad(prev => [...prev, { marca: '', modelos: [] }]);
  const removeCompatMarca = (i: number) => {
    setCompatibilidad(prev => prev.filter((_, idx) => idx !== i));
    setModeloInputs(prev => { const n = { ...prev }; delete n[i]; return n; });
  };
  const updateCompatMarca = (i: number, marca: string) =>
    setCompatibilidad(prev => prev.map((g, idx) => idx === i ? { ...g, marca } : g));
  const addCompatModelo = (i: number) => {
    const m = (modeloInputs[i] ?? '').trim();
    if (!m) return;
    setCompatibilidad(prev => prev.map((g, idx) =>
      idx === i ? { ...g, modelos: g.modelos.includes(m) ? g.modelos : [...g.modelos, m] } : g
    ));
    setModeloInputs(prev => ({ ...prev, [i]: '' }));
  };
  const removeCompatModelo = (i: number, modelo: string) =>
    setCompatibilidad(prev => prev.map((g, idx) =>
      idx === i ? { ...g, modelos: g.modelos.filter(m => m !== modelo) } : g
    ));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || form.precioCompra <= 0) return;
    const compatFinal = compatibilidad.filter(c => c.marca.trim() && c.modelos.length > 0);
    onGuardarRefaccion({ ...form, compatibilidad: compatFinal.length > 0 ? compatFinal : undefined });
    setForm({ nombre: '', codigo: '', categoria: 'Filtros', unidad: 'pza', precioCompra: 0, stock: 0, stockMinimo: 1, vehiculoId: '', proveedorId: '' });
    setFormClienteId('');
    setCompatibilidad([]);
    setModeloInputs({});
  };

  const handleClienteChange = (clienteId: string) => {
    setFormClienteId(clienteId);
    setForm(f => ({ ...f, vehiculoId: '' }));  // reset vehicle when client changes
  };

  const handleRecibir = (id: string) => {
    const cant = recibirCantidad[id] ?? 0;
    if (cant > 0) {
      onRecibirStock(id, cant);
      setRecibirCantidad(prev => ({ ...prev, [id]: 0 }));
      setExpandido(null);
    }
  };

  const stockStatus = (r: Refaccion) => {
    if (r.stock <= 0)             return { label: 'Sin stock',           cls: 'bg-rose-100 text-rose-700' };
    if (r.stock <= r.stockMinimo) return { label: `Stock bajo (${r.stock})`, cls: 'bg-amber-100 text-amber-700' };
    return { label: `${r.stock} ${r.unidad}`, cls: 'bg-emerald-100 text-emerald-700' };
  };

  // Resolve vehiculo label for display in table
  const vehiculoLabel = (vehiculoId?: string) => {
    if (!vehiculoId) return null;
    const v = vehiculos.find(x => x.id === vehiculoId);
    if (!v) return null;
    const c = clientes.find(x => x.id === v.clienteId);
    return `${c?.nombre ?? '?'} · ${[v.anio, v.marca, v.modelo].filter(Boolean).join(' ')}`;
  };
  const proveedorNombre = (proveedorId?: string) =>
    proveedores.find(p => p.id === proveedorId)?.nombre ?? null;

  return (
    <div>
      <SectionTitle
        title="Inventario de Refacciones"
        subtitle="Registra las piezas en stock. Puedes vincular una pieza a una unidad específica si fue comprada para esa reparación."
      />

      {/* ── Formulario nueva refacción ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Agregar Refacción al Inventario</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre + Código + Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Label>Nombre de la refacción *</Label>
              <Input type="text" placeholder="Ej. Filtro de aceite Fram PH3614"
                value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
            </div>
            <div>
              <Label>Código / SKU</Label>
              <Input type="text" placeholder="Ej. FRAM-PH3614" value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} className="font-mono" />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </Select>
            </div>
          </div>

          {/* Unidad + Precio + Stock + Stock mínimo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label>Unidad</Label>
              <Select value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </Select>
            </div>
            <div>
              <Label>Precio de compra ($) *</Label>
              <Input type="number" placeholder="0.00" min="0.01" step="0.01"
                value={form.precioCompra || ''}
                onChange={e => setForm(f => ({ ...f, precioCompra: Number(e.target.value) }))} required />
            </div>
            <div>
              <Label>Stock inicial</Label>
              <Input type="number" placeholder="0" min="0" step="1"
                value={form.stock || ''}
                onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Stock mínimo</Label>
              <Input type="number" placeholder="1" min="0" step="1"
                value={form.stockMinimo || ''}
                onChange={e => setForm(f => ({ ...f, stockMinimo: Number(e.target.value) }))} />
            </div>
          </div>

          {/* ── Vincular a unidad (opcional) ── */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              🎯 Vincular a una unidad específica <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Si compraste esta pieza específicamente para la reparación de una unidad, selecciónala aquí.
              Aparecerá destacada cuando registres un trabajo para esa unidad.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Cliente</Label>
                <Select value={formClienteId} onChange={e => handleClienteChange(e.target.value)}>
                  <option value="">Sin vincular (stock general)</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </Select>
              </div>
              <div>
                <Label>Unidad del cliente</Label>
                <Select
                  value={form.vehiculoId}
                  onChange={e => setForm(f => ({ ...f, vehiculoId: e.target.value }))}
                  disabled={!formClienteId || vehiculosDelCliente.length === 0}
                >
                  <option value="">Seleccionar unidad...</option>
                  {vehiculosDelCliente.map(v => (
                    <option key={v.id} value={v.id}>{labelVehiculo(v)}</option>
                  ))}
                </Select>
                {formClienteId && vehiculosDelCliente.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Este cliente no tiene unidades registradas.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Proveedor (opcional) ── */}
          {proveedores.length > 0 && (
            <div>
              <Label>🏪 Proveedor habitual <span className="font-normal text-slate-400">(opcional)</span></Label>
              <Select value={form.proveedorId} onChange={e => setForm(f => ({ ...f, proveedorId: e.target.value }))}>
                <option value="">Sin proveedor asignado</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            </div>
          )}

          {/* ── Compatibilidad de vehículos ── */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">🚗 Compatibilidad de Vehículos</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {compatibilidad.length === 0
                    ? 'Sin restricciones — aparecerá para cualquier vehículo (universal)'
                    : `${compatibilidad.filter(c => c.marca && c.modelos.length > 0).length} grupo(s) de compatibilidad`}
                </p>
              </div>
              <Btn size="sm" variant="ghost" onClick={addCompatMarca} type="button">+ Agregar marca</Btn>
            </div>

            {compatibilidad.map((grupo, gi) => (
              <div key={gi} className="bg-slate-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input type="text" placeholder="Marca (ej. Ford, Isuzu, VW...)"
                      value={grupo.marca}
                      onChange={e => updateCompatMarca(gi, e.target.value)} />
                  </div>
                  <Btn size="sm" variant="danger" type="button" onClick={() => removeCompatMarca(gi)}>✕</Btn>
                </div>
                {grupo.marca && (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {grupo.modelos.map(m => (
                        <span key={m} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {m}
                          <button type="button" onClick={() => removeCompatModelo(gi, m)} className="hover:text-rose-600">×</button>
                        </span>
                      ))}
                      {grupo.modelos.length === 0 && (
                        <span className="text-xs text-amber-600">Agrega al menos un modelo</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input type="text" placeholder="Modelo (ej. F-150, 300...)"
                        value={modeloInputs[gi] ?? ''}
                        onChange={e => setModeloInputs(prev => ({ ...prev, [gi]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompatModelo(gi); } }}
                        className="flex-1" />
                      <Btn size="sm" variant="primary" type="button"
                        disabled={!(modeloInputs[gi] ?? '').trim()}
                        onClick={() => addCompatModelo(gi)}>+ Modelo</Btn>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <Btn type="submit" variant="primary" disabled={!form.nombre || form.precioCompra <= 0}>
            + Agregar al Inventario
          </Btn>
        </form>
      </div>

      {/* ── Lista de refacciones ── */}
      {inventario.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">📦</div>
          <p className="font-medium text-slate-500">Inventario vacío</p>
          <p className="text-sm mt-1">Agrega las piezas que tienes en stock arriba.</p>
        </div>
      ) : (
        <div>
          <h3 className="text-base font-bold text-slate-700 mb-3">
            Piezas en Inventario
            <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{inventario.length}</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  {['Código','Nombre / Unidad vinculada','Categoría','Precio Compra','Stock','Acciones'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i >= 3 ? 'text-right' : 'text-left'} ${i === 5 ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventario.map((r, i) => {
                  const status  = stockStatus(r);
                  const isExp   = expandido === r.id;
                  const vLabel  = vehiculoLabel(r.vehiculoId);
                  return (
                    <>
                      <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{r.codigo || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{r.nombre}</div>
                          {vLabel && (
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">
                                🎯 {vLabel}
                              </span>
                            </div>
                          )}
                          {proveedorNombre(r.proveedorId) && (
                            <div className="mt-0.5">
                              <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                                🏪 {proveedorNombre(r.proveedorId)}
                              </span>
                            </div>
                          )}
                          {r.compatibilidad && r.compatibilidad.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {r.compatibilidad.map((c, ci) => (
                                <span key={ci} className="text-xs bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full border border-emerald-200">
                                  🚗 {c.marca}: {c.modelos.join(', ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded-full">{r.categoria}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">${fmt(r.precioCompra)} / {r.unidad}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Btn size="sm" variant={isExp ? 'ghost' : 'success'}
                            onClick={() => setExpandido(isExp ? null : r.id)}>
                            {isExp ? '✕ Cerrar' : '+ Existencias'}
                          </Btn>
                        </td>
                      </tr>
                      {isExp && (
                        <tr key={`${r.id}-recibir`} className="bg-emerald-50 border-t border-emerald-200">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-sm font-semibold text-emerald-800">Recibir existencias de <em>{r.nombre}</em>:</span>
                              <div className="flex items-center gap-2">
                                <Input type="number" placeholder="Cantidad" min="1" step="1"
                                  value={recibirCantidad[r.id] || ''}
                                  onChange={e => setRecibirCantidad(prev => ({ ...prev, [r.id]: Number(e.target.value) }))}
                                  className="w-28" />
                                <span className="text-sm text-emerald-700 font-medium">{r.unidad}</span>
                                <Btn size="sm" variant="success"
                                  disabled={!recibirCantidad[r.id] || recibirCantidad[r.id] <= 0}
                                  onClick={() => handleRecibir(r.id)}>
                                  ✓ Confirmar
                                </Btn>
                              </div>
                              <span className="text-xs text-emerald-600">Stock actual: {r.stock} {r.unidad}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VistaTrabajo ─────────────────────────────────────────────────────────────

function VistaTrabajo({
  clientes,
  vehiculos,
  inventario,
  trabajos,
  facturas,
  onGuardar,
  onIrAInventario,
  onGenerarFactura,
  onIrAFacturas,
}: {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  inventario: Refaccion[];
  trabajos: Trabajo[];
  facturas: Factura[];
  onGuardar: (t: Omit<Trabajo, 'id' | 'total'>) => void;
  onIrAInventario: () => void;
  onGenerarFactura: (trabajoId: string) => void;
  onIrAFacturas: () => void;
}) {
  const emptyForm = {
    clienteId: '', vehiculoId: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    estado: 'pendiente' as Trabajo['estado'],
  };
  const [form, setForm] = useState(emptyForm);
  const [laborItems, setLaborItems] = useState<ManoDeObraItem[]>([]);
  const [laborConcepto, setLaborConcepto] = useState('');
  const [laborPrecio, setLaborPrecio]     = useState(0);
  const [partesSeleccionadas, setPartesSeleccionadas] = useState<TrabajoRefaccion[]>([]);
  const [pickerRefId, setPickerRefId]         = useState('');
  const [pickerCantidad, setPickerCantidad]   = useState(1);
  const [pickerPrecioVenta, setPickerPrecioVenta] = useState(0);

  const vehiculosDelCliente = vehiculos.filter(v => v.clienteId === form.clienteId);
  const totalManoDeObra       = laborItems.reduce((s, l) => s + l.precio, 0);
  const totalVentaRefacciones = partesSeleccionadas.reduce((s, p) => s + p.subtotal, 0);
  const totalCostoRefacciones = partesSeleccionadas.reduce((s, p) => s + p.costoTotal, 0);
  const utilidadRefacciones   = totalVentaRefacciones - totalCostoRefacciones;

  const handleClienteChange = (clienteId: string) =>
    setForm(f => ({ ...f, clienteId, vehiculoId: '' }));

  const agregarLabor = () => {
    if (!laborConcepto.trim() || laborPrecio <= 0) return;
    setLaborItems(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      concepto: laborConcepto.trim(),
      precio: laborPrecio,
    }]);
    setLaborConcepto('');
    setLaborPrecio(0);
  };

  const removerLabor = (id: string) =>
    setLaborItems(prev => prev.filter(l => l.id !== id));

  const agregarParte = () => {
    const ref = inventario.find(r => r.id === pickerRefId);
    if (!ref || pickerCantidad <= 0) return;
    const pVenta = pickerPrecioVenta > 0 ? pickerPrecioVenta : ref.precioCompra;
    setPartesSeleccionadas(prev => {
      const existente = prev.find(p => p.refaccionId === ref.id);
      if (existente) {
        // Merge: update quantity keeping existing sale price
        const nuevaCantidad = existente.cantidad + pickerCantidad;
        return prev.map(p => p.refaccionId === ref.id ? {
          ...p,
          cantidad: nuevaCantidad,
          subtotal:   nuevaCantidad * p.precioVenta,
          costoTotal: nuevaCantidad * p.precioCompra,
        } : p);
      }
      return [...prev, {
        refaccionId: ref.id, nombre: ref.nombre, codigo: ref.codigo,
        cantidad: pickerCantidad,
        precioCompra: ref.precioCompra,
        precioVenta: pVenta,
        subtotal:   pickerCantidad * pVenta,
        costoTotal: pickerCantidad * ref.precioCompra,
      }];
    });
    setPickerRefId('');
    setPickerCantidad(1);
    setPickerPrecioVenta(0);
  };

  // Auto-fill precio venta when part changes — prefer client's last price
  const handlePickerRefChange = (id: string) => {
    setPickerRefId(id);
    const ref = inventario.find(r => r.id === id);
    if (!ref) { setPickerPrecioVenta(0); return; }
    // Look up client history — use highest price ever charged (never charge less)
    if (form.clienteId) {
      const prices = trabajos
        .filter(t => t.clienteId === form.clienteId)
        .flatMap(t => t.partes.filter(p => p.refaccionId === id && p.precioVenta > 0).map(p => p.precioVenta));
      if (prices.length > 0) { setPickerPrecioVenta(Math.max(...prices)); return; }
    }
    setPickerPrecioVenta(ref.precioCompra);
  };

  const removerParte = (refaccionId: string) =>
    setPartesSeleccionadas(prev => prev.filter(p => p.refaccionId !== refaccionId));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteId || !form.vehiculoId || !form.descripcion) return;
    onGuardar({
      ...form,
      manoDeObra: totalManoDeObra,
      manoDeObraItems: laborItems,
      refacciones: totalVentaRefacciones,
      costoRefacciones: totalCostoRefacciones,
      partes: partesSeleccionadas,
      pagos: [],
    });
    setForm(emptyForm);
    setLaborItems([]);
    setLaborConcepto('');
    setLaborPrecio(0);
    setPartesSeleccionadas([]);
    setPickerRefId('');
    setPickerCantidad(1);
    setPickerPrecioVenta(0);
  };

  const getCliente  = (id: string) => clientes.find(c => c.id === id);
  const getVehiculo = (id: string) => vehiculos.find(v => v.id === id);
  const pickerRef   = inventario.find(r => r.id === pickerRefId);

  const intel: PricingIntel | null = useMemo(() => {
    if (!pickerRefId || !form.clienteId) return null;
    const ref = inventario.find(r => r.id === pickerRefId);
    if (!ref) return null;
    return getPricingIntel(pickerRefId, form.clienteId, ref.precioCompra, trabajos);
  }, [pickerRefId, form.clienteId, inventario, trabajos]);

  // ── Compatibility filtering ──
  const vehiculoDelTrabajo = vehiculos.find(v => v.id === form.vehiculoId);

  const isCompatible = (r: Refaccion): boolean => {
    if (!vehiculoDelTrabajo) return true;
    if (!r.compatibilidad || r.compatibilidad.length === 0) return true; // universal
    const marca  = vehiculoDelTrabajo.marca.toLowerCase().trim();
    const modelo = vehiculoDelTrabajo.modelo.toLowerCase().trim();
    return r.compatibilidad.some(c =>
      c.marca.toLowerCase().trim() === marca &&
      c.modelos.some(m => m.toLowerCase().trim() === modelo)
    );
  };

  // Parts grouped for the picker optgroups
  const partesParaEstaUnidad  = inventario.filter(r => r.vehiculoId === form.vehiculoId && isCompatible(r));
  const partesCompatibles      = inventario.filter(r => r.vehiculoId !== form.vehiculoId && r.compatibilidad?.length && isCompatible(r));
  const partesUniversales      = inventario.filter(r => r.vehiculoId !== form.vehiculoId && (!r.compatibilidad || r.compatibilidad.length === 0));
  // When vehicle is selected: only compatible+universal+linked-to-this-unit; otherwise all
  const totalCompatibles = form.vehiculoId
    ? partesParaEstaUnidad.length + partesCompatibles.length + partesUniversales.length
    : inventario.length;

  return (
    <div>
      <SectionTitle title="Registro de Trabajos" subtitle="Selecciona cliente, unidad y las refacciones usadas del inventario." />

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Nuevo Trabajo</h3>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ① Cliente + ② Unidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>① Cliente</Label>
              <Select value={form.clienteId} onChange={e => handleClienteChange(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
            </div>
            <div>
              <Label>② Unidad / Vehículo</Label>
              <Select value={form.vehiculoId} onChange={e => setForm(f => ({ ...f, vehiculoId: e.target.value }))}
                required disabled={!form.clienteId || vehiculosDelCliente.length === 0}>
                <option value="">Seleccionar unidad...</option>
                {vehiculosDelCliente.map(v => <option key={v.id} value={v.id}>{labelVehiculo(v)}</option>)}
              </Select>
            </div>
          </div>

          {form.clienteId && vehiculosDelCliente.length === 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <span>⚠️</span>
              <span>Este cliente no tiene unidades. Ve a <span className="font-bold">👥 Clientes</span> para registrar una primero.</span>
            </div>
          )}

          {/* Fecha + Descripción (2-col, mano de obra moved to its own section) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div>
              <Label>Descripción general del trabajo</Label>
              <Input type="text" placeholder="Ej. Servicio completo frenos y aceite..." value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} required />
            </div>
          </div>

          {/* ② Mano de Obra — multi-item */}
          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 bg-slate-700">
              <span className="text-xs font-bold text-white uppercase tracking-widest">② Mano de Obra</span>
              <span className="ml-3 text-slate-400 text-xs">Agrega cada tarea con su precio</span>
            </div>
            <div className="p-4 space-y-4">
              {/* Labor picker */}
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-48">
                  <Label>Concepto</Label>
                  <Input type="text" placeholder="Ej. Arreglo de frenos, engrase de pernos..."
                    value={laborConcepto}
                    onChange={e => setLaborConcepto(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarLabor(); } }}
                  />
                </div>
                <div className="w-36">
                  <Label>Precio ($)</Label>
                  <Input type="number" placeholder="0.00" min="0.01" step="0.01"
                    value={laborPrecio || ''}
                    onChange={e => setLaborPrecio(Number(e.target.value))} />
                </div>
                <div className="flex items-end">
                  <Btn variant="primary"
                    disabled={!laborConcepto.trim() || laborPrecio <= 0}
                    onClick={agregarLabor}>
                    + Agregar
                  </Btn>
                </div>
              </div>

              {/* Labor items table */}
              {laborItems.length > 0 && (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Concepto</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Precio</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {laborItems.map(l => (
                        <tr key={l.id} className="bg-white">
                          <td className="px-3 py-2 text-slate-800 font-medium">{l.concepto}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(l.precio)}</td>
                          <td className="px-3 py-2 text-center">
                            <Btn size="sm" variant="danger" onClick={() => removerLabor(l.id)}>✕</Btn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td className="px-3 py-2 text-sm font-bold text-slate-700 text-right">Total Mano de Obra:</td>
                        <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(totalManoDeObra)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {laborItems.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">
                  Sin conceptos de mano de obra. El trabajo se registra con mano de obra = $0.00
                </p>
              )}
            </div>
          </div>

          {/* ③ Refacciones del inventario */}
          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-widest">③ Refacciones del Inventario</span>
              {inventario.length === 0 && (
                <button type="button" onClick={onIrAInventario}
                  className="text-xs text-indigo-300 hover:text-white underline font-medium">
                  Ir a Inventario →
                </button>
              )}
            </div>

            {inventario.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">
                <p>El inventario está vacío.</p>
                <button type="button" onClick={onIrAInventario}
                  className="mt-2 text-indigo-600 font-semibold hover:underline">
                  Agregar refacciones al inventario →
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Compatibility filter indicator */}
                {form.vehiculoId && vehiculoDelTrabajo && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                    totalCompatibles > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <span>🚗</span>
                    <span>
                      {totalCompatibles > 0
                        ? `Mostrando ${totalCompatibles} refacción${totalCompatibles !== 1 ? 'es' : ''} compatibles con ${vehiculoDelTrabajo.marca} ${vehiculoDelTrabajo.modelo}`
                        : `Sin refacciones marcadas como compatibles con ${vehiculoDelTrabajo.marca} ${vehiculoDelTrabajo.modelo} — se muestran las universales`}
                    </span>
                  </div>
                )}

                {/* Picker: refacción + cantidad + precio venta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2 lg:col-span-2">
                    <Label>Refacción</Label>
                    <Select value={pickerRefId} onChange={e => handlePickerRefChange(e.target.value)}>
                      <option value="">Seleccionar pieza...</option>
                      {/* 1. Parts bought specifically for this vehicle unit */}
                      {partesParaEstaUnidad.length > 0 && (
                        <optgroup label="🎯 Compradas para esta unidad">
                          {partesParaEstaUnidad.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {/* 2. Parts with matching make/model compatibility */}
                      {partesCompatibles.length > 0 && vehiculoDelTrabajo && (
                        <optgroup label={`✅ Compatible con ${vehiculoDelTrabajo.marca} ${vehiculoDelTrabajo.modelo}`}>
                          {partesCompatibles.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {/* 3. Universal parts (no compatibility restrictions) */}
                      {partesUniversales.length > 0 && (
                        <optgroup label="🌐 Universales (todos los vehículos)">
                          {partesUniversales.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {/* When no vehicle selected: show all with old grouping */}
                      {!form.vehiculoId && inventario.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Cantidad</Label>
                    <Input type="number" min="1" step="1" placeholder="1"
                      value={pickerCantidad || ''}
                      onChange={e => setPickerCantidad(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>
                      Precio venta ($)
                      {intel?.clientLastSale && pickerPrecioVenta > 0 && pickerPrecioVenta < intel.clientLastSale.precio && (
                        <span className="ml-2 text-amber-600 font-bold text-xs">⚠ menor que antes</span>
                      )}
                    </Label>
                    <Input type="number" min="0" step="0.01" placeholder="0.00"
                      value={pickerPrecioVenta || ''}
                      onChange={e => setPickerPrecioVenta(Number(e.target.value))}
                      className={
                        intel?.clientLastSale && pickerPrecioVenta > 0 && pickerPrecioVenta < intel.clientLastSale.precio
                          ? '!border-amber-400 !ring-amber-400'
                          : ''
                      }
                    />
                  </div>
                </div>

                {/* ── Pricing intelligence panel ── */}
                {pickerRef && intel && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-sm">

                    {/* Row 1: Cost + Markup buttons */}
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-slate-500 text-xs">
                        Costo: <strong className="text-slate-700">${fmt(pickerRef.precioCompra)}</strong>/{pickerRef.unidad}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400 font-medium">Sugerencias:</span>
                      {intel.markups.map(m => (
                        <button key={m.pct} type="button"
                          onClick={() => setPickerPrecioVenta(m.price)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            pickerPrecioVenta === m.price
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                          }`}>
                          {m.pct}% margen ${fmt(m.price)}
                        </button>
                      ))}
                      {pickerRef.stock < pickerCantidad && (
                        <span className="text-xs font-semibold text-amber-600 ml-auto">
                          ⚠ solo {pickerRef.stock} en stock
                        </span>
                      )}
                    </div>

                    {/* Row 2: Client history — most prominent */}
                    {intel.clientLastSale && (() => {
                      const isLower = pickerPrecioVenta > 0 && pickerPrecioVenta < intel.clientLastSale!.precio;
                      const isSame  = pickerPrecioVenta === intel.clientLastSale!.precio;
                      return (
                        <div className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 border ${
                          isLower ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200'
                        }`}>
                          <div className="text-xs">
                            <span className={`font-bold ${isLower ? 'text-amber-700' : 'text-indigo-700'}`}>
                              {isLower ? '⚠️' : '📋'}
                              {' '}
                              {isLower
                                ? `Estás cobrando menos que antes ($${fmt(pickerPrecioVenta)} vs $${fmt(intel.clientLastSale!.precio)})`
                                : isSame
                                  ? `Mismo precio que el máximo cobrado ($${fmt(intel.clientLastSale!.precio)})`
                                  : `Mayor precio cobrado a este cliente: $${fmt(intel.clientLastSale!.precio)}`
                              }
                            </span>
                            <span className="text-slate-400 ml-1">
                              — {new Date(intel.clientLastSale!.fecha).toLocaleDateString('es-MX')}
                              {intel.clientAllSales.length > 1 && ` · ${intel.clientAllSales.length} veces vendida`}
                            </span>
                          </div>
                          {!isSame && (
                            <button type="button"
                              onClick={() => setPickerPrecioVenta(intel.clientLastSale!.precio)}
                              className={`text-xs font-bold whitespace-nowrap px-2.5 py-1 rounded-lg border transition-all ${
                                isLower
                                  ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                                  : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                              }`}>
                              Usar ${fmt(intel.clientLastSale!.precio)}
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Row 3: Cross-client range */}
                    {intel.otherMin !== null && (
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <span>💬</span>
                        <span>
                          Otros clientes pagaron:{' '}
                          <strong className="text-slate-600">
                            {intel.otherMin === intel.otherMax
                              ? `$${fmt(intel.otherMin!)}`
                              : `$${fmt(intel.otherMin!)} – $${fmt(intel.otherMax!)}`}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Agregar button (always visible) */}
                <div className="flex justify-between items-center gap-3 flex-wrap">
                  {pickerPrecioVenta > 0 && pickerRef && (
                    <span className="text-xs text-slate-500">
                      Margen: <strong className={pickerPrecioVenta > pickerRef.precioCompra ? 'text-emerald-600' : 'text-slate-600'}>
                        ${fmt((pickerPrecioVenta - pickerRef.precioCompra) * pickerCantidad)}
                        {' '}({(((pickerPrecioVenta - pickerRef.precioCompra) / pickerRef.precioCompra) * 100).toFixed(0)}%)
                      </strong>
                      {pickerCantidad > 1 && ` · subtotal cobrado $${fmt(pickerPrecioVenta * pickerCantidad)}`}
                    </span>
                  )}
                  <div className={!pickerRef ? 'ml-auto' : ''}>
                    <Btn variant="primary" disabled={!pickerRefId || pickerCantidad <= 0} onClick={agregarParte}>
                      + Agregar pieza
                    </Btn>
                  </div>
                </div>

                {/* Lista de partes seleccionadas */}
                {partesSeleccionadas.length > 0 && (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Refacción</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Cant.</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Costo</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Venta</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-600 uppercase tracking-wide">Margen</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {partesSeleccionadas.map(p => {
                          const margen = p.subtotal - p.costoTotal;
                          return (
                            <tr key={p.refaccionId} className="bg-white">
                              <td className="px-3 py-2 text-slate-800 font-medium">
                                {p.nombre}
                                {p.codigo && <span className="ml-1.5 text-xs font-mono text-slate-400">{p.codigo}</span>}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-700">{p.cantidad}</td>
                              <td className="px-3 py-2 text-right text-slate-400 text-xs">${fmt(p.costoTotal)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(p.subtotal)}</td>
                              <td className="px-3 py-2 text-right font-medium text-emerald-600">${fmt(margen)}</td>
                              <td className="px-3 py-2 text-center">
                                <Btn size="sm" variant="danger" onClick={() => removerParte(p.refaccionId)}>✕</Btn>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={2} className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Totales:</td>
                          <td className="px-3 py-2 text-right text-xs text-slate-400 font-semibold">${fmt(totalCostoRefacciones)}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(totalVentaRefacciones)}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-emerald-600">${fmt(utilidadRefacciones)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {partesSeleccionadas.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">
                    Sin refacciones agregadas. El trabajo se registra con refacciones = $0.00
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Resumen del trabajo */}
          {(totalManoDeObra > 0 || totalVentaRefacciones > 0) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 space-y-2 text-sm">
              <div className="flex flex-wrap gap-6">
                <div>
                  <span className="text-indigo-500 font-semibold">Mano de obra</span>
                  {laborItems.length > 0 && <span className="text-indigo-400 ml-1">({laborItems.length} concepto{laborItems.length !== 1 ? 's' : ''})</span>}
                  {': '}<span className="font-bold text-slate-800">${fmt(totalManoDeObra)}</span>
                </div>
                <div><span className="text-indigo-500 font-semibold">Venta refacciones:</span> <span className="font-bold text-slate-800">${fmt(totalVentaRefacciones)}</span></div>
                <div><span className="text-indigo-700 font-bold">Total cobrado: </span><span className="font-extrabold text-indigo-800 text-base">${fmt(totalManoDeObra + totalVentaRefacciones)}</span></div>
              </div>
              {utilidadRefacciones !== 0 && (
                <div className="text-xs text-slate-500 border-t border-indigo-100 pt-2 flex flex-wrap gap-4">
                  <span>Costo refacciones: <strong className="text-slate-700">${fmt(totalCostoRefacciones)}</strong></span>
                  <span>Margen en partes: <strong className={utilidadRefacciones >= 0 ? 'text-emerald-600' : 'text-rose-600'}>${fmt(utilidadRefacciones)}</strong></span>
                  <span>Utilidad total: <strong className="text-emerald-700">${fmt(totalManoDeObra + utilidadRefacciones)}</strong></span>
                </div>
              )}
            </div>
          )}

          <Btn type="submit" variant="primary" fullWidth
            disabled={!form.clienteId || !form.vehiculoId || !form.descripcion}>
            ✓ Registrar Trabajo
          </Btn>
        </form>
      </div>

      {/* ── Historial ── */}
      <div>
        <h3 className="text-base font-bold text-slate-700 mb-3">
          Historial de Trabajos
          {trabajos.length > 0 && <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{trabajos.length}</span>}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['Fecha','Cliente','Unidad','Descripción','Refacciones','Mano de Obra','Total'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trabajos.map((trabajo, i) => {
                const cliente  = getCliente(trabajo.clienteId);
                const vehiculo = getVehiculo(trabajo.vehiculoId);
                return (
                  <tr key={trabajo.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                      {new Date(trabajo.fecha).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      {vehiculo ? (
                        <span>
                          <span className="text-slate-700 font-medium">{[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')}</span>
                          {vehiculo.placa && <span className="ml-1.5 text-xs bg-slate-200 text-slate-600 font-mono font-semibold px-1.5 py-0.5 rounded">{vehiculo.placa}</span>}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {trabajo.descripcion}
                      {trabajo.partes?.length > 0 && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded-full">
                          {trabajo.partes.length} pieza{trabajo.partes.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {trabajo.estadoFacturacion === 'facturado' ? (
                        <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full">🧾 Facturado</span>
                      ) : (
                        <button type="button"
                          onClick={() => { onGenerarFactura(trabajo.id); onIrAFacturas(); }}
                          className="ml-2 text-xs bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full hover:bg-amber-200 transition-colors">
                          + Generar Factura
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      <div>${fmt(trabajo.refacciones)}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      <div>${fmt(trabajo.manoDeObra)}</div>
                      {trabajo.manoDeObraItems?.length > 1 && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {trabajo.manoDeObraItems.length} conceptos
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">${fmt(trabajo.total)}</td>
                  </tr>
                );
              })}
              {trabajos.length === 0 && <EmptyRow cols={7} message="Sin trabajos registrados. Agrega el primero arriba." />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── VistaProveedores ─────────────────────────────────────────────────────────

function VistaProveedores({
  proveedores,
  inventario,
  onGuardarProveedor,
}: {
  proveedores: Proveedor[];
  inventario: Refaccion[];
  onGuardarProveedor: (p: Omit<Proveedor, 'id'>) => void;
}) {
  const [form, setForm] = useState({ nombre: '', telefono: '', contacto: '', notas: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre) return;
    onGuardarProveedor(form);
    setForm({ nombre: '', telefono: '', contacto: '', notas: '' });
  };

  return (
    <div>
      <SectionTitle
        title="Proveedores"
        subtitle="Registra tus proveedores de refacciones para vincularlos al inventario y rastrear lo que les debes."
      />

      {/* ── Formulario nuevo proveedor ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Nuevo Proveedor</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Nombre *</Label>
            <Input type="text" placeholder="Ej. Refacciones García" value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input type="tel" placeholder="Ej. 555-100-2000" value={form.telefono}
              onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
          </div>
          <div>
            <Label>Contacto</Label>
            <Input type="text" placeholder="Nombre del vendedor" value={form.contacto}
              onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <Btn type="submit" variant="primary" fullWidth disabled={!form.nombre}>
              + Agregar Proveedor
            </Btn>
          </div>
        </form>
      </div>

      {/* ── Lista ── */}
      {proveedores.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <div className="text-5xl mb-3">🏪</div>
          <p className="font-medium text-slate-500">Sin proveedores registrados</p>
          <p className="text-sm mt-1">Agrega el primero arriba. Después podrás vincularlo a tus refacciones.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['Proveedor','Teléfono','Contacto','Piezas en inventario'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proveedores.map((p, i) => {
                const piezas = inventario.filter(r => r.proveedorId === p.id);
                return (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{p.telefono || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.contacto || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {piezas.length > 0 ? (
                        <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                          {piezas.length} pieza{piezas.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Sin piezas</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── VistaOrdenesCompra ───────────────────────────────────────────────────────

function VistaOrdenesCompra({
  ordenes,
  proveedores,
  inventario,
  onCrearOrden,
  onRecibirOrden,
  onCancelarOrden,
  onIrAProveedores,
}: {
  ordenes: OrdenCompra[];
  proveedores: Proveedor[];
  inventario: Refaccion[];
  onCrearOrden: (data: Omit<OrdenCompra, 'id' | 'estado' | 'fechaRecibida' | 'pagos'>) => void;
  onRecibirOrden: (id: string) => void;
  onCancelarOrden: (id: string) => void;
  onIrAProveedores: () => void;
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [formProveedorId, setFormProveedorId] = useState('');
  const [formFecha, setFormFecha] = useState(hoy);
  const [formDesc, setFormDesc] = useState('');
  const [formNumOrden, setFormNumOrden] = useState('');
  const [itemsOrden, setItemsOrden] = useState<CompraItem[]>([]);
  const [pickerRefId, setPickerRefId] = useState('');
  const [pickerCantidad, setPickerCantidad] = useState(1);
  const [pickerPrecio, setPickerPrecio] = useState(0);
  const [filtro, setFiltro] = useState<'todos'|'pendiente'|'recibida'|'cancelada'>('todos');

  const totalOrden = itemsOrden.reduce((s, i) => s + i.subtotal, 0);
  const pickerRef  = inventario.find(r => r.id === pickerRefId);

  const agregarItem = () => {
    if (!pickerRefId || pickerCantidad <= 0 || pickerPrecio <= 0) return;
    const ref = inventario.find(r => r.id === pickerRefId);
    if (!ref) return;
    setItemsOrden(prev => {
      const ex = prev.find(i => i.refaccionId === ref.id);
      if (ex) { const nc = ex.cantidad + pickerCantidad; return prev.map(i => i.refaccionId === ref.id ? { ...i, cantidad: nc, subtotal: nc * i.precioCompra } : i); }
      return [...prev, { refaccionId: ref.id, nombre: ref.nombre, cantidad: pickerCantidad, precioCompra: pickerPrecio, subtotal: pickerCantidad * pickerPrecio }];
    });
    setPickerRefId(''); setPickerCantidad(1); setPickerPrecio(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProveedorId || itemsOrden.length === 0) return;
    onCrearOrden({ proveedorId: formProveedorId, fecha: formFecha, descripcion: formDesc, partes: itemsOrden, total: totalOrden, numeroOrden: formNumOrden || undefined });
    setFormProveedorId(''); setFormFecha(hoy); setFormDesc(''); setFormNumOrden(''); setItemsOrden([]);
  };

  const BADGE_ORDEN: Record<string, { label: string; cls: string }> = {
    pendiente: { label: '⏳ Pendiente de recibir', cls: 'bg-amber-100 text-amber-700' },
    recibida:  { label: '✅ Recibida',             cls: 'bg-emerald-100 text-emerald-700' },
    cancelada: { label: '✗ Cancelada',             cls: 'bg-slate-100 text-slate-500' },
  };

  const ordenesFiltradas = [...ordenes]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(o => filtro === 'todos' || o.estado === filtro);

  const counts = { todos: ordenes.length, pendiente: ordenes.filter(o => o.estado === 'pendiente').length, recibida: ordenes.filter(o => o.estado === 'recibida').length, cancelada: ordenes.filter(o => o.estado === 'cancelada').length };
  const pendientesRecibir = counts.pendiente;

  return (
    <div>
      <SectionTitle title="Órdenes de Compra" subtitle="Crea una OC para un proveedor. Al marcarla como 'recibida', el inventario se actualiza y pasa a Cuentas por Pagar." />

      {pendientesRecibir > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-5 flex items-center gap-3 text-sm">
          <span className="text-amber-600 font-semibold">⏳ {pendientesRecibir} orden{pendientesRecibir !== 1 ? 'es' : ''} pendiente{pendientesRecibir !== 1 ? 's' : ''} de recibir</span>
        </div>
      )}

      {/* Crear OC */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Nueva Orden de Compra</h3>
        {proveedores.length === 0 ? (
          <div className="text-center py-4 text-sm text-slate-400">
            <p>Registra un proveedor primero.</p>
            <button type="button" onClick={onIrAProveedores} className="mt-1 text-indigo-600 font-semibold hover:underline">Ir a Proveedores →</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2"><Label>Proveedor *</Label>
                <Select value={formProveedorId} onChange={e => setFormProveedorId(e.target.value)} required>
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </Select></div>
              <div><Label>Fecha</Label>
                <Input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} required /></div>
              <div><Label>Nº Orden (opcional)</Label>
                <Input type="text" placeholder="Ej. OC-2026-001" value={formNumOrden} onChange={e => setFormNumOrden(e.target.value)} className="font-mono" /></div>
            </div>
            <div><Label>Descripción (opcional)</Label>
              <Input type="text" placeholder="Ej. Reposición mensual filtros" value={formDesc} onChange={e => setFormDesc(e.target.value)} /></div>

            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-3 bg-slate-700">
                <span className="text-xs font-bold text-white uppercase tracking-widest">Piezas a Ordenar</span>
                <span className="ml-3 text-slate-400 text-xs">El inventario aumentará cuando marques la OC como recibida</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2"><Label>Refacción</Label>
                    <Select value={pickerRefId} onChange={e => { setPickerRefId(e.target.value); const r = inventario.find(x => x.id === e.target.value); setPickerPrecio(r?.precioCompra ?? 0); }}>
                      <option value="">Seleccionar pieza...</option>
                      {inventario.map(r => <option key={r.id} value={r.id}>{r.nombre}{r.codigo ? ` (${r.codigo})` : ''}</option>)}
                    </Select></div>
                  <div><Label>Cantidad</Label>
                    <Input type="number" min="1" step="1" placeholder="1" value={pickerCantidad || ''} onChange={e => setPickerCantidad(Number(e.target.value))} /></div>
                  <div><Label>Precio compra ($)</Label>
                    <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={pickerPrecio || ''} onChange={e => setPickerPrecio(Number(e.target.value))} /></div>
                </div>
                <div className="flex justify-between items-center">
                  {pickerRef && pickerPrecio > 0 && <span className="text-xs text-slate-500">Subtotal: <strong>${fmt(pickerPrecio * pickerCantidad)}</strong></span>}
                  <Btn variant="primary" size="sm" disabled={!pickerRefId || pickerCantidad <= 0 || pickerPrecio <= 0} onClick={agregarItem}>+ Agregar</Btn>
                </div>
                {itemsOrden.length > 0 && (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>{['Pieza','Cant.','Precio','Subtotal',''].map((h,i) => <th key={i} className={`px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide ${i > 0 && i < 4 ? 'text-right' : i === 0 ? 'text-left' : ''}`}>{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itemsOrden.map(it => (
                          <tr key={it.refaccionId} className="bg-white">
                            <td className="px-3 py-2 font-medium text-slate-800">{it.nombre}</td>
                            <td className="px-3 py-2 text-right text-slate-700">{it.cantidad}</td>
                            <td className="px-3 py-2 text-right text-slate-600">${fmt(it.precioCompra)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(it.subtotal)}</td>
                            <td className="px-3 py-2 text-center"><Btn size="sm" variant="danger" onClick={() => setItemsOrden(prev => prev.filter(i => i.refaccionId !== it.refaccionId))}>✕</Btn></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr><td colSpan={3} className="px-3 py-2 text-sm font-bold text-slate-700 text-right">Total OC:</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(totalOrden)}</td><td></td></tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <Btn type="submit" variant="primary" fullWidth disabled={!formProveedorId || itemsOrden.length === 0}>+ Crear Orden de Compra</Btn>
          </form>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['todos','pendiente','recibida','cancelada'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${filtro === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
            {f === 'todos' ? 'Todas' : BADGE_ORDEN[f].label} ({counts[f]})
          </button>
        ))}
      </div>

      {ordenesFiltradas.length === 0 ? (
        <div className="text-center py-12 text-slate-400"><div className="text-5xl mb-3">📋</div><p className="font-medium text-slate-500">Sin órdenes registradas</p></div>
      ) : (
        <div className="space-y-2">
          {ordenesFiltradas.map((orden, i) => {
            const prov = proveedores.find(p => p.id === orden.proveedorId);
            const badge = BADGE_ORDEN[orden.estado];
            return (
              <div key={orden.id} className={`border border-slate-200 rounded-xl p-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">🏪 {prov?.nombre ?? '—'}</span>
                      {orden.numeroOrden && <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{orden.numeroOrden}</span>}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex gap-2 flex-wrap">
                      <span>{new Date(orden.fecha).toLocaleDateString('es-MX')}</span>
                      {orden.descripcion && <span>· {orden.descripcion}</span>}
                      <span>· {orden.partes.length} pieza{orden.partes.length !== 1 ? 's' : ''}</span>
                      <span>· Total: <strong className="text-slate-700">${fmt(orden.total)}</strong></span>
                    </div>
                    {orden.estado === 'recibida' && orden.fechaRecibida && (
                      <div className="text-xs text-emerald-600 mt-0.5">Recibida: {new Date(orden.fechaRecibida).toLocaleDateString('es-MX')}</div>
                    )}
                  </div>
                  {orden.estado === 'pendiente' && (
                    <div className="flex gap-2">
                      <Btn size="sm" variant="success" onClick={() => onRecibirOrden(orden.id)}>✓ Marcar Recibida</Btn>
                      <Btn size="sm" variant="danger" onClick={() => onCancelarOrden(orden.id)}>Cancelar</Btn>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── VistaFacturas ─────────────────────────────────────────────────────────────

function VistaFacturas({
  facturas,
  clientes,
  vehiculos,
  trabajos,
  onRegistrarPago,
}: {
  facturas: Factura[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  trabajos: Trabajo[];
  onRegistrarPago: (facturaId: string, pago: Omit<PagoFactura, 'id'>) => void;
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [expandido, setExpandido] = useState<string | null>(null);
  const [pagoForm, setPagoForm] = useState({ monto: 0, fecha: hoy, metodoPago: 'Efectivo' });
  const [filtro, setFiltro] = useState<'todos'|'pendiente'|'parcial'|'pagado'>('todos');

  const facturasFiltradas = [...facturas]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(f => filtro === 'todos' || getEstadoPagoFactura(f) === filtro);

  const counts = { todos: facturas.length, pendiente: facturas.filter(f => getEstadoPagoFactura(f) === 'pendiente').length, parcial: facturas.filter(f => getEstadoPagoFactura(f) === 'parcial').length, pagado: facturas.filter(f => getEstadoPagoFactura(f) === 'pagado').length };
  const totalPendiente = facturas.filter(f => getEstadoPagoFactura(f) !== 'pagado').reduce((s, f) => s + getSaldoFactura(f), 0);

  const handlePago = (facturaId: string, saldo: number) => {
    if (pagoForm.monto <= 0) return;
    onRegistrarPago(facturaId, { monto: Math.min(pagoForm.monto, saldo), fecha: pagoForm.fecha, metodoPago: pagoForm.metodoPago });
    setPagoForm({ monto: 0, fecha: hoy, metodoPago: 'Efectivo' });
    setExpandido(null);
  };

  return (
    <div>
      <SectionTitle title="Facturas" subtitle="Facturas generadas desde trabajos. Aquí se registran los pagos de clientes." />

      {facturas.length === 0 && (
        <div className="text-center py-16 text-slate-400"><div className="text-5xl mb-3">🧾</div>
          <p className="font-medium text-slate-500">Sin facturas aún</p>
          <p className="text-sm mt-1">Ve a Trabajos y usa el botón <strong>+ Generar Factura</strong> en cualquier trabajo.</p></div>
      )}

      {facturas.length > 0 && <>
        {totalPendiente > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 mb-5 flex flex-wrap gap-6 items-center">
            <div><div className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Total por Cobrar</div>
              <div className="text-2xl font-extrabold text-rose-700">${fmt(totalPendiente)}</div></div>
          </div>
        )}

        <div className="flex gap-2 mb-5 flex-wrap">
          {(['todos','pendiente','parcial','pagado'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${filtro === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
              {f === 'todos' ? 'Todas' : BADGE_ESTADO[f].label} ({counts[f]})
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {facturasFiltradas.map(factura => {
            const cliente  = clientes.find(c => c.id === factura.clienteId);
            const vehiculo = vehiculos.find(v => v.id === factura.vehiculoId);
            const estado   = getEstadoPagoFactura(factura);
            const montoPag = getMontoPagadoFactura(factura);
            const saldo    = getSaldoFactura(factura);
            const badge    = BADGE_ESTADO[estado];
            const isExp    = expandido === factura.id;

            return (
              <div key={factura.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className={`grid grid-cols-1 sm:grid-cols-6 gap-2 items-center px-4 py-3 ${isExp ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'} transition-colors`}>
                  <div className="sm:col-span-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{factura.numeroFactura}</span>
                      <span className="font-semibold text-slate-800 text-sm">{cliente?.nombre ?? '—'}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                      <span>{new Date(factura.fecha).toLocaleDateString('es-MX')}</span>
                      {vehiculo && <span>· {[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')}</span>}
                      <span>· {factura.conceptos.length} conceptos</span>
                    </div>
                  </div>
                  <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Total</div><div className="font-semibold text-slate-800">${fmt(factura.total)}</div></div>
                  <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Pagado</div><div className="font-semibold text-emerald-600">${fmt(montoPag)}</div></div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Saldo</div><div className={`font-bold ${saldo > 0 ? 'text-rose-600' : 'text-slate-400'}`}>${fmt(saldo)}</div></div>
                    <Btn size="sm" variant={isExp ? 'ghost' : estado !== 'pagado' ? 'success' : 'ghost'}
                      onClick={() => { setExpandido(isExp ? null : factura.id); setPagoForm({ monto: 0, fecha: hoy, metodoPago: 'Efectivo' }); }}>
                      {isExp ? '✕' : estado !== 'pagado' ? '+ Pago' : 'Ver'}
                    </Btn>
                  </div>
                </div>

                {isExp && (
                  <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-200 space-y-4">
                    {/* Conceptos */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Conceptos</p>
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100"><tr>
                            {['Tipo','Descripción','Cant.','Precio','Subtotal'].map((h,i) => <th key={i} className={`px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>)}
                          </tr></thead>
                          <tbody className="divide-y divide-slate-100">
                            {factura.conceptos.map((c, ci) => (
                              <tr key={ci} className="bg-white">
                                <td className="px-3 py-2"><span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${c.tipo === 'parte' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{c.tipo === 'parte' ? '🔩 Parte' : '🔧 M.O.'}</span></td>
                                <td className="px-3 py-2 text-slate-800">{c.descripcion}</td>
                                <td className="px-3 py-2 text-right text-slate-700">{c.cantidad}</td>
                                <td className="px-3 py-2 text-right text-slate-600">${fmt(c.precioUnitario)}</td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(c.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                            <tr><td colSpan={4} className="px-3 py-2 text-sm font-bold text-slate-700 text-right">Total factura:</td>
                              <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(factura.total)}</td></tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Pagos historial */}
                    {factura.pagos?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Historial de pagos</p>
                        <div className="space-y-1">
                          {factura.pagos.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                              <div className="flex gap-3"><span className="text-slate-500">{new Date(p.fecha).toLocaleDateString('es-MX')}</span><span className="text-slate-500">{p.metodoPago}</span></div>
                              <span className="font-semibold text-emerald-600">+ ${fmt(p.monto)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Registrar pago */}
                    {estado !== 'pagado' && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar Pago</p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div><Label>Fecha</Label><Input type="date" value={pagoForm.fecha} onChange={e => setPagoForm(f => ({ ...f, fecha: e.target.value }))} /></div>
                          <div><Label>Monto ($) — saldo: ${fmt(saldo)}</Label><Input type="number" placeholder="0.00" min="0.01" step="0.01" value={pagoForm.monto || ''} onChange={e => setPagoForm(f => ({ ...f, monto: Number(e.target.value) }))} /></div>
                          <div><Label>Método de pago</Label>
                            <Select value={pagoForm.metodoPago} onChange={e => setPagoForm(f => ({ ...f, metodoPago: e.target.value }))}>
                              {['Efectivo','Transferencia','Tarjeta','Cheque','Otro'].map(m => <option key={m}>{m}</option>)}
                            </Select></div>
                          <div className="flex items-end"><Btn variant="success" fullWidth disabled={pagoForm.monto <= 0} onClick={() => handlePago(factura.id, saldo)}>✓ Registrar</Btn></div>
                        </div>
                      </div>
                    )}
                    {estado === 'pagado' && <p className="text-xs text-emerald-600 font-semibold text-center">✅ Esta factura está completamente pagada.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>}
    </div>
  );
}

// ─── VistaCuentas ─────────────────────────────────────────────────────────────

type FiltroCuenta = 'todos' | 'pendiente' | 'parcial' | 'pagado';

const BADGE_ESTADO: Record<'pendiente' | 'parcial' | 'pagado', { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-rose-100 text-rose-700' },
  parcial:   { label: 'Parcial',   cls: 'bg-amber-100 text-amber-700' },
  pagado:    { label: 'Pagado',    cls: 'bg-emerald-100 text-emerald-700' },
};

function VistaCuentas({
  facturas,
  trabajos,
  clientes,
  vehiculos,
  onRegistrarPagoFactura,
  onRegistrarPagoTrabajo,
}: {
  facturas: Factura[];
  trabajos: Trabajo[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  onRegistrarPagoFactura: (facturaId: string, pago: Omit<PagoFactura, 'id'>) => void;
  onRegistrarPagoTrabajo: (trabajoId: string, pago: Omit<Pago, 'id'>) => void;
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [filtro, setFiltro] = useState<FiltroCuenta>('todos');
  const [expandidoF, setExpandidoF] = useState<string | null>(null);
  const [expandidoT, setExpandidoT] = useState<string | null>(null);
  const [pagoFormF, setPagoFormF] = useState({ monto: 0, fecha: hoy, metodoPago: 'Efectivo' });
  const [pagoFormT, setPagoFormT] = useState({ monto: 0, fecha: hoy, nota: '' });

  // Legacy: trabajos without a facturaId
  const legacyTrabajos = trabajos.filter(t => !t.facturaId);

  const facturasFiltradas = [...facturas]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(f => filtro === 'todos' || getEstadoPagoFactura(f) === filtro);

  const legacyFiltrados = legacyTrabajos.filter(t => filtro === 'todos' || getEstadoPago(t) === filtro);

  const totalPendiente = facturas.filter(f => getEstadoPagoFactura(f) !== 'pagado').reduce((s, f) => s + getSaldoFactura(f), 0)
    + legacyTrabajos.filter(t => getEstadoPago(t) !== 'pagado').reduce((s, t) => s + getSaldo(t), 0);

  const counts = {
    todos: facturas.length + legacyTrabajos.length,
    pendiente: facturas.filter(f => getEstadoPagoFactura(f) === 'pendiente').length + legacyTrabajos.filter(t => getEstadoPago(t) === 'pendiente').length,
    parcial: facturas.filter(f => getEstadoPagoFactura(f) === 'parcial').length + legacyTrabajos.filter(t => getEstadoPago(t) === 'parcial').length,
    pagado: facturas.filter(f => getEstadoPagoFactura(f) === 'pagado').length + legacyTrabajos.filter(t => getEstadoPago(t) === 'pagado').length,
  };

  return (
    <div>
      <SectionTitle title="Cuentas por Cobrar" subtitle="Pagos de clientes: facturas emitidas y trabajos pendientes de cobro." />

      {totalPendiente > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 mb-5 flex flex-wrap gap-6 items-center">
          <div><div className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Total por Cobrar</div>
            <div className="text-2xl font-extrabold text-rose-700">${fmt(totalPendiente)}</div></div>
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {(['todos','pendiente','parcial','pagado'] as FiltroCuenta[]).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${filtro === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
            {f === 'todos' ? 'Todos' : BADGE_ESTADO[f].label} ({counts[f]})
          </button>
        ))}
      </div>

      {/* ── Facturas section ── */}
      {facturasFiltradas.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">🧾 Facturas emitidas</h3>
          <div className="space-y-2">
            {facturasFiltradas.map(factura => {
              const cliente  = clientes.find(c => c.id === factura.clienteId);
              const estado   = getEstadoPagoFactura(factura);
              const montoPag = getMontoPagadoFactura(factura);
              const saldo    = getSaldoFactura(factura);
              const badge    = BADGE_ESTADO[estado];
              const isExp    = expandidoF === factura.id;
              return (
                <div key={factura.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className={`grid grid-cols-1 sm:grid-cols-6 gap-2 items-center px-4 py-3 ${isExp ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'} transition-colors`}>
                    <div className="sm:col-span-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{factura.numeroFactura}</span>
                        <span className="font-semibold text-slate-800 text-sm">{cliente?.nombre ?? '—'}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{new Date(factura.fecha).toLocaleDateString('es-MX')}</div>
                    </div>
                    <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Total</div><div className="font-semibold text-slate-800">${fmt(factura.total)}</div></div>
                    <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Pagado</div><div className="font-semibold text-emerald-600">${fmt(montoPag)}</div></div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Saldo</div><div className={`font-bold ${saldo > 0 ? 'text-rose-600' : 'text-slate-400'}`}>${fmt(saldo)}</div></div>
                      <Btn size="sm" variant={isExp ? 'ghost' : estado !== 'pagado' ? 'success' : 'ghost'}
                        onClick={() => { setExpandidoF(isExp ? null : factura.id); setPagoFormF({ monto: 0, fecha: hoy, metodoPago: 'Efectivo' }); }}>
                        {isExp ? '✕' : estado !== 'pagado' ? '+ Pago' : 'Ver'}
                      </Btn>
                    </div>
                  </div>
                  {isExp && estado !== 'pagado' && (
                    <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar Pago</p>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div><Label>Fecha</Label><Input type="date" value={pagoFormF.fecha} onChange={e => setPagoFormF(f => ({ ...f, fecha: e.target.value }))} /></div>
                        <div><Label>Monto ($)</Label><Input type="number" placeholder="0.00" min="0.01" step="0.01" value={pagoFormF.monto || ''} onChange={e => setPagoFormF(f => ({ ...f, monto: Number(e.target.value) }))} /></div>
                        <div><Label>Método</Label>
                          <Select value={pagoFormF.metodoPago} onChange={e => setPagoFormF(f => ({ ...f, metodoPago: e.target.value }))}>
                            {['Efectivo','Transferencia','Tarjeta','Cheque','Otro'].map(m => <option key={m}>{m}</option>)}
                          </Select></div>
                        <div className="flex items-end"><Btn variant="success" fullWidth disabled={pagoFormF.monto <= 0} onClick={() => { onRegistrarPagoFactura(factura.id, { monto: Math.min(pagoFormF.monto, saldo), fecha: pagoFormF.fecha, metodoPago: pagoFormF.metodoPago }); setPagoFormF({ monto: 0, fecha: hoy, metodoPago: 'Efectivo' }); setExpandidoF(null); }}>✓ Registrar</Btn></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Legacy trabajos (without factura) ── */}
      {legacyFiltrados.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">🔧 Trabajos sin factura (legado)</h3>
          <div className="space-y-2">
            {legacyFiltrados.map(trabajo => {
              const cliente  = clientes.find(c => c.id === trabajo.clienteId);
              const vehiculo = vehiculos.find(v => v.id === trabajo.vehiculoId);
              const estado   = getEstadoPago(trabajo);
              const montoPag = getMontoPagado(trabajo);
              const saldo    = getSaldo(trabajo);
              const badge    = BADGE_ESTADO[estado];
              const isExp    = expandidoT === trabajo.id;
              return (
                <div key={trabajo.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className={`grid grid-cols-1 sm:grid-cols-6 gap-2 items-center px-4 py-3 ${isExp ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'} transition-colors`}>
                    <div className="sm:col-span-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{cliente?.nombre ?? '—'}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                        <span>{new Date(trabajo.fecha).toLocaleDateString('es-MX')}</span>
                        {vehiculo && <span>· {[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')}</span>}
                        <span>· {trabajo.descripcion}</span>
                      </div>
                    </div>
                    <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Total</div><div className="font-semibold text-slate-800">${fmt(trabajo.total)}</div></div>
                    <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Pagado</div><div className="font-semibold text-emerald-600">${fmt(montoPag)}</div></div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Saldo</div><div className={`font-bold ${saldo > 0 ? 'text-rose-600' : 'text-slate-400'}`}>${fmt(saldo)}</div></div>
                      {estado !== 'pagado' && <Btn size="sm" variant={isExp ? 'ghost' : 'success'} onClick={() => { setExpandidoT(isExp ? null : trabajo.id); setPagoFormT({ monto: 0, fecha: hoy, nota: '' }); }}>{isExp ? '✕' : '+ Pago'}</Btn>}
                    </div>
                  </div>
                  {isExp && estado !== 'pagado' && (
                    <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div><Label>Fecha</Label><Input type="date" value={pagoFormT.fecha} onChange={e => setPagoFormT(f => ({ ...f, fecha: e.target.value }))} /></div>
                        <div><Label>Monto ($)</Label><Input type="number" placeholder="0.00" min="0.01" step="0.01" value={pagoFormT.monto || ''} onChange={e => setPagoFormT(f => ({ ...f, monto: Number(e.target.value) }))} /></div>
                        <div><Label>Nota</Label><Input type="text" placeholder="Efectivo, transferencia..." value={pagoFormT.nota} onChange={e => setPagoFormT(f => ({ ...f, nota: e.target.value }))} /></div>
                        <div className="flex items-end"><Btn variant="success" fullWidth disabled={pagoFormT.monto <= 0} onClick={() => { onRegistrarPagoTrabajo(trabajo.id, { monto: Math.min(pagoFormT.monto, saldo), fecha: pagoFormT.fecha, nota: pagoFormT.nota || undefined }); setPagoFormT({ monto: 0, fecha: hoy, nota: '' }); setExpandidoT(null); }}>✓ Registrar</Btn></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {facturasFiltradas.length === 0 && legacyFiltrados.length === 0 && (
        <div className="text-center py-14 text-slate-400"><div className="text-5xl mb-3">💰</div><p className="font-medium text-slate-500">{filtro === 'todos' ? 'Sin registros' : `Sin registros con estado "${BADGE_ESTADO[filtro as 'pendiente'|'parcial'|'pagado'].label}"`}</p></div>
      )}
    </div>
  );
}
// ─── VistaCuentasPorPagar ─────────────────────────────────────────────────────

function VistaCuentasPorPagar({
  ordenes,
  proveedores,
  onRegistrarPago,
  onIrAOrdenes,
}: {
  ordenes: OrdenCompra[];
  proveedores: Proveedor[];
  onRegistrarPago: (ordenId: string, pago: Omit<PagoCompra, 'id'>) => void;
  onIrAOrdenes: () => void;
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [expandido, setExpandido] = useState<string | null>(null);
  const [pagoForm, setPagoForm] = useState({ monto: 0, fecha: hoy, nota: '' });
  const [filtro, setFiltro] = useState<'todos'|'pendiente'|'parcial'|'pagado'>('todos');

  // Only show received POs (they're the ones that create a payable)
  const ordenesPagables = ordenes.filter(o => o.estado === 'recibida');

  const ordenesFiltradas = [...ordenesPagables]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(o => filtro === 'todos' || getEstadoPagoOrden(o) === filtro);

  const counts = { todos: ordenesPagables.length, pendiente: ordenesPagables.filter(o => getEstadoPagoOrden(o) === 'pendiente').length, parcial: ordenesPagables.filter(o => getEstadoPagoOrden(o) === 'parcial').length, pagado: ordenesPagables.filter(o => getEstadoPagoOrden(o) === 'pagado').length };
  const totalPendiente = ordenesPagables.filter(o => getEstadoPagoOrden(o) !== 'pagado').reduce((s, o) => s + getSaldoOrden(o), 0);

  const handlePago = (ordenId: string, saldo: number) => {
    if (pagoForm.monto <= 0) return;
    onRegistrarPago(ordenId, { monto: Math.min(pagoForm.monto, saldo), fecha: pagoForm.fecha, nota: pagoForm.nota || undefined });
    setPagoForm({ monto: 0, fecha: hoy, nota: '' });
    setExpandido(null);
  };

  return (
    <div>
      <SectionTitle title="Cuentas por Pagar" subtitle="Pagos pendientes a proveedores por órdenes de compra recibidas." />

      {ordenesPagables.length === 0 && (
        <div className="text-center py-14 text-slate-400">
          <div className="text-5xl mb-3">🔴</div>
          <p className="font-medium text-slate-500">Sin cuentas por pagar</p>
          <p className="text-sm mt-1">Las cuentas por pagar se generan cuando marcas una OC como recibida.</p>
          <button type="button" onClick={onIrAOrdenes} className="mt-2 text-indigo-600 font-semibold hover:underline text-sm">Ver Órdenes de Compra →</button>
        </div>
      )}

      {ordenesPagables.length > 0 && <>
        {totalPendiente > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 mb-5 flex flex-wrap gap-6 items-center">
            <div><div className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Total por Pagar</div>
              <div className="text-2xl font-extrabold text-rose-700">${fmt(totalPendiente)}</div></div>
          </div>
        )}

        <div className="flex gap-2 mb-4 flex-wrap">
          {(['todos','pendiente','parcial','pagado'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${filtro === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
              {f === 'todos' ? 'Todas' : BADGE_ESTADO[f].label} ({counts[f]})
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {ordenesFiltradas.map(orden => {
            const prov    = proveedores.find(p => p.id === orden.proveedorId);
            const estado  = getEstadoPagoOrden(orden);
            const montoPag = getMontoPagadoOrden(orden);
            const saldo   = getSaldoOrden(orden);
            const badge   = BADGE_ESTADO[estado];
            const isExp   = expandido === orden.id;

            return (
              <div key={orden.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className={`grid grid-cols-1 sm:grid-cols-6 gap-2 items-center px-4 py-3 ${isExp ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'} transition-colors`}>
                  <div className="sm:col-span-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {orden.numeroOrden && <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{orden.numeroOrden}</span>}
                      <span className="font-semibold text-slate-800 text-sm">🏪 {prov?.nombre ?? '—'}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                      <span>{orden.fechaRecibida ? `Recibida: ${new Date(orden.fechaRecibida).toLocaleDateString('es-MX')}` : new Date(orden.fecha).toLocaleDateString('es-MX')}</span>
                      {orden.descripcion && <span>· {orden.descripcion}</span>}
                      <span>· {orden.partes.length} pieza{orden.partes.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Total</div><div className="font-semibold text-slate-800">${fmt(orden.total)}</div></div>
                  <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Pagado</div><div className="font-semibold text-emerald-600">${fmt(montoPag)}</div></div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Saldo</div><div className={`font-bold ${saldo > 0 ? 'text-rose-600' : 'text-slate-400'}`}>${fmt(saldo)}</div></div>
                    <Btn size="sm" variant={isExp ? 'ghost' : estado !== 'pagado' ? 'success' : 'ghost'}
                      onClick={() => { setExpandido(isExp ? null : orden.id); setPagoForm({ monto: 0, fecha: hoy, nota: '' }); }}>
                      {isExp ? '✕' : estado !== 'pagado' ? '+ Pago' : 'Ver'}
                    </Btn>
                  </div>
                </div>

                {isExp && (
                  <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-200 space-y-4">
                    {/* Items */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Piezas recibidas</p>
                      <div className="space-y-1">
                        {orden.partes.map(it => (
                          <div key={it.refaccionId} className="flex justify-between bg-white border border-slate-200 rounded px-3 py-1.5 text-sm">
                            <span className="text-slate-700">{it.nombre} × {it.cantidad}</span>
                            <span className="font-semibold text-slate-800">${fmt(it.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Historial pagos */}
                    {orden.pagos?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Historial de pagos</p>
                        <div className="space-y-1">
                          {orden.pagos.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                              <div className="flex gap-3"><span className="text-slate-500">{new Date(p.fecha).toLocaleDateString('es-MX')}</span>{p.nota && <span className="text-slate-500 italic">{p.nota}</span>}</div>
                              <span className="font-semibold text-emerald-600">+ ${fmt(p.monto)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Registrar pago */}
                    {estado !== 'pagado' && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar Pago al Proveedor</p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div><Label>Fecha</Label><Input type="date" value={pagoForm.fecha} onChange={e => setPagoForm(f => ({ ...f, fecha: e.target.value }))} /></div>
                          <div><Label>Monto ($) — saldo: ${fmt(saldo)}</Label><Input type="number" placeholder="0.00" min="0.01" step="0.01" value={pagoForm.monto || ''} onChange={e => setPagoForm(f => ({ ...f, monto: Number(e.target.value) }))} /></div>
                          <div><Label>Nota (opcional)</Label><Input type="text" placeholder="Efectivo, transferencia..." value={pagoForm.nota} onChange={e => setPagoForm(f => ({ ...f, nota: e.target.value }))} /></div>
                          <div className="flex items-end"><Btn variant="success" fullWidth disabled={pagoForm.monto <= 0} onClick={() => handlePago(orden.id, saldo)}>✓ Registrar</Btn></div>
                        </div>
                      </div>
                    )}
                    {estado === 'pagado' && <p className="text-xs text-emerald-600 font-semibold text-center">✅ Esta orden está completamente pagada.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>}
    </div>
  );
}

// ─── VistaResumen ─────────────────────────────────────────────────────────────

function VistaResumen({
  mesActual,
  setMesActual,
  resumen,
  trabajos,
  clientes,
  vehiculos,
}: {
  mesActual: string;
  setMesActual: (m: string) => void;
  resumen: {
    facturadoMes: number; totalVentaRef: number; totalCostoRef: number;
    margenRef: number; totalManoObra: number; ganancia: number; cantidad: number;
    cobradoEnMes: number; porCobrarDelMes: number; totalOrdenes: number; porPagarOrdenes: number;
  };
  trabajos: Trabajo[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
}) {
  const getCliente = (id: string) => clientes.find(c => c.id === id);
  const getVehiculo = (id: string) => vehiculos.find(v => v.id === id);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <SectionTitle title="Resumen Mensual" />
        <div className="flex-shrink-0">
          <Label>Periodo</Label>
          <Input type="month" value={mesActual} onChange={e => setMesActual(e.target.value)} className="w-auto" />
        </div>
      </div>

      {/* ── 4 tarjetas principales ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md">
          <div className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-2">Facturado del Mes</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.facturadoMes)}</div>
          <div className="text-indigo-200 text-xs mt-2">{resumen.cantidad} trabajo{resumen.cantidad !== 1 ? 's' : ''} realizados</div>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 text-white shadow-md">
          <div className="text-rose-200 text-xs font-bold uppercase tracking-widest mb-2">Costo Refacciones</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.totalCostoRef)}</div>
          <div className="text-rose-200 text-xs mt-2">Lo que pagaste al proveedor</div>
        </div>
        <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl p-5 text-white shadow-md">
          <div className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-2">Mano de Obra</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.totalManoObra)}</div>
          <div className="text-slate-300 text-xs mt-2">Cobrado por servicio</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-md">
          <div className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-2">Ganancia Neta</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.ganancia)}</div>
          <div className="text-emerald-200 text-xs mt-2">
            {resumen.facturadoMes > 0 ? `${((resumen.ganancia / resumen.facturadoMes) * 100).toFixed(1)}% margen` : 'Sin movimientos'}
          </div>
        </div>
      </div>

      {/* ── Cuentas por Cobrar del Mes ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border-2 border-emerald-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">💵</div>
          <div>
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Pagos Recibidos en el Mes</div>
            <div className="text-2xl font-extrabold text-slate-900">${fmt(resumen.cobradoEnMes)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Efectivo/transferencias recibidas</div>
          </div>
        </div>
        <div className="bg-white border-2 border-rose-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">⏳</div>
          <div>
            <div className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1">Por Cobrar del Mes</div>
            <div className="text-2xl font-extrabold text-slate-900">${fmt(resumen.porCobrarDelMes)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Pendiente de trabajos de este mes</div>
          </div>
        </div>
      </div>

      {/* ── Desglose de utilidades en refacciones ── */}
      {resumen.totalVentaRef > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-8">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Desglose de Refacciones</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-1">Venta al cliente</div>
              <div className="font-bold text-slate-900 text-lg">${fmt(resumen.totalVentaRef)}</div>
            </div>
            <div className="text-center border-x border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Costo proveedor</div>
              <div className="font-bold text-rose-600 text-lg">${fmt(resumen.totalCostoRef)}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-1">Margen en partes</div>
              <div className={`font-bold text-lg ${resumen.margenRef >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ${fmt(resumen.margenRef)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabla detalle ── */}
      <div>
        <h3 className="text-base font-bold text-slate-700 mb-3">
          Detalle de Trabajos del Mes
          {trabajos.length > 0 && <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{trabajos.length}</span>}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['Fecha','Cliente','Unidad','Trabajo','Cobrado','Costo Partes','Ganancia'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trabajos.map((trabajo, i) => {
                const cliente  = getCliente(trabajo.clienteId);
                const vehiculo = getVehiculo(trabajo.vehiculoId);
                const costoPartes = trabajo.costoRefacciones ?? trabajo.refacciones;
                const ganancia = trabajo.manoDeObra + (trabajo.refacciones - costoPartes);
                return (
                  <tr key={trabajo.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">{new Date(trabajo.fecha).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{vehiculo ? [vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') : '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{trabajo.descripcion}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">${fmt(trabajo.total)}</td>
                    <td className="px-4 py-3 text-right text-rose-600 font-medium">${fmt(costoPartes)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">${fmt(ganancia)}</td>
                  </tr>
                );
              })}
              {trabajos.length === 0 && <EmptyRow cols={7} message="No hay trabajos registrados en este mes." />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
