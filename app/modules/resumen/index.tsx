'use client';

import type { Trabajo, Cliente, Vehiculo } from '@/app/types';
import { Label, Input, SectionTitle, EmptyRow } from '@/app/components/ui';
import { fmt } from '@/app/lib/utils';

export function VistaResumen({
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
    pagadoAProveedoresMes: number; porPagarTotal: number;
    totalIVA: number; ingresoConIVA: number; ingresoSinIVA: number;
    gananciaCobrada: number; pendientePorCobrar: number;
  };
  trabajos: Trabajo[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
}) {
  const getCliente = (id: string) => clientes.find(c => c.id === id);
  const flujoCaja = resumen.cobradoEnMes - resumen.pagadoAProveedoresMes;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <SectionTitle title="Resumen Mensual" />
        <div className="flex-shrink-0">
          <Label>Periodo</Label>
          <Input type="month" value={mesActual} onChange={e => setMesActual(e.target.value)} className="w-auto" />
        </div>
      </div>

      {/* ΓöÇΓöÇ 4 tarjetas principales ΓöÇΓöÇ */}
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
          <div className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-2">Ganancia</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.ganancia)}</div>
                    <div className="text-emerald-200 text-xs mt-1">Potencial (si todo se cobra)</div>
          <div className="mt-2 pt-2 border-t border-emerald-400">
            <div className="text-emerald-100 text-sm font-bold">${fmt(resumen.gananciaCobrada)}</div>
            <div className="text-emerald-200 text-xs">Real (sobre lo cobrado)</div>
          </div>
        </div>
      </div>

      {/* -- Cobrado vs Facturado -- */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Cobrado vs Facturado</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl mb-1">📥</div>
            <div className="text-slate-400 text-xs mb-1">Cobrado en el mes</div>
            <div className="font-bold text-emerald-600 text-lg">${fmt(resumen.cobradoEnMes)}</div>
          </div>
          <div className="text-center border-x border-slate-200">
            <div className="text-2xl mb-1">📋</div>
            <div className="text-slate-400 text-xs mb-1">Facturado en el mes</div>
            <div className="font-bold text-slate-900 text-lg">${fmt(resumen.facturadoMes)}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">⏳</div>
            <div className="text-slate-400 text-xs mb-1">Pendiente por cobrar</div>
            <div className="font-bold text-rose-600 text-lg">${fmt(resumen.pendientePorCobrar)}</div>
          </div>
        </div>
      </div>

      {/* ΓöÇΓöÇ Cuentas por Cobrar del Mes ΓöÇΓöÇ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border-2 border-emerald-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">≡ƒÆ╡</div>
          <div>
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Pagos Recibidos en el Mes</div>
            <div className="text-2xl font-extrabold text-slate-900">${fmt(resumen.cobradoEnMes)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Efectivo/transferencias recibidas</div>
          </div>
        </div>
        <div className="bg-white border-2 border-rose-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">ΓÅ│</div>
          <div>
            <div className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1">Por Cobrar del Mes</div>
            <div className="text-2xl font-extrabold text-slate-900">${fmt(resumen.porCobrarDelMes)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Pendiente de trabajos de este mes</div>
          </div>
        </div>
      </div>

      {/* ΓöÇΓöÇ Pagos a Proveedores ΓöÇΓöÇ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border-2 border-violet-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">≡ƒÅ¬</div>
          <div>
            <div className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-1">Pagado a Proveedores (mes)</div>
            <div className="text-2xl font-extrabold text-slate-900">${fmt(resumen.pagadoAProveedoresMes)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Pagos realizados a proveedores este mes</div>
          </div>
        </div>
        <div className="bg-white border-2 border-orange-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">≡ƒö┤</div>
          <div>
            <div className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">Saldo Pendiente Proveedores</div>
            <div className="text-2xl font-extrabold text-slate-900">${fmt(resumen.porPagarTotal)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Total que debemos a proveedores</div>
          </div>
        </div>
      </div>

      {/* ΓöÇΓöÇ Flujo de Caja Real del Mes ΓöÇΓöÇ */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Flujo de Caja Real del Mes</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-slate-400 text-xs mb-1">Cobrado a clientes</div>
            <div className="font-bold text-emerald-600 text-lg">+${fmt(resumen.cobradoEnMes)}</div>
          </div>
          <div className="text-center border-x border-slate-200">
            <div className="text-slate-400 text-xs mb-1">Pagado a proveedores</div>
            <div className="font-bold text-rose-600 text-lg">-${fmt(resumen.pagadoAProveedoresMes)}</div>
          </div>
          <div className="text-center">
            <div className="text-slate-400 text-xs mb-1">Flujo neto</div>
            <div className={`font-bold text-lg ${flujoCaja >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {flujoCaja >= 0 ? '+' : ''}{fmt(flujoCaja)}
            </div>
          </div>
        </div>
      </div>

      {/* ΓöÇΓöÇ Desglose de utilidades en refacciones ΓöÇΓöÇ */}
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

      {/* ΓöÇΓöÇ IVA Breakdown ΓöÇΓöÇ */}
      {(resumen.ingresoConIVA > 0 || resumen.ingresoSinIVA > 0) && (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Desglose IVA</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-1">Con factura fiscal</div>
              <div className="font-bold text-amber-700 text-lg">${fmt(resumen.ingresoConIVA)}</div>
              <div className="text-amber-500 text-xs mt-0.5">incluye ${fmt(resumen.totalIVA)} IVA</div>
            </div>
            <div className="text-center border-x border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Sin factura (cash)</div>
              <div className="font-bold text-slate-900 text-lg">${fmt(resumen.ingresoSinIVA)}</div>
              <div className="text-slate-400 text-xs mt-0.5">sin IVA</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-1">IVA total cobrado</div>
              <div className="font-bold text-emerald-600 text-lg">${fmt(resumen.totalIVA)}</div>
              <div className="text-slate-400 text-xs mt-0.5">a entregar al SAT</div>
            </div>
          </div>
        </div>
      )}

      {/* ΓöÇΓöÇ Tabla detalle ΓöÇΓöÇ */}
      <div>
        <h3 className="text-base font-bold text-slate-700 mb-3">
          Detalle de Trabajos del Mes
          {trabajos.length > 0 && <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{trabajos.length}</span>}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['Fecha','Cliente','Trabajo','Cobrado','IVA','Ganancia'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trabajos.map((trabajo, i) => {
                const cliente    = getCliente(trabajo.clienteId);
                const costoPartes = trabajo.costoRefacciones ?? trabajo.refacciones;
                const ganancia   = trabajo.manoDeObra + (trabajo.refacciones - costoPartes);
                const iva        = trabajo.iva ?? 0;
                return (
                  <tr key={trabajo.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">{new Date(trabajo.fecha).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{cliente?.nombre ?? 'ΓÇö'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {trabajo.descripcion}
                      {trabajo.requiereFactura && (
                        <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">≡ƒº╛ fiscal</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">${fmt(trabajo.total)}</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-medium">{iva > 0 ? `$${fmt(iva)}` : 'ΓÇö'}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">${fmt(ganancia)}</td>
                  </tr>
                );
              })}
              {trabajos.length === 0 && <EmptyRow cols={6} message="No hay trabajos registrados en este mes." />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}