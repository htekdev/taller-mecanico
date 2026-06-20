'use client';

import { useState } from 'react';
import type { Trabajo, Cliente, Vehiculo, Pago, FiltroCuenta, EstadoPago } from '../lib/types';
import { BADGE_ESTADO } from '../lib/constants';
import { fmt, getMontoPagado, getEstadoPago, getSaldo } from '../lib/utils';
import { Label, Input, Btn, SectionTitle } from '../components/ui';

export default function VistaCuentas({
  trabajos,
  clientes,
  vehiculos,
  onRegistrarPago,
}: {
  trabajos: Trabajo[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  onRegistrarPago: (trabajoId: string, pago: Omit<Pago, 'id'>) => void;
}) {
  const [filtro, setFiltro] = useState<FiltroCuenta>('todos');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [pagoForm, setPagoForm] = useState({ monto: 0, fecha: new Date().toISOString().split('T')[0], nota: '' });

  const getCliente  = (id: string) => clientes.find(c => c.id === id);
  const getVehiculo = (id: string) => vehiculos.find(v => v.id === id);

  const trabajosFiltrados = [...trabajos]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(t => filtro === 'todos' || getEstadoPago(t) === filtro);

  const handleRegistrar = (trabajoId: string, saldo: number) => {
    if (pagoForm.monto <= 0) return;
    onRegistrarPago(trabajoId, { monto: Math.min(pagoForm.monto, saldo), fecha: pagoForm.fecha, nota: pagoForm.nota || undefined });
    setPagoForm({ monto: 0, fecha: new Date().toISOString().split('T')[0], nota: '' });
    setExpandido(null);
  };

  const toggleExpand = (id: string) => {
    if (expandido === id) { setExpandido(null); return; }
    setExpandido(id);
    setPagoForm({ monto: 0, fecha: new Date().toISOString().split('T')[0], nota: '' });
  };

  const counts = {
    todos:     trabajos.length,
    pendiente: trabajos.filter(t => getEstadoPago(t) === 'pendiente').length,
    parcial:   trabajos.filter(t => getEstadoPago(t) === 'parcial').length,
    pagado:    trabajos.filter(t => getEstadoPago(t) === 'pagado').length,
  };
  const totalPendiente = trabajos.filter(t => getEstadoPago(t) !== 'pagado').reduce((s, t) => s + getSaldo(t), 0);

  return (
    <div>
      <SectionTitle
        title="Cuentas por Cobrar"
        subtitle="Registra los pagos recibidos por cada trabajo. Los créditos pendientes aparecen en rojo."
      />

      {totalPendiente > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 mb-6 flex flex-wrap gap-6 items-center">
          <div>
            <div className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Total por Cobrar</div>
            <div className="text-2xl font-extrabold text-rose-700">${fmt(totalPendiente)}</div>
          </div>
          <div className="text-sm text-rose-600">
            <span className="font-semibold">{counts.pendiente}</span> trabajo{counts.pendiente !== 1 ? 's' : ''} pendientes de pago
            {counts.parcial > 0 && <span> · <span className="font-semibold">{counts.parcial}</span> parciales</span>}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {(['todos', 'pendiente', 'parcial', 'pagado'] as FiltroCuenta[]).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filtro === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}>
            {f === 'todos' ? 'Todos' : BADGE_ESTADO[f].label} ({counts[f]})
          </button>
        ))}
      </div>

      {trabajosFiltrados.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <div className="text-5xl mb-3">💰</div>
          <p className="font-medium text-slate-500">
            {filtro === 'todos' ? 'Sin trabajos registrados' : `Sin trabajos con estado "${BADGE_ESTADO[filtro as EstadoPago].label}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {trabajosFiltrados.map(trabajo => {
            const cliente  = getCliente(trabajo.clienteId);
            const vehiculo = getVehiculo(trabajo.vehiculoId);
            const estado   = getEstadoPago(trabajo);
            const montoPag = getMontoPagado(trabajo);
            const saldo    = getSaldo(trabajo);
            const badge    = BADGE_ESTADO[estado];
            const isExp    = expandido === trabajo.id;

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
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Total</div>
                    <div className="font-semibold text-slate-800">${fmt(trabajo.total)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Pagado</div>
                    <div className="font-semibold text-emerald-600">${fmt(montoPag)}</div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase tracking-wide">Saldo</div>
                      <div className={`font-bold ${saldo > 0 ? 'text-rose-600' : 'text-slate-400'}`}>${fmt(saldo)}</div>
                    </div>
                    {estado !== 'pagado' ? (
                      <Btn size="sm" variant={isExp ? 'ghost' : 'success'} onClick={() => toggleExpand(trabajo.id)}>
                        {isExp ? '✕' : '+ Pago'}
                      </Btn>
                    ) : (
                      <Btn size="sm" variant="ghost" onClick={() => toggleExpand(trabajo.id)}>
                        {isExp ? '✕' : 'Ver'}
                      </Btn>
                    )}
                  </div>
                </div>

                {isExp && (
                  <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-200 space-y-4">
                    {trabajo.pagos?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Historial de pagos</p>
                        <div className="space-y-1">
                          {trabajo.pagos.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                              <div className="flex gap-3">
                                <span className="text-slate-500">{new Date(p.fecha).toLocaleDateString('es-MX')}</span>
                                {p.nota && <span className="text-slate-500 italic">{p.nota}</span>}
                              </div>
                              <span className="font-semibold text-emerald-600">+ ${fmt(p.monto)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {estado !== 'pagado' && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar Pago</p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div><Label>Fecha del pago</Label>
                            <Input type="date" value={pagoForm.fecha} onChange={e => setPagoForm(f => ({ ...f, fecha: e.target.value }))} /></div>
                          <div><Label>Monto ($) {saldo < trabajo.total && `— saldo: $${fmt(saldo)}`}</Label>
                            <Input type="number" placeholder="0.00" min="0.01" step="0.01"
                              value={pagoForm.monto || ''} onChange={e => setPagoForm(f => ({ ...f, monto: Number(e.target.value) }))} /></div>
                          <div><Label>Nota (opcional)</Label>
                            <Input type="text" placeholder="Efectivo, transferencia..."
                              value={pagoForm.nota} onChange={e => setPagoForm(f => ({ ...f, nota: e.target.value }))} /></div>
                          <div className="flex items-end">
                            <Btn variant="success" fullWidth disabled={pagoForm.monto <= 0} onClick={() => handleRegistrar(trabajo.id, saldo)}>✓ Registrar</Btn>
                          </div>
                        </div>
                        {pagoForm.monto > 0 && (
                          <p className="text-xs text-slate-400 mt-2">
                            Después de este pago, saldo restante: <strong className="text-slate-600">${fmt(Math.max(0, saldo - pagoForm.monto))}</strong>
                          </p>
                        )}
                      </div>
                    )}
                    {estado === 'pagado' && trabajo.pagos?.length > 0 && (
                      <p className="text-xs text-emerald-600 font-semibold text-center">✅ Este trabajo está completamente pagado.</p>
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
