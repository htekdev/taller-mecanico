'use client';

import { useState } from 'react';
import type { Factura, Cliente, Vehiculo, Trabajo, PagoFactura } from '@/app/types';
import { Label, Input, Select, Btn, SectionTitle } from '@/app/components/ui';
import { fmt, getEstadoPagoFactura, getMontoPagadoFactura, getSaldoFactura, BADGE_ESTADO, formatearFecha, getHoy } from '@/app/lib/utils';

export function VistaFacturas({
  facturas,
  clientes,
  vehiculos,
  trabajos,
  onRegistrarPago,
  onEditarFechaFactura,
  onEditarNumeroFactura,
  onEditarSubtotalFactura,
  onCancelarFactura,
  onReactivarFactura,
}: {
  facturas: Factura[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  trabajos: Trabajo[];
  onRegistrarPago: (facturaId: string, pago: Omit<PagoFactura, 'id'>) => void;
  onEditarFechaFactura: (facturaId: string, fecha: string) => void;
  onEditarNumeroFactura: (facturaId: string, numero: string) => void;
  onEditarSubtotalFactura: (facturaId: string, subtotal: number, incluirIva: boolean, nuevoNumero: string) => void;
  onCancelarFactura: (facturaId: string) => void;
  onReactivarFactura: (facturaId: string) => void;
}) {
  const hoy = getHoy();
  const [expandido, setExpandido] = useState<string | null>(null);
  const [pagoForm, setPagoForm] = useState({ monto: 0, fecha: hoy, metodoPago: 'Efectivo' });
  const [filtro, setFiltro] = useState<'todos'|'pendiente'|'parcial'|'pagado'>('todos');
  const [filtroClienteId, setFiltroClienteId] = useState('');
  const [busquedaNumero, setBusquedaNumero] = useState('');
  const [editandoFechaId, setEditandoFechaId] = useState<string | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [editandoNumeroId, setEditandoNumeroId] = useState<string | null>(null);
  const [nuevoNumero, setNuevoNumero] = useState('');
  const [editandoSubtotalId, setEditandoSubtotalId] = useState<string | null>(null);
  const [nuevoSubtotal, setNuevoSubtotal] = useState<string>('');
  const [subtotalIncluyeIva, setSubtotalIncluyeIva] = useState(false);
  const [nuevoNumeroAjuste, setNuevoNumeroAjuste] = useState('');
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [confirmCancelarId, setConfirmCancelarId] = useState<string | null>(null);

  const facturasCanceladas = facturas.filter(f => f.notas === 'CANCELADA');
  const facturasActivas = facturas.filter(f => f.notas !== 'CANCELADA');

  const facturasFiltradas = [...facturasActivas]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(f => {
      if (filtro !== 'todos' && getEstadoPagoFactura(f) !== filtro) return false;
      if (filtroClienteId && f.clienteId !== filtroClienteId) return false;
      if (busquedaNumero.trim() && !f.numeroFactura.toLowerCase().includes(busquedaNumero.trim().toLowerCase())) return false;
      return true;
    });

  const counts = { todos: facturasActivas.length, pendiente: facturasActivas.filter(f => getEstadoPagoFactura(f) === 'pendiente').length, parcial: facturasActivas.filter(f => getEstadoPagoFactura(f) === 'parcial').length, pagado: facturasActivas.filter(f => getEstadoPagoFactura(f) === 'pagado').length };
  const totalPendiente = facturasActivas.filter(f => getEstadoPagoFactura(f) !== 'pagado').reduce((s, f) => s + getSaldoFactura(f), 0);
  const trabajosPendientesFacturar = trabajos.filter(t => t.tipoDocumento !== 'nota' && t.estadoFacturacion !== 'facturado').length;

  const handlePago = (facturaId: string, saldo: number) => {
    if (pagoForm.monto <= 0) return;
    onRegistrarPago(facturaId, { monto: Math.min(pagoForm.monto, saldo), fecha: pagoForm.fecha, metodoPago: pagoForm.metodoPago });
    setPagoForm({ monto: 0, fecha: hoy, metodoPago: 'Efectivo' });
    setExpandido(null);
  };

  return (
    <div>
      <SectionTitle title="Facturas" subtitle="Facturas generadas desde trabajos. Aquí se registran los pagos de clientes." />

      {/* Banner: trabajos pendientes de facturar */}
      {trabajosPendientesFacturar > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 mb-4 flex items-center gap-3 text-sm">
          <span className="text-2xl">🧾</span>
          <span className="text-indigo-800 font-semibold">
            {trabajosPendientesFacturar} trabajo{trabajosPendientesFacturar !== 1 ? 's' : ''} pendiente{trabajosPendientesFacturar !== 1 ? 's' : ''} de facturar — ve a Trabajos para emitirlas
          </span>
        </div>
      )}

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

        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[180px] max-w-xs">
            <Label>Número de factura</Label>
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar por número..."
                value={busquedaNumero}
                onChange={e => setBusquedaNumero(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {busquedaNumero && (
                <button
                  type="button"
                  onClick={() => setBusquedaNumero('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >✕</button>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-[180px] max-w-xs">
            <Label>Cliente</Label>
            <Select value={filtroClienteId} onChange={e => setFiltroClienteId(e.target.value)}>
              <option value="">Todos los clientes</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          </div>
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
                      <span>{formatearFecha(factura.fecha)}</span>
                      {vehiculo && <span>· {[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')}</span>}
                      {vehiculo?.placa && <span className="font-mono bg-slate-100 px-1 rounded">{vehiculo.placa}</span>}
                      {(() => {
                        const trab = trabajos.find(t => t.id === factura.trabajoId);
                        return trab?.kilometraje != null ? <span>· 🛣 {trab.kilometraje.toLocaleString('es-MX')} km</span> : null;
                      })()}
                      <span>· {(factura.conceptos ?? []).length} conceptos</span>
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
                            {(factura.conceptos ?? []).map((c, ci) => (
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
                           {(factura.iva ?? 0) > 0 && <>
                             <tr><td colSpan={4} className="px-3 py-2 text-sm text-slate-600 text-right">Subtotal:</td>
                               <td className="px-3 py-2 text-right text-slate-700">${fmt(factura.subtotal)}</td></tr>
                             <tr><td colSpan={4} className="px-3 py-2 text-sm text-slate-600 text-right">IVA (16%):</td>
                               <td className="px-3 py-2 text-right text-slate-700">${fmt(factura.iva ?? 0)}</td></tr>
                           </>}
                            <tr><td colSpan={4} className="px-3 py-2 text-sm font-bold text-slate-700 text-right">Total factura:</td>
                              <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(factura.total)}</td></tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Editar subtotal + IVA + nuevo número */}
                    {(() => {
                      const subtotalNum = parseFloat(nuevoSubtotal) || 0;
                      const ivaCalc = subtotalIncluyeIva ? Math.round(subtotalNum * 0.16 * 100) / 100 : 0;
                      const totalCalc = subtotalNum + ivaCalc;
                      const canSave = subtotalNum > 0 && nuevoNumeroAjuste.trim() !== '';
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subtotal / IVA / Total</p>
                            {editandoSubtotalId !== factura.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditandoSubtotalId(factura.id);
                                  setNuevoSubtotal(String(factura.subtotal));
                                  setSubtotalIncluyeIva((factura.iva ?? 0) > 0);
                                  // Suggest a new number based on existing
                                  setNuevoNumeroAjuste(factura.numeroFactura + '-ADJ');
                                }}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                ✏️ Editar subtotal
                              </button>
                            )}
                          </div>
                          {editandoSubtotalId === factura.id ? (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <Label>Nuevo subtotal ($)</Label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={nuevoSubtotal}
                                    onChange={e => setNuevoSubtotal(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                                <div className="flex flex-col justify-end">
                                  <label className="flex items-center gap-2 cursor-pointer select-none mb-1">
                                    <input
                                      type="checkbox"
                                      checked={subtotalIncluyeIva}
                                      onChange={e => setSubtotalIncluyeIva(e.target.checked)}
                                      className="w-4 h-4 accent-indigo-600"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Agregar IVA 16%</span>
                                  </label>
                                  {subtotalIncluyeIva && subtotalNum > 0 && (
                                    <div className="text-xs text-indigo-700 font-medium">
                                      IVA: ${fmt(ivaCalc)} → Total: ${fmt(totalCalc)}
                                    </div>
                                  )}
                                  {!subtotalIncluyeIva && subtotalNum > 0 && (
                                    <div className="text-xs text-slate-500">Total sin IVA: ${fmt(totalCalc)}</div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <Label>Nuevo número de factura *</Label>
                                <input
                                  type="text"
                                  value={nuevoNumeroAjuste}
                                  onChange={e => setNuevoNumeroAjuste(e.target.value)}
                                  placeholder="Ej. FAC-2026-005"
                                  className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Requerido — el número cambia porque los totales se modificaron</p>
                              </div>
                              <div className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm text-slate-700 flex flex-col gap-1">
                                <div>Subtotal: <strong>${fmt(subtotalNum)}</strong></div>
                                {ivaCalc > 0 && <div>IVA (16%): <strong>${fmt(ivaCalc)}</strong></div>}
                                <div className="font-bold text-indigo-700">Total nuevo: ${fmt(totalCalc)}</div>
                                <div className="text-xs text-amber-700 mt-1">⚡ Este cambio también actualizará el total del trabajo vinculado.</div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={!canSave}
                                  onClick={() => {
                                    onEditarSubtotalFactura(factura.id, subtotalNum, subtotalIncluyeIva, nuevoNumeroAjuste.trim());
                                    setEditandoSubtotalId(null);
                                  }}
                                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                                >
                                  ✓ Guardar y sincronizar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditandoSubtotalId(null)}
                                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-slate-700 flex gap-4 flex-wrap">
                              <span>Subtotal: <strong>${fmt(factura.subtotal)}</strong></span>
                              {(factura.iva ?? 0) > 0 && <span>IVA: <strong>${fmt(factura.iva ?? 0)}</strong></span>}
                              <span className="font-bold">Total: ${fmt(factura.total)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Editar número de factura */}
                    {(() => {
                      const isDuplicate = nuevoNumero.trim() !== '' &&
                        nuevoNumero.trim().toLowerCase() !== factura.numeroFactura.toLowerCase() &&
                        facturas.some(f => f.id !== factura.id && f.numeroFactura.toLowerCase() === nuevoNumero.trim().toLowerCase());
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Número de Factura</p>
                            {editandoNumeroId !== factura.id && (
                              <button
                                type="button"
                                onClick={() => { setEditandoNumeroId(factura.id); setNuevoNumero(factura.numeroFactura); }}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                ✏️ Editar número
                              </button>
                            )}
                          </div>
                          {editandoNumeroId === factura.id ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="text"
                                  value={nuevoNumero}
                                  onChange={e => setNuevoNumero(e.target.value)}
                                  placeholder="Ej. FAC-2026-001"
                                  className={`border rounded-lg px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 ${isDuplicate ? 'border-amber-400 focus:ring-amber-400 bg-amber-50' : 'border-indigo-300 focus:ring-indigo-500'}`}
                                />
                                <button
                                  type="button"
                                  disabled={!nuevoNumero.trim() || isDuplicate}
                                  onClick={() => { onEditarNumeroFactura(factura.id, nuevoNumero.trim()); setEditandoNumeroId(null); }}
                                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                                >
                                  ✓ Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditandoNumeroId(null)}
                                  className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                              {isDuplicate && (
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-xs font-semibold text-amber-800">
                                  ⚠️ Ya existe una factura con ese número — elige uno diferente.
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm font-mono text-slate-700 font-medium">{factura.numeroFactura || '—'}</p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Editar fecha de factura */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fecha de Factura</p>
                        {editandoFechaId !== factura.id && (
                          <button
                            type="button"
                            onClick={() => { setEditandoFechaId(factura.id); setNuevaFecha(factura.fecha); }}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            ✏️ Cambiar fecha
                          </button>
                        )}
                      </div>
                      {editandoFechaId === factura.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={nuevaFecha}
                            onChange={e => setNuevaFecha(e.target.value)}
                            className="border border-indigo-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            disabled={!nuevaFecha}
                            onClick={() => { onEditarFechaFactura(factura.id, nuevaFecha); setEditandoFechaId(null); }}
                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                          >
                            ✓ Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoFechaId(null)}
                            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-700 font-medium">
                          {new Date(factura.fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>

                    {/* Pagos historial */}
                    {factura.pagos?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Historial de pagos</p>
                        <div className="space-y-1">
                          {factura.pagos.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                              <div className="flex gap-3"><span className="text-slate-500">{formatearFecha(p.fecha)}</span><span className="text-slate-500">{p.metodoPago}</span></div>
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

                    {/* Cancelar factura */}
                    {confirmCancelarId === factura.id ? (
                      <div className="bg-rose-50 border border-rose-300 rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-semibold text-rose-800 flex-1">⚠️ ¿Cancelar esta factura? Se ocultará de todas las vistas. Puedes reactivarla después.</span>
                        <button type="button" onClick={() => { onCancelarFactura(factura.id); setConfirmCancelarId(null); setExpandido(null); }} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors">Sí, cancelar</button>
                        <button type="button" onClick={() => setConfirmCancelarId(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors">No</button>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button type="button" onClick={() => setConfirmCancelarId(factura.id)} className="text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors">🚫 Cancelar factura</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>}

      {/* ── Facturas canceladas ── */}
      {facturasCanceladas.length > 0 && (
        <div className="mt-4">
          <button type="button" onClick={() => setVerCanceladas(v => !v)} className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors">
            {verCanceladas ? '▲ Ocultar' : '▼ Ver'} canceladas ({facturasCanceladas.length})
          </button>
          {verCanceladas && (
            <div className="mt-2 space-y-1">
              {facturasCanceladas.map(f => {
                const cl = clientes.find(c => c.id === f.clienteId);
                return (
                  <div key={f.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 opacity-60">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-400 line-through">{f.numeroFactura}</span>
                      <span className="text-sm text-slate-500 line-through">{cl?.nombre ?? '—'}</span>
                      <span className="text-xs bg-rose-100 text-rose-600 font-semibold px-2 py-0.5 rounded-full">Cancelada</span>
                    </div>
                    <button type="button" onClick={() => onReactivarFactura(f.id)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-4 flex-shrink-0">↩ Reactivar</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
