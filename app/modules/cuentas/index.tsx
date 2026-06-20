'use client';

import { useState } from 'react';
import type { Factura, Trabajo, Cliente, Vehiculo, OrdenCompra, Proveedor, PagoFactura, Pago, PagoCompra } from '@/app/types';
import { Label, Input, Select, Btn, SectionTitle } from '@/app/components/ui';
import {
  fmt,
  getEstadoPagoFactura, getMontoPagadoFactura, getSaldoFactura,
  getEstadoPago, getMontoPagado, getSaldo,
  getEstadoPagoOrden, getMontoPagadoOrden, getSaldoOrden,
  BADGE_ESTADO,
  type FiltroCuenta,
} from '@/app/lib/utils';

// ─── VistaCuentas (Por Cobrar) ────────────────────────────────────────────────

export function VistaCuentas({
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

export function VistaCuentasPorPagar({
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
