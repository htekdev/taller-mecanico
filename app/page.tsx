'use client';

import VistaClientes from '../components/VistaClientes';
import VistaCuentas from '../components/VistaCuentas';
import VistaCuentasPorPagar from '../components/VistaCuentasPorPagar';
import VistaFacturas from '../components/VistaFacturas';
import VistaInventario from '../components/VistaInventario';
import VistaProveedores from '../components/VistaProveedores';
import VistaResumen from '../components/VistaResumen';
import VistaTrabajo from '../components/VistaTrabajo';
import { Card } from '../components/ui';
import { useAppData } from '../lib/useAppData';

export default function TallerMecanico() {
  const {
    clientes,
    vehiculos,
    inventario,
    trabajos,
    proveedores,
    ordenes,
    facturas,
    vista,
    mesActual,
    stockBajo,
    pendientesPorCobrar,
    pendientesPorPagar,
    setVista,
    setMesActual,
    guardarCliente,
    guardarVehiculo,
    guardarRefaccion,
    recibirStock,
    guardarTrabajo,
    registrarPago,
    guardarProveedor,
    guardarOrden,
    recibirOrden,
    registrarPagoOrden,
    guardarFactura,
    registrarPagoFactura,
    resumen,
  } = useAppData();

  const generarFacturaDesdeTrabajo = (trabajoId: string) => {
    const trabajo = trabajos.find(t => t.id === trabajoId);
    if (!trabajo || !trabajo.requiereFactura || trabajo.facturaId) return;

    const conceptos = [
      ...trabajo.manoDeObraItems.map(item => ({
        tipo: 'mano_de_obra' as const,
        descripcion: item.concepto,
        cantidad: 1,
        precioUnitario: item.precio,
        subtotal: item.precio,
      })),
      ...trabajo.partes.map(parte => ({
        tipo: 'parte' as const,
        descripcion: parte.nombre,
        cantidad: parte.cantidad,
        precioUnitario: parte.precioVenta,
        subtotal: parte.subtotal,
      })),
    ];

    const subtotal = conceptos.reduce((s, c) => s + c.subtotal, 0);
    guardarFactura({
      trabajoId,
      clienteId: trabajo.clienteId,
      vehiculoId: trabajo.vehiculoId,
      fecha: new Date().toISOString().split('T')[0],
      conceptos,
      subtotal,
      iva: trabajo.iva > 0 ? 16 : undefined,
      total: trabajo.total,
      pagos: [],
      notas: trabajo.descripcion,
    });
  };

  const tabs = [
    { key: 'clientes', icon: '👥', label: 'Clientes', count: clientes.length },
    { key: 'inventario', icon: '📦', label: 'Inventario', count: stockBajo > 0 ? `⚠ ${stockBajo}` : inventario.length > 0 ? inventario.length : null },
    { key: 'trabajos', icon: '🔧', label: 'Trabajos', count: trabajos.length },
    { key: 'cuentas', icon: '💰', label: 'Por Cobrar', count: pendientesPorCobrar > 0 ? pendientesPorCobrar : null },
    { key: 'proveedores', icon: '🏪', label: 'Proveedores', count: proveedores.length > 0 ? proveedores.length : null },
    { key: 'ordenes', icon: '📋', label: 'Órdenes', count: pendientesPorPagar > 0 ? pendientesPorPagar : ordenes.length > 0 ? ordenes.length : null },
    { key: 'facturas', icon: '🧾', label: 'Facturas', count: facturas.length > 0 ? facturas.length : null },
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
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-150 whitespace-nowrap ${vista === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {count !== null && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${vista === key ? 'bg-indigo-400 text-white' : (typeof count === 'string' && count.startsWith('⚠')) ? 'bg-rose-100 text-rose-600' : (key === 'cuentas' && pendientesPorCobrar > 0) || (key === 'ordenes' && pendientesPorPagar > 0) ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <Card className="p-6 sm:p-8">
          {vista === 'clientes' && <VistaClientes clientes={clientes} vehiculos={vehiculos} onGuardarCliente={guardarCliente} onGuardarVehiculo={guardarVehiculo} />}

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
              onGuardar={guardarTrabajo}
              onIrAInventario={() => setVista('inventario')}
              onGenerarFactura={generarFacturaDesdeTrabajo}
              onIrAFacturas={() => setVista('facturas')}
            />
          )}

          {vista === 'cuentas' && <VistaCuentas trabajos={trabajos} clientes={clientes} vehiculos={vehiculos} onRegistrarPago={registrarPago} />}

          {vista === 'proveedores' && <VistaProveedores proveedores={proveedores} inventario={inventario} onGuardarProveedor={guardarProveedor} />}

          {vista === 'ordenes' && (
            <VistaCuentasPorPagar
              ordenes={ordenes}
              proveedores={proveedores}
              inventario={inventario}
              onGuardarOrden={guardarOrden}
              onRegistrarPagoOrden={registrarPagoOrden}
              onRecibirOrden={recibirOrden}
              onIrAProveedores={() => setVista('proveedores')}
            />
          )}

          {vista === 'facturas' && <VistaFacturas facturas={facturas} clientes={clientes} vehiculos={vehiculos} onRegistrarPago={registrarPagoFactura} />}

          {vista === 'resumen' && (
            <VistaResumen
              mesActual={mesActual}
              setMesActual={setMesActual}
              resumen={resumen}
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
