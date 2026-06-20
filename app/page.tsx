'use client';

import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  Cliente, Vehiculo, Refaccion, Trabajo, Proveedor, OrdenCompra, Factura,
  TrabajoRefaccion, Pago, PagoCompra, PagoFactura, CompraItem,
} from '@/app/types';
import {
  generarNumeroFactura, generarNumeroOrden,
  getEstadoPagoFactura, getSaldoFactura,
  getEstadoPagoOrden,
} from '@/app/lib/utils';
import {
  addPagoFactura,
  addPagoOrden,
  addPagoTrabajo,
  cancelarOrden as cancelarOrdenDb,
  createOrden,
  generarFactura as generarFacturaDb,
  loadAllData,
  recibirOrden as recibirOrdenDb,
  saveCliente,
  saveProveedor,
  saveRefaccion,
  saveTrabajo,
  saveVehiculo,
  updateStock,
} from '@/app/lib/db';
import { supabase, supabaseEnabled } from '@/app/lib/supabase';
import { Card } from '@/app/components/ui';
import { VistaClientes } from '@/app/modules/clientes';
import { VistaInventario } from '@/app/modules/inventario';
import { VistaTrabajo } from '@/app/modules/trabajos';
import { VistaProveedores } from '@/app/modules/proveedores';
import { VistaOrdenesCompra } from '@/app/modules/ordenes';
import { VistaFacturas } from '@/app/modules/facturas';
import { VistaCuentas, VistaCuentasPorPagar } from '@/app/modules/cuentas';
import { VistaResumen } from '@/app/modules/resumen';

type AppData = {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  inventario: Refaccion[];
  trabajos: Trabajo[];
  proveedores: Proveedor[];
  ordenes: OrdenCompra[];
  facturas: Factura[];
};

function parseLocalJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) as T : fallback;
}

function applyLocalStorageMigrations() {
  const rawClientes = localStorage.getItem('clientes');
  const rawVehiculos = localStorage.getItem('vehiculos');
  const rawOrdenes = localStorage.getItem('ordenes');
  const rawCompras = localStorage.getItem('compras');

  type ClienteViejo = Cliente & { vehiculo?: string };
  let parsedClientes: ClienteViejo[] = rawClientes ? JSON.parse(rawClientes) : [];
  let parsedVehiculos: Vehiculo[] = rawVehiculos ? JSON.parse(rawVehiculos) : [];

  if (parsedClientes.some(c => 'vehiculo' in c && c.vehiculo)) {
    const migrados: Vehiculo[] = [];
    parsedClientes = parsedClientes.map(({ vehiculo, ...cliente }) => {
      if (vehiculo) {
        migrados.push({
          id: `mig_${cliente.id}`,
          clienteId: cliente.id,
          marca: vehiculo,
          modelo: '',
          anio: '',
          placa: '',
        });
      }
      return cliente;
    });
    parsedVehiculos = [...parsedVehiculos, ...migrados];
    localStorage.setItem('clientes', JSON.stringify(parsedClientes));
    localStorage.setItem('vehiculos', JSON.stringify(parsedVehiculos));
  }

  if (!rawOrdenes && rawCompras) {
    type CompraLegacy = {
      id: string;
      proveedorId: string;
      fecha: string;
      descripcion: string;
      items: CompraItem[];
      total: number;
      pagos: PagoCompra[];
    };

    const legacyCompras: CompraLegacy[] = JSON.parse(rawCompras);
    const parsedOrdenes: OrdenCompra[] = legacyCompras.map(compra => ({
      id: compra.id,
      proveedorId: compra.proveedorId,
      fecha: compra.fecha,
      descripcion: compra.descripcion,
      partes: compra.items,
      total: compra.total,
      estado: 'recibida' as const,
      fechaRecibida: compra.fecha,
      pagos: compra.pagos ?? [],
      numeroOrden: undefined,
    }));

    localStorage.setItem('ordenes', JSON.stringify(parsedOrdenes));
  }
}

function readLegacyLocalStorageData(): AppData {
  const clientes = parseLocalJson<Cliente[]>('clientes', []);
  const vehiculos = parseLocalJson<Vehiculo[]>('vehiculos', []);
  const inventario = parseLocalJson<Refaccion[]>('inventario', []);
  const proveedores = parseLocalJson<Proveedor[]>('proveedores', []);
  const facturas = parseLocalJson<Factura[]>('facturas', []);
  const rawTrabajos = localStorage.getItem('trabajos');
  const rawOrdenes = localStorage.getItem('ordenes');

  const trabajos: Trabajo[] = (rawTrabajos ? JSON.parse(rawTrabajos) : [])
    .map((trabajo: Trabajo & { manoDeObra: number }) => {
      const partes: TrabajoRefaccion[] = (trabajo.partes ?? []).map(
        (parte: TrabajoRefaccion & { precioUnitario?: number }) => ({
          ...parte,
          precioCompra: parte.precioCompra ?? parte.precioUnitario ?? 0,
          precioVenta: parte.precioVenta ?? parte.precioUnitario ?? 0,
          costoTotal: parte.costoTotal ?? parte.subtotal ?? 0,
        }),
      );

      return {
        ...trabajo,
        partes,
        manoDeObraItems: trabajo.manoDeObraItems ?? (
          trabajo.manoDeObra > 0
            ? [{ id: `mig_${trabajo.id}`, concepto: 'Mano de obra', precio: trabajo.manoDeObra }]
            : []
        ),
        costoRefacciones: trabajo.costoRefacciones ?? partes.reduce((sum, parte) => sum + parte.costoTotal, 0),
        pagos: trabajo.pagos ?? [],
        estadoFacturacion: trabajo.estadoFacturacion ?? 'sin_facturar',
        requiereFactura: trabajo.requiereFactura ?? false,
        iva: trabajo.iva ?? 0,
      };
    });

  const ordenes = rawOrdenes ? JSON.parse(rawOrdenes) as OrdenCompra[] : [];

  return {
    clientes,
    vehiculos,
    inventario,
    trabajos,
    proveedores,
    ordenes,
    facturas,
  };
}

function isDataEmpty(data: AppData) {
  return Object.values(data).every(collection => collection.length === 0);
}

export default function TallerMecanico() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [inventario, setInventario] = useState<Refaccion[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [vista, setVista] = useState<'clientes' | 'inventario' | 'trabajos' | 'proveedores' | 'ordenes' | 'facturas' | 'cuentas' | 'pagos' | 'resumen'>('clientes');
  const [mesActual, setMesActual] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  const hydrateData = (data: AppData) => {
    setClientes(data.clientes);
    setVehiculos(data.vehiculos);
    setInventario(data.inventario);
    setTrabajos(data.trabajos);
    setProveedores(data.proveedores);
    setOrdenes(data.ordenes);
    setFacturas(data.facturas);
  };

  useEffect(() => {
    let channel: RealtimeChannel | undefined;

    async function init() {
      applyLocalStorageMigrations();
      const localData = readLegacyLocalStorageData();

      try {
        const data = await loadAllData();
        const resolvedData = supabaseEnabled && isDataEmpty(data) && !isDataEmpty(localData)
          ? localData
          : data;

        hydrateData(resolvedData);
      } catch {
        hydrateData(localData);
      } finally {
        setLoading(false);
      }

      if (supabaseEnabled && supabase) {
        channel = supabase.channel('taller-changes')
          .on('postgres_changes', { event: '*', schema: 'public' }, async () => {
            const fresh = await loadAllData();
            hydrateData(fresh);
          })
          .subscribe();
      }
    }

    init();
    return () => {
      if (channel) {
        void supabase?.removeChannel(channel);
      }
    };
  }, []);

  const guardarCliente = async (data: Omit<Cliente, 'id'>) => {
    const nuevo = await saveCliente(data, clientes);
    setClientes(prev => [...prev, nuevo]);
  };

  const guardarVehiculo = async (data: Omit<Vehiculo, 'id'>) => {
    const nuevo = await saveVehiculo(data, vehiculos);
    setVehiculos(prev => [...prev, nuevo]);
  };

  const guardarRefaccion = async (data: Omit<Refaccion, 'id'>) => {
    const nuevo = await saveRefaccion(data, inventario);
    setInventario(prev => [...prev, nuevo]);
  };

  const recibirStock = async (refaccionId: string, cantidad: number) => {
    const refaccion = inventario.find(item => item.id === refaccionId);
    if (!refaccion) return;

    const nuevos = await updateStock(refaccionId, refaccion.stock + cantidad, inventario);
    setInventario(nuevos);
  };

  const guardarTrabajo = async (data: Omit<Trabajo, 'id' | 'total' | 'iva'>) => {
    const result = await saveTrabajo(data, trabajos, inventario);
    setTrabajos(prev => [...prev, result.trabajo]);
    setInventario(result.inventario);
  };

  const registrarPago = async (trabajoId: string, pago: Omit<Pago, 'id'>) => {
    const nuevos = await addPagoTrabajo(trabajoId, pago, trabajos);
    setTrabajos(nuevos);
  };

  const guardarProveedor = async (data: Omit<Proveedor, 'id'>) => {
    const nuevo = await saveProveedor(data, proveedores);
    setProveedores(prev => [...prev, nuevo]);
  };

  const crearOrden = async (data: Omit<OrdenCompra, 'id' | 'estado' | 'fechaRecibida' | 'pagos'>) => {
    const nueva = await createOrden(data, ordenes, generarNumeroOrden);
    setOrdenes(prev => [...prev, nueva]);
  };

  const recibirOrden = async (ordenId: string) => {
    const result = await recibirOrdenDb(ordenId, ordenes, inventario);
    setOrdenes(result.ordenes);
    setInventario(result.inventario);
  };

  const cancelarOrden = async (ordenId: string) => {
    const nuevas = await cancelarOrdenDb(ordenId, ordenes);
    setOrdenes(nuevas);
  };

  const registrarPagoOrden = async (ordenId: string, pago: Omit<PagoCompra, 'id'>) => {
    const nuevas = await addPagoOrden(ordenId, pago, ordenes);
    setOrdenes(nuevas);
  };

  const generarFactura = async (trabajoId: string) => {
    const result = await generarFacturaDb(trabajoId, trabajos, facturas, generarNumeroFactura);
    if (!result) return;

    setTrabajos(result.trabajos);
    setFacturas(result.facturas);
  };

  const registrarPagoFactura = async (facturaId: string, pago: Omit<PagoFactura, 'id'>) => {
    const nuevas = await addPagoFactura(facturaId, pago, facturas);
    setFacturas(nuevas);
  };

  const calcularResumen = () => {
    const mes = trabajos.filter(t => t.fecha.startsWith(mesActual));
    const facturadoMes = mes.reduce((s, t) => s + t.total, 0);
    const totalVentaRef = mes.reduce((s, t) => s + t.refacciones, 0);
    const totalCostoRef = mes.reduce((s, t) => s + (t.costoRefacciones ?? t.refacciones), 0);
    const totalManoObra = mes.reduce((s, t) => s + t.manoDeObra, 0);
    const margenRef = totalVentaRef - totalCostoRef;
    const ganancia = totalManoObra + margenRef;
    const cobradoEnMes = facturas.reduce((s, f) =>
      s + (f.pagos ?? []).filter(p => p.fecha.startsWith(mesActual)).reduce((s2, p) => s2 + p.monto, 0), 0);
    const porCobrarDelMes = facturas.filter(f => {
      const trabajo = trabajos.find(t => t.id === f.trabajoId);
      return trabajo?.fecha.startsWith(mesActual);
    }).reduce((s, f) => s + getSaldoFactura(f), 0);
    const ordenesMes = ordenes.filter(o => o.fecha.startsWith(mesActual) && o.estado !== 'cancelada');
    const totalOrdenes = ordenesMes.reduce((s, o) => s + o.total, 0);
    const porPagarOrdenes = ordenesMes.filter(o => o.estado === 'recibida').reduce((s, o) => s + (o.total - (o.pagos ?? []).reduce((s2, p) => s2 + p.monto, 0)), 0);
    const mesConIVA = mes.filter(t => t.requiereFactura);
    const mesSinIVA = mes.filter(t => !t.requiereFactura);
    const totalIVA = mesConIVA.reduce((s, t) => s + (t.iva ?? 0), 0);
    const ingresoConIVA = mesConIVA.reduce((s, t) => s + t.total, 0);
    const ingresoSinIVA = mesSinIVA.reduce((s, t) => s + t.total, 0);

    return {
      facturadoMes,
      totalVentaRef,
      totalCostoRef,
      margenRef,
      totalManoObra,
      ganancia,
      cantidad: mes.length,
      cobradoEnMes,
      porCobrarDelMes,
      totalOrdenes,
      porPagarOrdenes,
      totalIVA,
      ingresoConIVA,
      ingresoSinIVA,
    };
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🔧</div>
        <p className="text-slate-500 font-medium">Cargando datos...</p>
      </div>
    </div>
  );

  const stockBajo = inventario.filter(r => r.stock <= r.stockMinimo).length;
  const facturasPendientes = facturas.filter(f => getEstadoPagoFactura(f) !== 'pagado').length;
  const ordenesPendientesPago = ordenes.filter(o => o.estado === 'recibida' && getEstadoPagoOrden(o) !== 'pagado').length;
  const ordenesPendientesRecibir = ordenes.filter(o => o.estado === 'pendiente').length;

  const tabs = [
    { key: 'clientes', icon: '👥', label: 'Clientes', count: clientes.length },
    { key: 'inventario', icon: '📦', label: 'Inventario', count: stockBajo > 0 ? `⚠ ${stockBajo}` : inventario.length > 0 ? inventario.length : null },
    { key: 'trabajos', icon: '🔧', label: 'Trabajos', count: trabajos.length },
    { key: 'proveedores', icon: '🏪', label: 'Proveedores', count: proveedores.length > 0 ? proveedores.length : null },
    { key: 'ordenes', icon: '📋', label: 'Órdenes de Compra', count: ordenesPendientesRecibir > 0 ? ordenesPendientesRecibir : ordenes.length > 0 ? ordenes.length : null },
    { key: 'facturas', icon: '🧾', label: 'Facturas', count: facturas.length > 0 ? facturas.length : null },
    { key: 'cuentas', icon: '💰', label: 'Por Cobrar', count: facturasPendientes > 0 ? facturasPendientes : null },
    { key: 'pagos', icon: '🔴', label: 'Por Pagar', count: ordenesPendientesPago > 0 ? ordenesPendientesPago : null },
    { key: 'resumen', icon: '📊', label: 'Resumen', count: null },
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
            <button
              key={key}
              onClick={() => setVista(key)}
              className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-150 whitespace-nowrap ${
                vista === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
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
            <VistaClientes
              clientes={clientes}
              vehiculos={vehiculos}
              onGuardarCliente={guardarCliente}
              onGuardarVehiculo={guardarVehiculo}
            />
          )}
          {vista === 'inventario' && (
            <VistaInventario
              inventario={inventario}
              clientes={clientes}
              vehiculos={vehiculos}
              proveedores={proveedores}
              onGuardarRefaccion={guardarRefaccion}
              onRecibirStock={recibirStock}
            />
          )}
          {vista === 'trabajos' && (
            <VistaTrabajo
              clientes={clientes}
              vehiculos={vehiculos}
              inventario={inventario}
              trabajos={trabajos}
              facturas={facturas}
              onGuardar={guardarTrabajo}
              onIrAInventario={() => setVista('inventario')}
              onGenerarFactura={generarFactura}
              onIrAFacturas={() => setVista('facturas')}
            />
          )}
          {vista === 'proveedores' && (
            <VistaProveedores
              proveedores={proveedores}
              inventario={inventario}
              onGuardarProveedor={guardarProveedor}
            />
          )}
          {vista === 'ordenes' && (
            <VistaOrdenesCompra
              ordenes={ordenes}
              proveedores={proveedores}
              inventario={inventario}
              onCrearOrden={crearOrden}
              onRecibirOrden={recibirOrden}
              onCancelarOrden={cancelarOrden}
              onIrAProveedores={() => setVista('proveedores')}
            />
          )}
          {vista === 'facturas' && (
            <VistaFacturas
              facturas={facturas}
              clientes={clientes}
              vehiculos={vehiculos}
              trabajos={trabajos}
              onRegistrarPago={registrarPagoFactura}
            />
          )}
          {vista === 'cuentas' && (
            <VistaCuentas
              facturas={facturas}
              trabajos={trabajos}
              clientes={clientes}
              vehiculos={vehiculos}
              onRegistrarPagoFactura={registrarPagoFactura}
              onRegistrarPagoTrabajo={registrarPago}
            />
          )}
          {vista === 'pagos' && (
            <VistaCuentasPorPagar
              ordenes={ordenes}
              proveedores={proveedores}
              onRegistrarPago={registrarPagoOrden}
              onIrAOrdenes={() => setVista('ordenes')}
            />
          )}
          {vista === 'resumen' && (
            <VistaResumen
              mesActual={mesActual}
              setMesActual={setMesActual}
              resumen={calcularResumen()}
              trabajos={trabajos.filter(t => t.fecha.startsWith(mesActual))}
              clientes={clientes}
              vehiculos={vehiculos}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
