'use client';

import { useState } from 'react';
import type { Compra, Proveedor, Refaccion, CompraItem, PagoCompra } from '../lib/types';
import { BADGE_ESTADO } from '../lib/constants';
import { fmt, getMontoPagadoCompra, getEstadoPagoCompra, getSaldoCompra } from '../lib/utils';
import { Label, Input, Select, Btn, SectionTitle } from '../components/ui';

export default function VistaCuentasPorPagar({
  compras,
  proveedores,
  inventario,
  onGuardarCompra,
  onRegistrarPago,
  onIrAProveedores,
}: {
  compras: Compra[];
  proveedores: Proveedor[];
  inventario: Refaccion[];
  onGuardarCompra: (c: Omit<Compra, 'id'>) => void;
  onRegistrarPago: (compraId: string, pago: Omit<PagoCompra, 'id'>) => void;
  onIrAProveedores: () => void;
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [formProveedorId, setFormProveedorId] = useState('');
  const [formFecha, setFormFecha] = useState(hoy);
  const [formDesc, setFormDesc] = useState('');
  const [itemsCompra, setItemsCompra] = useState<CompraItem[]>([]);
  const [pickerRefId, setPickerRefId] = useState('');
  const [pickerCantidad, setPickerCantidad] = useState(1);
  const [pickerPrecio, setPickerPrecio] = useState(0);
  const [filtro, setFiltro] = useState<'todos' | 'pendiente' | 'parcial' | 'pagado'>('todos');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [pagoForm, setPagoForm] = useState({ monto: 0, fecha: hoy, nota: '' });

  const totalCompra = itemsCompra.reduce((s, i) => s + i.subtotal, 0);
  const pickerRef   = inventario.find(r => r.id === pickerRefId);

  const agregarItem = () => {
    if (!pickerRefId || pickerCantidad <= 0 || pickerPrecio <= 0) return;
    const ref = inventario.find(r => r.id === pickerRefId);
    if (!ref) return;
    setItemsCompra(prev => {
      const ex = prev.find(i => i.refaccionId === ref.id);
      if (ex) {
        const nc = ex.cantidad + pickerCantidad;
        return prev.map(i => i.refaccionId === ref.id ? { ...i, cantidad: nc, subtotal: nc * i.precioCompra } : i);
      }
      return [...prev, { refaccionId: ref.id, nombre: ref.nombre, cantidad: pickerCantidad, precioCompra: pickerPrecio, subtotal: pickerCantidad * pickerPrecio }];
    });
    setPickerRefId(''); setPickerCantidad(1); setPickerPrecio(0);
  };

  const handlePickerRefChange = (id: string) => {
    setPickerRefId(id);
    const ref = inventario.find(r => r.id === id);
    setPickerPrecio(ref?.precioCompra ?? 0);
  };

  const handleSubmitCompra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProveedorId || itemsCompra.length === 0) return;
    onGuardarCompra({ proveedorId: formProveedorId, fecha: formFecha, descripcion: formDesc, items: itemsCompra, total: totalCompra, pagos: [] });
    setFormProveedorId(''); setFormFecha(hoy); setFormDesc(''); setItemsCompra([]);
  };

  const handleRegistrarPago = (compraId: string, saldo: number) => {
    if (pagoForm.monto <= 0) return;
    onRegistrarPago(compraId, { monto: Math.min(pagoForm.monto, saldo), fecha: pagoForm.fecha, nota: pagoForm.nota || undefined });
    setPagoForm({ monto: 0, fecha: hoy, nota: '' });
    setExpandido(null);
  };

  const totalPendiente = compras.filter(c => getEstadoPagoCompra(c) !== 'pagado').reduce((s, c) => s + getSaldoCompra(c), 0);
  const counts = {
    todos:     compras.length,
    pendiente: compras.filter(c => getEstadoPagoCompra(c) === 'pendiente').length,
    parcial:   compras.filter(c => getEstadoPagoCompra(c) === 'parcial').length,
    pagado:    compras.filter(c => getEstadoPagoCompra(c) === 'pagado').length,
  };
  const comprasFiltradas = [...compras]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(c => filtro === 'todos' || getEstadoPagoCompra(c) === filtro);

  return (
    <div>
      <SectionTitle title="Cuentas por Pagar" subtitle="Registra tus compras a proveedores y lleva el control de lo que les debes." />

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Registrar Compra a Proveedor</h3>
        {proveedores.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            <p>Necesitas registrar proveedores primero.</p>
            <button type="button" onClick={onIrAProveedores} className="mt-2 text-indigo-600 font-semibold hover:underline">Ir a Proveedores →</button>
          </div>
        ) : (
          <form onSubmit={handleSubmitCompra} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Proveedor *</Label>
                <Select value={formProveedorId} onChange={e => setFormProveedorId(e.target.value)} required>
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </Select>
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} required />
              </div>
              <div>
                <Label>Descripción (opcional)</Label>
                <Input type="text" placeholder="Ej. Compra semanal filtros" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-3 bg-slate-700">
                <span className="text-xs font-bold text-white uppercase tracking-widest">Piezas Recibidas</span>
                <span className="ml-3 text-slate-400 text-xs">Al guardar, el stock se actualiza automáticamente</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <Label>Refacción</Label>
                    <Select value={pickerRefId} onChange={e => handlePickerRefChange(e.target.value)}>
                      <option value="">Seleccionar pieza...</option>
                      {inventario.map(r => <option key={r.id} value={r.id}>{r.nombre}{r.codigo ? ` (${r.codigo})` : ''}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>Cantidad</Label>
                    <Input type="number" min="1" step="1" placeholder="1" value={pickerCantidad || ''} onChange={e => setPickerCantidad(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Precio compra ($)</Label>
                    <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={pickerPrecio || ''} onChange={e => setPickerPrecio(Number(e.target.value))} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  {pickerRef && pickerPrecio > 0 && (
                    <span className="text-xs text-slate-500">Subtotal: <strong className="text-slate-700">${fmt(pickerPrecio * pickerCantidad)}</strong></span>
                  )}
                  <Btn variant="primary" disabled={!pickerRefId || pickerCantidad <= 0 || pickerPrecio <= 0} onClick={agregarItem} size="sm">+ Agregar</Btn>
                </div>

                {itemsCompra.length > 0 && (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          {['Pieza','Cant.','Precio','Subtotal',''].map((h, i) => (
                            <th key={i} className={`px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide ${i < 1 ? 'text-left' : i < 4 ? 'text-right' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itemsCompra.map(it => (
                          <tr key={it.refaccionId} className="bg-white">
                            <td className="px-3 py-2 font-medium text-slate-800">{it.nombre}</td>
                            <td className="px-3 py-2 text-right text-slate-700">{it.cantidad}</td>
                            <td className="px-3 py-2 text-right text-slate-600">${fmt(it.precioCompra)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(it.subtotal)}</td>
                            <td className="px-3 py-2 text-center">
                              <Btn size="sm" variant="danger" onClick={() => setItemsCompra(prev => prev.filter(i => i.refaccionId !== it.refaccionId))}>✕</Btn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-sm font-bold text-slate-700 text-right">Total compra:</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(totalCompra)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                {itemsCompra.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">Agrega las piezas que recibiste en esta compra.</p>
                )}
              </div>
            </div>

            <Btn type="submit" variant="primary" fullWidth disabled={!formProveedorId || itemsCompra.length === 0}>
              ✓ Registrar Compra y Actualizar Inventario
            </Btn>
          </form>
        )}
      </div>

      {totalPendiente > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 mb-5 flex flex-wrap gap-6 items-center">
          <div>
            <div className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Total por Pagar</div>
            <div className="text-2xl font-extrabold text-rose-700">${fmt(totalPendiente)}</div>
          </div>
          <div className="text-sm text-rose-600">
            <span className="font-semibold">{counts.pendiente}</span> compra{counts.pendiente !== 1 ? 's' : ''} pendientes
            {counts.parcial > 0 && <span> · <span className="font-semibold">{counts.parcial}</span> parciales</span>}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {(['todos', 'pendiente', 'parcial', 'pagado'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filtro === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}>
            {f === 'todos' ? 'Todas' : BADGE_ESTADO[f].label} ({counts[f]})
          </button>
        ))}
      </div>

      {comprasFiltradas.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <div className="text-5xl mb-3">🧾</div>
          <p className="font-medium text-slate-500">Sin compras registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comprasFiltradas.map(compra => {
            const prov    = proveedores.find(p => p.id === compra.proveedorId);
            const estado  = getEstadoPagoCompra(compra);
            const montoPag = getMontoPagadoCompra(compra);
            const saldo   = getSaldoCompra(compra);
            const badge   = BADGE_ESTADO[estado];
            const isExp   = expandido === compra.id;

            return (
              <div key={compra.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className={`grid grid-cols-1 sm:grid-cols-6 gap-2 items-center px-4 py-3 ${isExp ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'} transition-colors`}>
                  <div className="sm:col-span-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">🏪 {prov?.nombre ?? 'Proveedor'}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                      <span>{new Date(compra.fecha).toLocaleDateString('es-MX')}</span>
                      {compra.descripcion && <span>· {compra.descripcion}</span>}
                      <span>· {compra.items.length} pieza{compra.items.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Total</div>
                    <div className="font-semibold text-slate-800">${fmt(compra.total)}</div></div>
                  <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Pagado</div>
                    <div className="font-semibold text-emerald-600">${fmt(montoPag)}</div></div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Saldo</div>
                      <div className={`font-bold ${saldo > 0 ? 'text-rose-600' : 'text-slate-400'}`}>${fmt(saldo)}</div></div>
                    {estado !== 'pagado' ? (
                      <Btn size="sm" variant={isExp ? 'ghost' : 'success'}
                        onClick={() => { setExpandido(isExp ? null : compra.id); setPagoForm({ monto: 0, fecha: hoy, nota: '' }); }}>
                        {isExp ? '✕' : '+ Pago'}
                      </Btn>
                    ) : (
                      <Btn size="sm" variant="ghost" onClick={() => setExpandido(isExp ? null : compra.id)}>
                        {isExp ? '✕' : 'Ver'}
                      </Btn>
                    )}
                  </div>
                </div>

                {isExp && (
                  <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-200 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Piezas recibidas</p>
                      <div className="space-y-1">
                        {compra.items.map(it => (
                          <div key={it.refaccionId} className="flex justify-between bg-white border border-slate-200 rounded px-3 py-1.5 text-sm">
                            <span className="text-slate-700">{it.nombre} × {it.cantidad}</span>
                            <span className="font-semibold text-slate-800">${fmt(it.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {compra.pagos?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Historial de pagos</p>
                        <div className="space-y-1">
                          {compra.pagos.map(p => (
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
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar Pago al Proveedor</p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div><Label>Fecha</Label>
                            <Input type="date" value={pagoForm.fecha} onChange={e => setPagoForm(f => ({ ...f, fecha: e.target.value }))} /></div>
                          <div><Label>Monto ($) — saldo: ${fmt(saldo)}</Label>
                            <Input type="number" placeholder="0.00" min="0.01" step="0.01"
                              value={pagoForm.monto || ''} onChange={e => setPagoForm(f => ({ ...f, monto: Number(e.target.value) }))} /></div>
                          <div><Label>Nota (opcional)</Label>
                            <Input type="text" placeholder="Efectivo, transferencia..."
                              value={pagoForm.nota} onChange={e => setPagoForm(f => ({ ...f, nota: e.target.value }))} /></div>
                          <div className="flex items-end">
                            <Btn variant="success" fullWidth disabled={pagoForm.monto <= 0}
                              onClick={() => handleRegistrarPago(compra.id, saldo)}>✓ Registrar</Btn>
                          </div>
                        </div>
                      </div>
                    )}
                    {estado === 'pagado' && (
                      <p className="text-xs text-emerald-600 font-semibold text-center">✅ Esta compra está completamente pagada.</p>
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
