'use client';

import { useState, useEffect } from 'react';
import type {
  Cliente, Vehiculo, Refaccion, Trabajo, Proveedor, OrdenCompra, Factura,
  TrabajoRefaccion, Pago, PagoCompra, PagoFactura, FacturaConcepto, CompraItem,
} from '@/app/types';
import {
  generarNumeroFactura, generarNumeroOrden,
  getEstadoPagoFactura, getSaldoFactura,
  getEstadoPagoOrden,
} from '@/app/lib/utils';
import { Card } from '@/app/components/ui';
import { VistaClientes } from '@/app/modules/clientes';
import { VistaInventario } from '@/app/modules/inventario';
import { VistaTrabajo } from '@/app/modules/trabajos';
import { VistaProveedores } from '@/app/modules/proveedores';
import { VistaOrdenesCompra } from '@/app/modules/ordenes';
import { VistaFacturas } from '@/app/modules/facturas';
import { VistaCuentas, VistaCuentasPorPagar } from '@/app/modules/cuentas';
import { VistaResumen } from '@/app/modules/resumen';

export default function TallerMecanico() {
  const [clientes,    setClientes]    = useState<Cliente[]>([]);
  const [vehiculos,   setVehiculos]   = useState<Vehiculo[]>([]);
  const [inventario,  setInventario]  = useState<Refaccion[]>([]);
  const [trabajos,    setTrabajos]    = useState<Trabajo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenes,     setOrdenes]     = useState<OrdenCompra[]>([]);
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
          requiereFactura: t.requiereFactura ?? false,
          iva: t.iva ?? 0,
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
  const guardarTrabajo = (data: Omit<Trabajo, 'id' | 'total' | 'iva'>) => {
    const subtotal = data.manoDeObra + data.refacciones;
    const iva      = data.requiereFactura ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
    const total    = subtotal + iva;
    const nuevo: Trabajo = { ...data, id: Date.now().toString(), iva, total, estadoFacturacion: 'sin_facturar' };
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
  const finalizarTrabajo = (trabajoId: string, tipo: 'factura' | 'nota') => {
    const trabajo = trabajos.find(t => t.id === trabajoId);
    if (!trabajo) return;
    const requiereFactura = tipo === 'factura';
    const subtotal = trabajo.manoDeObra + trabajo.refacciones;
    const iva      = requiereFactura ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
    const total    = subtotal + iva;
    const nuevos = trabajos.map(t =>
      t.id === trabajoId
        ? { ...t, estado: 'completado' as const, tipoDocumento: tipo, requiereFactura, iva, total, fechaFinalizacion: new Date().toISOString() }
        : t
    );
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
    const nuevasOrdenes = ordenes.map(o =>
      o.id === ordenId ? { ...o, estado: 'recibida' as const, fechaRecibida: new Date().toISOString().split('T')[0] } : o
    );
    setOrdenes(nuevasOrdenes); localStorage.setItem('ordenes', JSON.stringify(nuevasOrdenes));
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
    const cobradoEnMes = facturas.reduce((s, f) =>
      s + (f.pagos ?? []).filter(p => p.fecha.startsWith(mesActual)).reduce((s2, p) => s2 + p.monto, 0), 0);
    const porCobrarDelMes = facturas.filter(f => {
      const t = trabajos.find(t => t.id === f.trabajoId);
      return t?.fecha.startsWith(mesActual);
    }).reduce((s, f) => s + getSaldoFactura(f), 0);
    const ordenesMes    = ordenes.filter(o => o.fecha.startsWith(mesActual) && o.estado !== 'cancelada');
    const totalOrdenes  = ordenesMes.reduce((s, o) => s + o.total, 0);
    const porPagarOrdenes = ordenesMes.filter(o => o.estado === 'recibida').reduce((s, o) => s + (o.total - (o.pagos ?? []).reduce((s2, p) => s2 + p.monto, 0)), 0);
    const mesConIVA    = mes.filter(t => t.requiereFactura);
    const mesSinIVA    = mes.filter(t => !t.requiereFactura);
    const totalIVA     = mesConIVA.reduce((s, t) => s + (t.iva ?? 0), 0);
    const ingresoConIVA = mesConIVA.reduce((s, t) => s + t.total, 0);
    const ingresoSinIVA = mesSinIVA.reduce((s, t) => s + t.total, 0);
    return {
      facturadoMes, totalVentaRef, totalCostoRef, margenRef, totalManoObra, ganancia,
      cantidad: mes.length, cobradoEnMes, porCobrarDelMes, totalOrdenes, porPagarOrdenes,
      totalIVA, ingresoConIVA, ingresoSinIVA,
    };
  };

  const stockBajo              = inventario.filter(r => r.stock <= r.stockMinimo).length;
  const facturasPendientes     = facturas.filter(f => getEstadoPagoFactura(f) !== 'pagado').length;
  const ordenesPendientesPago  = ordenes.filter(o => o.estado === 'recibida' && getEstadoPagoOrden(o) !== 'pagado').length;
  const ordenesPendientesRecibir = ordenes.filter(o => o.estado === 'pendiente').length;
  const trabajosPendientes     = trabajos.filter(t => t.estado === 'pendiente').length;

  const tabs = [
    { key: 'clientes',    icon: '👥', label: 'Clientes',         count: clientes.length },
    { key: 'inventario',  icon: '📦', label: 'Inventario',        count: stockBajo > 0 ? `⚠ ${stockBajo}` : inventario.length > 0 ? inventario.length : null },
    { key: 'trabajos',    icon: '🔧', label: 'Trabajos',          count: trabajosPendientes > 0 ? `🕐 ${trabajosPendientes}` : trabajos.length > 0 ? trabajos.length : null },
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
                    : (typeof count === 'string' && count.startsWith('🕐')) ? 'bg-amber-100 text-amber-700'
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
              onFinalizar={finalizarTrabajo}
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
