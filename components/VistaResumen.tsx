'use client';

import type { Trabajo, Cliente, Vehiculo } from '../lib/types';
import type { ResumenMensual } from '../lib/utils';
import { fmt } from '../lib/utils';
import { Label, Input, SectionTitle, EmptyRow } from '../components/ui';

export default function VistaResumen({
  mesActual,
  setMesActual,
  resumen,
  trabajos,
  clientes,
  vehiculos,
}: {
  mesActual: string;
  setMesActual: (m: string) => void;
  resumen: ResumenMensual;
  trabajos: Trabajo[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
}) {
  const getCliente  = (id: string) => clientes.find(c => c.id === id);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md">
          <div className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-2">Facturado del Mes</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.facturado)}</div>
          <div className="text-indigo-200 text-xs mt-2">{resumen.cantidad} trabajo{resumen.cantidad !== 1 ? 's' : ''} realizados</div>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 text-white shadow-md">
          <div className="text-rose-200 text-xs font-bold uppercase tracking-widest mb-2">Costo Refacciones</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.totalCostoRefacciones)}</div>
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
            {resumen.facturado > 0 ? `${((resumen.ganancia / resumen.facturado) * 100).toFixed(1)}% margen` : 'Sin movimientos'}
          </div>
        </div>
      </div>

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

      {resumen.totalVentaRefacciones > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-8">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Desglose de Refacciones</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-1">Venta al cliente</div>
              <div className="font-bold text-slate-900 text-lg">${fmt(resumen.totalVentaRefacciones)}</div>
            </div>
            <div className="text-center border-x border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Costo proveedor</div>
              <div className="font-bold text-rose-600 text-lg">${fmt(resumen.totalCostoRefacciones)}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-1">Margen en partes</div>
              <div className={`font-bold text-lg ${resumen.margenRefacciones >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ${fmt(resumen.margenRefacciones)}
              </div>
            </div>
          </div>
        </div>
      )}

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
                const cliente    = getCliente(trabajo.clienteId);
                const vehiculo   = getVehiculo(trabajo.vehiculoId);
                const costoPartes = trabajo.costoRefacciones ?? trabajo.refacciones;
                const ganancia   = trabajo.manoDeObra + (trabajo.refacciones - costoPartes);
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
