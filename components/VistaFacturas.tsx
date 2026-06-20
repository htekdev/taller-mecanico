'use client';

import { useState } from 'react';
import type { Cliente, Factura, PagoFactura, Vehiculo } from '../lib/types';
import { BADGE_ESTADO } from '../lib/constants';
import { fmt, getEstadoPagoFactura, getMontoPagadoFactura, getSaldoFactura } from '../lib/utils';
import { Btn, Input, Label, SectionTitle, Select } from '../components/ui';

export default function VistaFacturas({
  facturas,
  clientes,
  vehiculos,
  onRegistrarPago,
}: {
  facturas: Factura[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  onRegistrarPago: (facturaId: string, pago: Omit<PagoFactura, 'id'>) => void;
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [filtro, setFiltro] = useState<'todos' | 'pendiente' | 'parcial' | 'pagado'>('todos');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [pagoForm, setPagoForm] = useState({ fecha: hoy, monto: 0, metodoPago: 'efectivo' });

  const facturasFiltradas = [...facturas]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(f => filtro === 'todos' || getEstadoPagoFactura(f) === filtro);

  const counts = {
    todos: facturas.length,
    pendiente: facturas.filter(f => getEstadoPagoFactura(f) === 'pendiente').length,
    parcial: facturas.filter(f => getEstadoPagoFactura(f) === 'parcial').length,
    pagado: facturas.filter(f => getEstadoPagoFactura(f) === 'pagado').length,
  };
  const totalPendiente = facturas
    .filter(f => getEstadoPagoFactura(f) !== 'pagado')
    .reduce((s, f) => s + getSaldoFactura(f), 0);

  const toggleExpand = (facturaId: string) => {
    setExpandido(current => (current === facturaId ? null : facturaId));
    setPagoForm({ fecha: hoy, monto: 0, metodoPago: 'efectivo' });
  };

  const handleRegistrarPago = (facturaId: string, saldo: number) => {
    if (pagoForm.monto <= 0) return;
    onRegistrarPago(facturaId, {
      fecha: pagoForm.fecha,
      monto: Math.min(pagoForm.monto, saldo),
      metodoPago: pagoForm.metodoPago,
    });
    setPagoForm({ fecha: hoy, monto: 0, metodoPago: 'efectivo' });
    setExpandido(null);
  };

  if (facturas.length === 0) {
    return (
      <div>
        <SectionTitle title="Facturas" subtitle="Controla cobros y saldos de facturas fiscales." />
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">🧾</div>
          <p className="font-medium text-slate-500">No hay facturas. Las facturas se generan desde trabajos que requieren factura fiscal.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle title="Facturas" subtitle="Controla pagos y saldos de facturas fiscales generadas desde trabajos." />

      {totalPendiente > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 mb-6 flex flex-wrap gap-6 items-center">
          <div>
            <div className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Total pendiente</div>
            <div className="text-2xl font-extrabold text-rose-700">${fmt(totalPendiente)}</div>
          </div>
          <div className="text-sm text-rose-600">
            <span className="font-semibold">{counts.pendiente}</span> factura{counts.pendiente !== 1 ? 's' : ''} pendiente{counts.pendiente !== 1 ? 's' : ''}
            {counts.parcial > 0 && <span> · <span className="font-semibold">{counts.parcial}</span> parcial{counts.parcial !== 1 ? 'es' : ''}</span>}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {(['todos', 'pendiente', 'parcial', 'pagado'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filtro === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {f === 'todos' ? 'Todas' : BADGE_ESTADO[f].label} ({counts[f]})
          </button>
        ))}
      </div>

      {facturasFiltradas.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <div className="text-5xl mb-3">🧾</div>
          <p className="font-medium text-slate-500">No hay facturas en este filtro.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {facturasFiltradas.map(factura => {
            const cliente = clientes.find(c => c.id === factura.clienteId);
            const vehiculo = vehiculos.find(v => v.id === factura.vehiculoId);
            const estado = getEstadoPagoFactura(factura);
            const montoPagado = getMontoPagadoFactura(factura);
            const saldo = getSaldoFactura(factura);
            const badge = BADGE_ESTADO[estado];
            const isExp = expandido === factura.id;
            const ivaMonto = factura.iva ? Math.max(0, factura.total - factura.subtotal) : 0;

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
                      <span>· {factura.conceptos.length} concepto{factura.conceptos.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Total</div>
                    <div className="font-semibold text-slate-800">${fmt(factura.total)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Pagado</div>
                    <div className="font-semibold text-emerald-600">${fmt(montoPagado)}</div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase tracking-wide">Saldo</div>
                      <div className={`font-bold ${saldo > 0 ? 'text-rose-600' : 'text-slate-400'}`}>${fmt(saldo)}</div>
                    </div>
                    <Btn size="sm" variant={isExp ? 'ghost' : estado !== 'pagado' ? 'success' : 'ghost'} onClick={() => toggleExpand(factura.id)}>
                      {isExp ? '✕' : estado !== 'pagado' ? '+ Pago' : 'Ver'}
                    </Btn>
                  </div>
                </div>

                {isExp && (
                  <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-200 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Conceptos</p>
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              {['Tipo', 'Descripción', 'Cant.', 'Precio', 'Subtotal'].map((h, i) => (
                                <th key={h} className={`px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide ${i >= 2 ? 'text-right' : 'text-left'}`}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {factura.conceptos.map((concepto, index) => (
                              <tr key={`${factura.id}-${index}`} className="bg-white">
                                <td className="px-3 py-2">
                                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${concepto.tipo === 'parte' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {concepto.tipo === 'parte' ? '🔩 Parte' : '🔧 M.O.'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-800">{concepto.descripcion}</td>
                                <td className="px-3 py-2 text-right text-slate-700">{concepto.cantidad}</td>
                                <td className="px-3 py-2 text-right text-slate-600">${fmt(concepto.precioUnitario)}</td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(concepto.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={4} className="px-3 py-2 text-sm font-bold text-slate-700 text-right">Subtotal:</td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(factura.subtotal)}</td>
                            </tr>
                            {factura.iva ? (
                              <tr>
                                <td colSpan={4} className="px-3 py-2 text-sm font-bold text-amber-700 text-right">IVA ({factura.iva}%):</td>
                                <td className="px-3 py-2 text-right font-semibold text-amber-700">${fmt(ivaMonto)}</td>
                              </tr>
                            ) : null}
                            <tr>
                              <td colSpan={4} className="px-3 py-2 text-sm font-bold text-slate-700 text-right">Total factura:</td>
                              <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(factura.total)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {factura.pagos?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Historial de pagos</p>
                        <div className="space-y-1">
                          {factura.pagos.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                              <div className="flex gap-3">
                                <span className="text-slate-500">{new Date(p.fecha).toLocaleDateString('es-MX')}</span>
                                <span className="text-slate-500">{p.metodoPago}</span>
                              </div>
                              <span className="font-semibold text-emerald-600">+ ${fmt(p.monto)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {estado !== 'pagado' ? (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar pago</p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <Label>Fecha</Label>
                            <Input type="date" value={pagoForm.fecha} onChange={e => setPagoForm(f => ({ ...f, fecha: e.target.value }))} />
                          </div>
                          <div>
                            <Label>Monto ($) — saldo: ${fmt(saldo)}</Label>
                            <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={pagoForm.monto || ''} onChange={e => setPagoForm(f => ({ ...f, monto: Number(e.target.value) }))} />
                          </div>
                          <div>
                            <Label>Método de pago</Label>
                            <Select value={pagoForm.metodoPago} onChange={e => setPagoForm(f => ({ ...f, metodoPago: e.target.value }))}>
                              {['efectivo', 'transferencia', 'tarjeta', 'cheque'].map(metodo => (
                                <option key={metodo} value={metodo}>{metodo}</option>
                              ))}
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <Btn variant="success" fullWidth disabled={pagoForm.monto <= 0} onClick={() => handleRegistrarPago(factura.id, saldo)}>
                              ✓ Registrar
                            </Btn>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 font-semibold text-center">✅ Esta factura está completamente pagada.</p>
                    )}
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
