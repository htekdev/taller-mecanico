'use client';

import { useState } from 'react';
import type { Factura, Cliente, Vehiculo, Trabajo, PagoFactura } from '@/app/types';
import { Label, Input, Select, Btn, SectionTitle } from '@/app/components/ui';
import { fmt, getEstadoPagoFactura, getMontoPagadoFactura, getSaldoFactura, BADGE_ESTADO } from '@/app/lib/utils';

export function VistaFacturas({
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
  const [filtroClienteId, setFiltroClienteId] = useState('');

  const facturasFiltradas = [...facturas]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(f => {
      if (filtro !== 'todos' && getEstadoPagoFactura(f) !== filtro) return false;
      if (filtroClienteId && f.clienteId !== filtroClienteId) return false;
      return true;
    });

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

        <div className="mb-4 max-w-xs">
          <Label>Cliente</Label>
          <Select value={filtroClienteId} onChange={e => setFiltroClienteId(e.target.value)}>
            <option value="">Todos los clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>
        </div>

        <div className="flex gap-2 mb-5 flex-wrap">
          {(['todos','pendiente','parcial','pagado'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${filtro === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
              {f === 'todos' ? 'Todas' : BADGE_ESTADO[f].label} ({counts[f]})
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {facturasFiltradas.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <p className="font-medium">No se encontraron resultados.</p>
            </div>
          )}
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
