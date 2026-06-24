'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Cliente, Vehiculo, Refaccion, Trabajo, Proveedor, OrdenCompra, Factura,
  Pago, PagoCompra, PagoFactura, FacturaConcepto, CompatibilidadVehiculo,
} from '@/app/types';
import {
  generarNumeroFactura, generarNumeroOrden,
  getEstadoPagoFactura, getSaldoFactura, getSaldo,
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
import { VistaHistorial } from '@/app/modules/historial';
import { VistaConfiguracion } from '@/app/modules/configuracion';
import { VistaCotizaciones } from '@/app/modules/cotizaciones';
import type { ConversionTrabajo } from '@/app/modules/cotizaciones';
import { useAuth }      from '@/app/context/auth';
import * as db          from '@/app/lib/db';

type Vista = 'clientes'|'inventario'|'trabajos'|'proveedores'|'ordenes'|'facturas'|'cuentas'|'pagos'|'resumen'|'historial'|'configuracion'|'cotizaciones';

export default function TallerMecanico() {
  const { taller, talleres, selectTaller, user, signOut } = useAuth();
  const [showTallerMenu, setShowTallerMenu] = useState(false);
  const [clientes,    setClientes]    = useState<Cliente[]>([]);
  const [vehiculos,   setVehiculos]   = useState<Vehiculo[]>([]);
  const [inventario,  setInventario]  = useState<Refaccion[]>([]);
  const [trabajos,    setTrabajos]    = useState<Trabajo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenes,     setOrdenes]     = useState<OrdenCompra[]>([]);
  const [facturas,    setFacturas]    = useState<Factura[]>([]);
  const [vista, setVista] = useState<Vista>('clientes');
  const [mesActual, setMesActual] = useState(new Date().toISOString().slice(0, 7));
  const [cargando, setCargando] = useState(true);

  // ── Cargar datos desde Supabase ──
  const cargarDatos = useCallback(async () => {
    if (!taller) return;
    setCargando(true);
    const [c, v, r, t, p, o, f] = await Promise.all([
      db.getClientes(taller.id),
      db.getVehiculos(taller.id),
      db.getRefacciones(taller.id),
      db.getTrabajos(taller.id),
      db.getProveedores(taller.id),
      db.getOrdenes(taller.id),
      db.getFacturas(taller.id),
    ]);
    setClientes(c); setVehiculos(v); setInventario(r); setTrabajos(t);
    setProveedores(p); setOrdenes(o); setFacturas(f);
    setCargando(false);
  }, [taller]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Handlers ──

  const guardarCliente = async (data: Omit<Cliente, 'id'>) => {
    if (!taller) return;
    const nuevo = await db.insertCliente(taller.id, data);
    if (nuevo) setClientes(prev => [...prev, nuevo]);
  };
  const guardarVehiculo = async (data: Omit<Vehiculo, 'id'>) => {
    if (!taller) return;
    const nuevo = await db.insertVehiculo(taller.id, data);
    if (nuevo) setVehiculos(prev => [...prev, nuevo]);
  };
  const guardarRefaccion = async (data: Omit<Refaccion, 'id'>) => {
    if (!taller) return;
    const nuevo = await db.insertRefaccion(taller.id, data);
    if (nuevo) setInventario(prev => [...prev, nuevo]);
  };
  const recibirStock = async (refaccionId: string, cantidad: number) => {
    const ref = inventario.find(r => r.id === refaccionId);
    if (!ref) return;
    const nuevoStock = ref.stock + cantidad;
    await db.updateRefaccionStock(refaccionId, nuevoStock);
    setInventario(prev => prev.map(r => r.id === refaccionId ? { ...r, stock: nuevoStock } : r));
  };
  /** Creates a new refaccion from within a PO form — used by VistaOrdenesCompra */
  const crearRefaccionDesdeOrden = async (data: Omit<Refaccion, 'id'>): Promise<Refaccion | null> => {
    if (!taller) return null;
    const nuevo = await db.insertRefaccion(taller.id, data);
    if (nuevo) setInventario(prev => [...prev, nuevo]);
    return nuevo;
  };

  /** Adds a refaccion from cotización reconciliation */
  const agregarRefaccionDesdeCotizacion = async (data: Omit<Refaccion, 'id'>): Promise<Refaccion | null> => {
    if (!taller) return null;
    const nuevo = await db.insertRefaccion(taller.id, data);
    if (nuevo) setInventario(prev => [...prev, nuevo]);
    return nuevo;
  };

  /** Converts an approved cotización to a trabajo */
  const convertirCotizacionATrabajo = async (data: ConversionTrabajo): Promise<void> => {
    if (!taller) return;
    const totalManoDeObra = data.manoDeObraItems.reduce((s, l) => s + l.precio, 0);
    const totalVentaRef   = data.partes.reduce((s, p) => s + p.subtotal, 0);
    const totalCostoRef   = data.partes.reduce((s, p) => s + p.costoTotal, 0);
    const subtotal        = totalManoDeObra + totalVentaRef;
    const nuevo = await db.insertTrabajo(taller.id, {
      clienteId:         data.clienteId,
      vehiculoId:        data.vehiculoId,
      fecha:             data.fecha,
      numeroOrden:       data.cotizacionNumero,
      descripcion:       data.descripcion,
      manoDeObra:        totalManoDeObra,
      manoDeObraItems:   data.manoDeObraItems,
      refacciones:       totalVentaRef,
      costoRefacciones:  totalCostoRef,
      requiereFactura:   false,
      iva:               0,
      total:             subtotal,
      partes:            data.partes,
      pagos:             [],
      estado:            'pendiente',
      estadoFacturacion: 'sin_facturar',
    });
    if (nuevo) {
      setTrabajos(prev => [...prev, nuevo]);
      if (data.partes.length > 0) {
        const updatedInv = inventario.map(r => {
          const usada = data.partes.find(p => p.refaccionId === r.id);
          return usada ? { ...r, stock: r.stock - usada.cantidad } : r;
        });
        await db.updateRefacciones(updatedInv.filter(r => data.partes.some(p => p.refaccionId === r.id)));
        setInventario(updatedInv);
      }
      setVista('trabajos');
    }
  };
  const actualizarCompatibilidad = async (refaccionId: string, compatibilidad: CompatibilidadVehiculo[]) => {
    const compat = compatibilidad.length > 0 ? compatibilidad : undefined;
    await db.updateRefaccionCompatibilidad(refaccionId, compat ?? null);
    setInventario(prev => prev.map(r => r.id === refaccionId ? { ...r, compatibilidad: compat } : r));
  };
  const guardarTrabajo = async (data: Omit<Trabajo, 'id' | 'total' | 'iva'>) => {
    if (!taller) return;
    const subtotal = data.manoDeObra + data.refacciones;
    const iva      = data.requiereFactura ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
    const total    = subtotal + iva;
    const nuevo = await db.insertTrabajo(taller.id, { ...data, iva, total, estadoFacturacion: 'sin_facturar' });
    if (!nuevo) return;
    setTrabajos(prev => [...prev, nuevo]);
    if (data.partes.length > 0) {
      const nuevoInv = inventario.map(r => {
        const usada = data.partes.find(p => p.refaccionId === r.id);
        return usada ? { ...r, stock: r.stock - usada.cantidad } : r;
      });
      await db.updateRefacciones(nuevoInv.filter(r => data.partes.some(p => p.refaccionId === r.id)));
      setInventario(nuevoInv);
    }
  };

  const editarTrabajo = async (trabajoId: string, data: Omit<Trabajo, 'id' | 'total' | 'iva'>) => {
    const subtotal = data.manoDeObra + data.refacciones;
    const iva = data.requiereFactura ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
    const total = subtotal + iva;
    const existing = trabajos.find(t => t.id === trabajoId);
    if (!existing) return;
    const updated = { ...existing, ...data, iva, total };
    await db.updateTrabajo(trabajoId, updated);
    setTrabajos(prev => prev.map(t => t.id === trabajoId ? { ...t, ...updated } : t));
  };
  const registrarPago = async (trabajoId: string, pago: Omit<Pago, 'id'>) => {
    const trabajoActual = trabajos.find(t => t.id === trabajoId);
    if (!trabajoActual) return;
    const nuevoPago: Pago = { ...pago, id: Date.now().toString() };
    const nuevos = [...(trabajoActual.pagos ?? []), nuevoPago];
    await db.updateTrabajoPagos(trabajoId, nuevos);
    setTrabajos(prev => prev.map(t => t.id === trabajoId ? { ...t, pagos: nuevos } : t));
  };
  const finalizarTrabajo = async (trabajoId: string, tipo: 'factura' | 'nota') => {
    const trabajo = trabajos.find(t => t.id === trabajoId);
    if (!trabajo) return;
    const subtotal = trabajo.manoDeObra + trabajo.refacciones;
    const iva = tipo === 'factura' ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
    const total = subtotal + iva;
    await db.updateTrabajoFinalizar(trabajoId, tipo, iva, total);
    setTrabajos(prev => prev.map(t => t.id === trabajoId
      ? { ...t, estado: 'completado' as const, tipoDocumento: tipo, requiereFactura: tipo === 'factura', iva, total, fechaFinalizacion: new Date().toISOString() }
      : t
    ));
  };
  const guardarProveedor = async (data: Omit<Proveedor, 'id'>) => {
    if (!taller) return;
    const nuevo = await db.insertProveedor(taller.id, data);
    if (nuevo) setProveedores(prev => [...prev, nuevo]);
  };

  // ── Purchase Order handlers ──
  const crearOrden = async (data: Omit<OrdenCompra, 'id' | 'estado' | 'fechaRecibida' | 'pagos'>) => {
    if (!taller) return;
    const nueva = await db.insertOrden(taller.id, { ...data, numeroOrden: data.numeroOrden || generarNumeroOrden(ordenes) });
    if (nueva) setOrdenes(prev => [...prev, nueva]);
  };
  const recibirOrden = async (ordenId: string) => {
    const orden = ordenes.find(o => o.id === ordenId);
    if (!orden || orden.estado !== 'pendiente') return;
    const hoy = new Date().toISOString().split('T')[0];
    await db.updateOrdenEstado(ordenId, 'recibida', hoy);
    setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, estado: 'recibida' as const, fechaRecibida: hoy } : o));
    if (orden.partes.length > 0) {
      const nuevoInv = inventario.map(r => {
        const item = orden.partes.find(p => p.refaccionId === r.id);
        return item ? { ...r, stock: r.stock + item.cantidad } : r;
      });
      await db.updateRefacciones(nuevoInv.filter(r => orden.partes.some(p => p.refaccionId === r.id)));
      setInventario(nuevoInv);
    }
  };
  const cancelarOrden = async (ordenId: string) => {
    await db.updateOrdenEstado(ordenId, 'cancelada');
    setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, estado: 'cancelada' as const } : o));
  };
  const registrarPagoOrden = async (ordenId: string, pago: Omit<PagoCompra, 'id'>) => {
    const ordenActual = ordenes.find(o => o.id === ordenId);
    if (!ordenActual) return;
    const nuevoPago: PagoCompra = { ...pago, id: Date.now().toString() };
    const nuevos = [...(ordenActual.pagos ?? []), nuevoPago];
    await db.updateOrdenPagos(ordenId, nuevos);
    setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, pagos: nuevos } : o));
  };

  // ── Invoice (Factura) handlers ──
  const generarFactura = async (trabajoId: string) => {
    if (!taller) return;
    const trabajo = trabajos.find(t => t.id === trabajoId);
    if (!trabajo || trabajo.facturaId) return;
    const conceptos: FacturaConcepto[] = [
      ...trabajo.manoDeObraItems.map(m => ({ tipo: 'mano_de_obra' as const, descripcion: m.concepto, cantidad: 1, precioUnitario: m.precio, subtotal: m.precio })),
      ...trabajo.partes.map(p => ({ tipo: 'parte' as const, descripcion: p.nombre, cantidad: p.cantidad, precioUnitario: p.precioVenta, subtotal: p.subtotal })),
    ];
    const subtotal = conceptos.reduce((s, c) => s + c.subtotal, 0);
    const nuevaFactura = await db.insertFactura(taller.id, {
      numeroFactura: generarNumeroFactura(facturas),
      trabajoId, clienteId: trabajo.clienteId, vehiculoId: trabajo.vehiculoId,
      fecha: new Date().toISOString().split('T')[0],
      conceptos, subtotal, total: subtotal, pagos: [],
    });
    if (!nuevaFactura) return;
    setFacturas(prev => [...prev, nuevaFactura]);
    await db.updateTrabajoFactura(trabajoId, nuevaFactura.id);
    setTrabajos(prev => prev.map(t => t.id === trabajoId ? { ...t, facturaId: nuevaFactura.id, estadoFacturacion: 'facturado' as const } : t));
  };
  const registrarPagoFactura = async (facturaId: string, pago: Omit<PagoFactura, 'id'>) => {
    const facturaActual = facturas.find(f => f.id === facturaId);
    if (!facturaActual) return;
    const nuevoPago: PagoFactura = { ...pago, id: Date.now().toString() };
    const nuevos = [...(facturaActual.pagos ?? []), nuevoPago];
    await db.updateFacturaPagos(facturaId, nuevos);
    setFacturas(prev => prev.map(f => f.id === facturaId ? { ...f, pagos: nuevos } : f));
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
    const pctCobrado = facturadoMes > 0 ? Math.min(cobradoEnMes / facturadoMes, 1) : 0;
    const gananciaCobrada = Math.round(ganancia * pctCobrado * 100) / 100;
    const porCobrarDelMes = facturas.filter(f => {
      const t = trabajos.find(t => t.id === f.trabajoId);
      return t?.fecha.startsWith(mesActual);
    }).reduce((s, f) => s + getSaldoFactura(f), 0);
    const pendientePorCobrar =
      facturas.filter(f => { const t = trabajos.find(t => t.id === f.trabajoId); return t?.fecha.startsWith(mesActual); })
        .reduce((s, f) => s + getSaldoFactura(f), 0)
      + trabajos.filter(t => t.fecha.startsWith(mesActual) && !t.facturaId).reduce((s, t) => s + getSaldo(t), 0);
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
      gananciaCobrada, pendientePorCobrar,
      totalIVA, ingresoConIVA, ingresoSinIVA,
      pagadoAProveedoresMes: ordenesMes.reduce((s, o) => s + (o.pagos ?? []).reduce((s2, p) => s2 + p.monto, 0), 0),
      porPagarTotal: ordenes.filter(o => o.estado === 'recibida').reduce((s, o) => s + (o.total - (o.pagos ?? []).reduce((s2, p) => s2 + p.monto, 0)), 0),
    }
  };

  const stockBajo              = inventario.filter(r => r.stock <= r.stockMinimo).length;
  const facturasPendientes     = facturas.filter(f => getEstadoPagoFactura(f) !== 'pagado').length;
  const ordenesPendientesPago  = ordenes.filter(o => o.estado === 'recibida' && getEstadoPagoOrden(o) !== 'pagado').length;
  const ordenesPendientesRecibir = ordenes.filter(o => o.estado === 'pendiente').length;
  const trabajosPendientesCt   = trabajos.filter(t => t.estado === 'pendiente').length;

  const tabs = [
    { key: 'clientes',    icon: '👥', label: 'Clientes',         count: clientes.length },
    { key: 'inventario',  icon: '📦', label: 'Inventario',        count: stockBajo > 0 ? `⚠ ${stockBajo}` : inventario.length > 0 ? inventario.length : null },
    { key: 'trabajos',    icon: '🔧', label: 'Trabajos',          count: trabajosPendientesCt > 0 ? `🕐 ${trabajosPendientesCt}` : trabajos.length > 0 ? trabajos.length : null },
    { key: 'proveedores', icon: '🏪', label: 'Proveedores',       count: proveedores.length > 0 ? proveedores.length : null },
    { key: 'ordenes',     icon: '📋', label: 'Órdenes de Compra', count: ordenesPendientesRecibir > 0 ? ordenesPendientesRecibir : ordenes.length > 0 ? ordenes.length : null },
    { key: 'facturas',    icon: '🧾', label: 'Facturas',          count: facturas.length > 0 ? facturas.length : null },
    { key: 'cuentas',     icon: '💰', label: 'Por Cobrar',        count: facturasPendientes > 0 ? facturasPendientes : null },
    { key: 'pagos',       icon: '🔴', label: 'Por Pagar',         count: ordenesPendientesPago > 0 ? ordenesPendientesPago : null },
    { key: 'resumen',       icon: '📊', label: 'Resumen',           count: null },
    { key: 'historial',     icon: '📋', label: 'Historial',          count: null },
    { key: 'cotizaciones',  icon: '📄', label: 'Cotizaciones',       count: null },
    { key: 'configuracion', icon: '⚙️', label: 'Configuración',     count: null },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0">🔧</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white tracking-tight">Taller Mecánico</h1>

            {/* Taller name — clickable dropdown when user has multiple talleres */}
            {talleres.length > 1 ? (
              <div className="relative">
                <button
                  onClick={() => setShowTallerMenu(v => !v)}
                  className="flex items-center gap-1.5 text-slate-300 text-sm font-medium hover:text-white transition-colors group"
                >
                  <span className="truncate max-w-[160px]">{taller?.nombre ?? 'Seleccionar taller'}</span>
                  <span className="text-slate-500 group-hover:text-slate-300 text-xs">▼</span>
                </button>

                {showTallerMenu && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setShowTallerMenu(false)} />
                    {/* Dropdown */}
                    <div className="absolute left-0 top-full mt-2 z-20 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 min-w-[220px]">
                      <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Cambiar taller</p>
                      {talleres.map(t => (
                        <button
                          key={t.id}
                          onClick={() => { selectTaller(t.id); setShowTallerMenu(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                            t.id === taller?.id ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <span className="text-lg">🔧</span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold truncate ${t.id === taller?.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                              {t.nombre}
                            </div>
                            <div className="text-xs text-slate-400">
                              {t.role === 'owner' ? '🏠 Dueño' : '🔧 Mecánico'}
                            </div>
                          </div>
                          {t.id === taller?.id && <span className="text-indigo-500 text-sm">✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-slate-400 text-sm font-medium truncate">{taller?.nombre ?? 'Sistema de Gestión'}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-slate-500 text-xs hidden sm:block truncate max-w-[8rem]">{user?.email}</span>
            <button onClick={signOut}
              className="text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors">
              Salir
            </button>
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

        {cargando ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-slate-400 text-sm">Cargando datos del taller...</div>
          </div>
        ) : (
        <Card className="p-6 sm:p-8">
          {vista === 'clientes' && (
            <VistaClientes clientes={clientes} vehiculos={vehiculos}
              onGuardarCliente={guardarCliente} onGuardarVehiculo={guardarVehiculo} />
          )}
          {vista === 'inventario' && (
            <VistaInventario inventario={inventario} clientes={clientes} vehiculos={vehiculos}
              proveedores={proveedores}
              onGuardarRefaccion={guardarRefaccion} onRecibirStock={recibirStock}
              onActualizarCompatibilidad={actualizarCompatibilidad} />
          )}
          {vista === 'trabajos' && (
            <VistaTrabajo clientes={clientes} vehiculos={vehiculos} inventario={inventario}
              trabajos={trabajos} facturas={facturas} onGuardar={guardarTrabajo}
              onEditar={editarTrabajo}
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
              onIrAProveedores={() => setVista('proveedores')}
              onCrearRefaccionNueva={crearRefaccionDesdeOrden} />
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
          {vista === 'historial' && (
            <VistaHistorial clientes={clientes} vehiculos={vehiculos} trabajos={trabajos} />
          )}
          {vista === 'cotizaciones' && (
            <VistaCotizaciones
              clientes={clientes}
              vehiculos={vehiculos}
              inventario={inventario}
              onConvertirATrabajo={convertirCotizacionATrabajo}
              onAgregarRefaccion={agregarRefaccionDesdeCotizacion}
            />
          )}
          {vista === 'configuracion' && (
            <VistaConfiguracion />
          )}
        </Card>
        )}
      </div>
    </div>
  );
}