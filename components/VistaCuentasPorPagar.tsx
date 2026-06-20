'use client';

import { useState } from 'react';
import type { CompraItem, OrdenCompra, PagoCompra, Proveedor, Refaccion } from '../lib/types';
import { BADGE_ESTADO } from '../lib/constants';
import { fmt, getEstadoPagoOrden, getMontoPagadoOrden, getSaldoOrden } from '../lib/utils';
import { Btn, Input, Label, SectionTitle, Select } from '../components/ui';

export default function VistaCuentasPorPagar({
  ordenes,
  proveedores,
  inventario,
  onGuardarOrden,
  onRegistrarPagoOrden,
  onRecibirOrden,
  onIrAProveedores,
}: {
  ordenes: OrdenCompra[];
  proveedores: Proveedor[];
  inventario: Refaccion[];
  onGuardarOrden: (orden: Omit<OrdenCompra, 'id'>) => void;
  onRegistrarPagoOrden: (ordenId: string, pago: Omit<PagoCompra, 'id'>) => void;
  onRecibirOrden: (ordenId: string) => void;
  onIrAProveedores: () => void;
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [formProveedorId, setFormProveedorId] = useState('');
  const [formFecha, setFormFecha] = useState(hoy);
  const [formDesc, setFormDesc] = useState('');
  const [formNumOrden, setFormNumOrden] = useState('');
  const [itemsOrden, setItemsOrden] = useState<CompraItem[]>([]);
  const [pickerRefId, setPickerRefId] = useState('');
  const [pickerCantidad, setPickerCantidad] = useState(1);
  const [pickerPrecio, setPickerPrecio] = useState(0);
  const [filtro, setFiltro] = useState<'todos' | 'pendiente' | 'parcial' | 'pagado'>('todos');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [pagoForm, setPagoForm] = useState({ monto: 0, fecha: hoy, nota: '' });

  const BADGE_ORDEN: Record<OrdenCompra['estado'], { label: string; cls: string }> = {
    pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
    recibida: { label: 'Recibida', cls: 'bg-emerald-100 text-emerald-700' },
    cancelada: { label: 'Cancelada', cls: 'bg-slate-100 text-slate-500' },
  };

  const totalOrden = itemsOrden.reduce((s, i) => s + i.subtotal, 0);
  const pickerRef = inventario.find(r => r.id === pickerRefId);

  const agregarItem = () => {
    if (!pickerRefId || pickerCantidad <= 0 || pickerPrecio <= 0) return;
    const ref = inventario.find(r => r.id === pickerRefId);
    if (!ref) return;

    setItemsOrden(prev => {
      const existente = prev.find(i => i.refaccionId === ref.id);
      if (existente) {
        const nuevaCantidad = existente.cantidad + pickerCantidad;
        return prev.map(i => i.refaccionId === ref.id ? { ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.precioCompra } : i);
      }
      return [...prev, { refaccionId: ref.id, nombre: ref.nombre, cantidad: pickerCantidad, precioCompra: pickerPrecio, subtotal: pickerCantidad * pickerPrecio }];
    });

    setPickerRefId('');
    setPickerCantidad(1);
    setPickerPrecio(0);
  };

  const handlePickerRefChange = (id: string) => {
    setPickerRefId(id);
    const ref = inventario.find(r => r.id === id);
    setPickerPrecio(ref?.precioCompra ?? 0);
  };

  const handleSubmitOrden = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProveedorId || itemsOrden.length === 0) return;

    onGuardarOrden({
      proveedorId: formProveedorId,
      fecha: formFecha,
      numeroOrden: formNumOrden || undefined,
      descripcion: formDesc,
      partes: itemsOrden,
      total: totalOrden,
      estado: 'pendiente',
      pagos: [],
    });

    setFormProveedorId('');
    setFormFecha(hoy);
    setFormDesc('');
    setFormNumOrden('');
    setItemsOrden([]);
    setPickerRefId('');
    setPickerCantidad(1);
    setPickerPrecio(0);
  };

  const handleRegistrarPago = (ordenId: string, saldo: number) => {
    if (pagoForm.monto <= 0) return;
    onRegistrarPagoOrden(ordenId, {
      monto: Math.min(pagoForm.monto, saldo),
      fecha: pagoForm.fecha,
      nota: pagoForm.nota || undefined,
    });
    setPagoForm({ monto: 0, fecha: hoy, nota: '' });
    setExpandido(null);
  };

  const totalPendiente = ordenes.filter(o => getEstadoPagoOrden(o) !== 'pagado').reduce((s, o) => s + getSaldoOrden(o), 0);
  const counts = {
    todos: ordenes.length,
    pendiente: ordenes.filter(o => getEstadoPagoOrden(o) === 'pendiente').length,
    parcial: ordenes.filter(o => getEstadoPagoOrden(o) === 'parcial').length,
    pagado: ordenes.filter(o => getEstadoPagoOrden(o) === 'pagado').length,
  };
  const ordenesFiltradas = [...ordenes]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(o => filtro === 'todos' || getEstadoPagoOrden(o) === filtro);
  const pendientesRecibir = ordenes.filter(o => o.estado === 'pendiente').length;

  return (
    <div>
      <SectionTitle title="Órdenes de Compra" subtitle="Crea órdenes, márcalas como recibidas y registra los pagos al proveedor." />

      {pendientesRecibir > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-5 flex items-center gap-3 text-sm">
          <span className="text-amber-600 font-semibold">⏳ {pendientesRecibir} orden{pendientesRecibir !== 1 ? 'es' : ''} pendiente{pendientesRecibir !== 1 ? 's' : ''} de recibir</span>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Nueva Orden de Compra</h3>
        {proveedores.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            <p>Necesitas registrar proveedores primero.</p>
            <button type="button" onClick={onIrAProveedores} className="mt-2 text-indigo-600 font-semibold hover:underline">Ir a Proveedores →</button>
          </div>
        ) : (
          <form onSubmit={handleSubmitOrden} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
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
                <Label>Número de orden</Label>
                <Input type="text" placeholder="Se genera automáticamente" value={formNumOrden} onChange={e => setFormNumOrden(e.target.value)} className="font-mono" />
              </div>
            </div>

            <div>
              <Label>Descripción (opcional)</Label>
              <Input type="text" placeholder="Ej. Reposición mensual filtros" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
            </div>

            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-3 bg-slate-700">
                <span className="text-xs font-bold text-white uppercase tracking-widest">Piezas a Ordenar</span>
                <span className="ml-3 text-slate-400 text-xs">El stock sube al marcar la orden como recibida</span>
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
                  {pickerRef && pickerPrecio > 0 && <span className="text-xs text-slate-500">Subtotal: <strong className="text-slate-700">${fmt(pickerPrecio * pickerCantidad)}</strong></span>}
                  <Btn variant="primary" disabled={!pickerRefId || pickerCantidad <= 0 || pickerPrecio <= 0} onClick={agregarItem} size="sm">+ Agregar</Btn>
                </div>

                {itemsOrden.length > 0 ? (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          {['Pieza', 'Cant.', 'Precio', 'Subtotal', ''].map((h, i) => (
                            <th key={h} className={`px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide ${i === 0 ? 'text-left' : i < 4 ? 'text-right' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itemsOrden.map(it => (
                          <tr key={it.refaccionId} className="bg-white">
                            <td className="px-3 py-2 font-medium text-slate-800">{it.nombre}</td>
                            <td className="px-3 py-2 text-right text-slate-700">{it.cantidad}</td>
                            <td className="px-3 py-2 text-right text-slate-600">${fmt(it.precioCompra)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(it.subtotal)}</td>
                            <td className="px-3 py-2 text-center"><Btn size="sm" variant="danger" onClick={() => setItemsOrden(prev => prev.filter(i => i.refaccionId !== it.refaccionId))}>✕</Btn></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-sm font-bold text-slate-700 text-right">Total orden:</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(totalOrden)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">Agrega las piezas que quieres ordenar.</p>
                )}
              </div>
            </div>

            <Btn type="submit" variant="primary" fullWidth disabled={!formProveedorId || itemsOrden.length === 0}>+ Crear Orden de Compra</Btn>
          </form>
        )}
      </div>

      {totalPendiente > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 mb-5 flex flex-wrap gap-6 items-center">
          <div>
            <div className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Total por pagar</div>
            <div className="text-2xl font-extrabold text-rose-700">${fmt(totalPendiente)}</div>
          </div>
          <div className="text-sm text-rose-600">
            <span className="font-semibold">{counts.pendiente}</span> orden{counts.pendiente !== 1 ? 'es' : ''} pendientes
            {counts.parcial > 0 && <span> · <span className="font-semibold">{counts.parcial}</span> parciales</span>}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {(['todos', 'pendiente', 'parcial', 'pagado'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${filtro === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}
          >
            {f === 'todos' ? 'Todas' : BADGE_ESTADO[f].label} ({counts[f]})
          </button>
        ))}
      </div>

      {ordenesFiltradas.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-medium text-slate-500">Sin órdenes registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ordenesFiltradas.map(orden => {
            const proveedor = proveedores.find(p => p.id === orden.proveedorId);
            const estadoPago = getEstadoPagoOrden(orden);
            const montoPagado = getMontoPagadoOrden(orden);
            const saldo = getSaldoOrden(orden);
            const badgePago = BADGE_ESTADO[estadoPago];
            const badgeOrden = BADGE_ORDEN[orden.estado];
            const isExp = expandido === orden.id;

            return (
              <div key={orden.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className={`grid grid-cols-1 sm:grid-cols-6 gap-2 items-center px-4 py-3 ${isExp ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'} transition-colors`}>
                  <div className="sm:col-span-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">🏪 {proveedor?.nombre ?? 'Proveedor'}</span>
                      {orden.numeroOrden && <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{orden.numeroOrden}</span>}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeOrden.cls}`}>{badgeOrden.label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgePago.cls}`}>{badgePago.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                      <span>{new Date(orden.fecha).toLocaleDateString('es-MX')}</span>
                      {orden.descripcion && <span>· {orden.descripcion}</span>}
                      <span>· {orden.partes.length} pieza{orden.partes.length !== 1 ? 's' : ''}</span>
                    </div>
                    {orden.estado === 'recibida' && orden.fechaRecibida && <div className="text-xs text-emerald-600 mt-0.5">Recibida: {new Date(orden.fechaRecibida).toLocaleDateString('es-MX')}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Total</div>
                    <div className="font-semibold text-slate-800">${fmt(orden.total)}</div>
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
                    <div className="flex gap-2">
                      {orden.estado === 'pendiente' && <Btn size="sm" variant="success" onClick={() => onRecibirOrden(orden.id)}>Marcar Recibida</Btn>}
                      <Btn size="sm" variant={isExp ? 'ghost' : estadoPago !== 'pagado' ? 'success' : 'ghost'} onClick={() => { setExpandido(isExp ? null : orden.id); setPagoForm({ monto: 0, fecha: hoy, nota: '' }); }}>
                        {isExp ? '✕' : estadoPago !== 'pagado' ? '+ Pago' : 'Ver'}
                      </Btn>
                    </div>
                  </div>
                </div>

                {isExp && (
                  <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-200 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Piezas de la orden</p>
                      <div className="space-y-1">
                        {orden.partes.map(item => (
                          <div key={item.refaccionId} className="flex justify-between bg-white border border-slate-200 rounded px-3 py-1.5 text-sm">
                            <span className="text-slate-700">{item.nombre} × {item.cantidad}</span>
                            <span className="font-semibold text-slate-800">${fmt(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {orden.pagos?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Historial de pagos</p>
                        <div className="space-y-1">
                          {orden.pagos.map(p => (
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

                    {estadoPago !== 'pagado' ? (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar Pago al Proveedor</p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <Label>Fecha</Label>
                            <Input type="date" value={pagoForm.fecha} onChange={e => setPagoForm(f => ({ ...f, fecha: e.target.value }))} />
                          </div>
                          <div>
                            <Label>Monto ($) — saldo: ${fmt(saldo)}</Label>
                            <Input type="number" placeholder="0.00" min="0.01" step="0.01" value={pagoForm.monto || ''} onChange={e => setPagoForm(f => ({ ...f, monto: Number(e.target.value) }))} />
                          </div>
                          <div>
                            <Label>Nota (opcional)</Label>
                            <Input type="text" placeholder="Efectivo, transferencia..." value={pagoForm.nota} onChange={e => setPagoForm(f => ({ ...f, nota: e.target.value }))} />
                          </div>
                          <div className="flex items-end">
                            <Btn variant="success" fullWidth disabled={pagoForm.monto <= 0} onClick={() => handleRegistrarPago(orden.id, saldo)}>✓ Registrar</Btn>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 font-semibold text-center">✅ Esta orden está completamente pagada.</p>
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
