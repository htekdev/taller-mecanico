'use client';

import { useMemo, useState } from 'react';
import type { Cliente, ManoDeObraItem, PricingIntel, Refaccion, Trabajo, TrabajoRefaccion, Vehiculo } from '../lib/types';
import { fmt, getPricingIntel, isPartCompatibleWithVehiculo, labelVehiculo } from '../lib/utils';
import { Btn, EmptyRow, Input, Label, SectionTitle, Select } from '../components/ui';

export default function VistaTrabajo({
  clientes,
  vehiculos,
  inventario,
  trabajos,
  onGuardar,
  onIrAInventario,
  onGenerarFactura,
  onIrAFacturas,
}: {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  inventario: Refaccion[];
  trabajos: Trabajo[];
  onGuardar: (t: Omit<Trabajo, 'id' | 'total' | 'iva'>) => void;
  onIrAInventario: () => void;
  onGenerarFactura?: (trabajoId: string) => void;
  onIrAFacturas?: () => void;
}) {
  const emptyForm = {
    clienteId: '',
    vehiculoId: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    requiereFactura: false,
    folioFiscal: '',
    estado: 'pendiente' as Trabajo['estado'],
  };
  const [form, setForm] = useState(emptyForm);
  const [laborItems, setLaborItems] = useState<ManoDeObraItem[]>([]);
  const [laborConcepto, setLaborConcepto] = useState('');
  const [laborPrecio, setLaborPrecio] = useState(0);
  const [partesSeleccionadas, setPartesSeleccionadas] = useState<TrabajoRefaccion[]>([]);
  const [pickerRefId, setPickerRefId] = useState('');
  const [pickerCantidad, setPickerCantidad] = useState(1);
  const [pickerPrecioVenta, setPickerPrecioVenta] = useState(0);

  const vehiculosDelCliente = vehiculos.filter(v => v.clienteId === form.clienteId);
  const totalManoDeObra = laborItems.reduce((s, l) => s + l.precio, 0);
  const totalVentaRefacciones = partesSeleccionadas.reduce((s, p) => s + p.subtotal, 0);
  const totalCostoRefacciones = partesSeleccionadas.reduce((s, p) => s + p.costoTotal, 0);
  const utilidadRefacciones = totalVentaRefacciones - totalCostoRefacciones;
  const subtotalSinIVA = totalManoDeObra + totalVentaRefacciones;
  const ivaCalculado = form.requiereFactura ? Math.round(subtotalSinIVA * 0.16 * 100) / 100 : 0;
  const totalConIVA = subtotalSinIVA + ivaCalculado;

  const handleClienteChange = (clienteId: string) => setForm(f => ({ ...f, clienteId, vehiculoId: '' }));

  const agregarLabor = () => {
    if (!laborConcepto.trim() || laborPrecio <= 0) return;
    setLaborItems(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, concepto: laborConcepto.trim(), precio: laborPrecio }]);
    setLaborConcepto('');
    setLaborPrecio(0);
  };

  const removerLabor = (id: string) => setLaborItems(prev => prev.filter(l => l.id !== id));

  const agregarParte = () => {
    const ref = inventario.find(r => r.id === pickerRefId);
    if (!ref || pickerCantidad <= 0) return;
    const pVenta = pickerPrecioVenta > 0 ? pickerPrecioVenta : ref.precioCompra;
    setPartesSeleccionadas(prev => {
      const existente = prev.find(p => p.refaccionId === ref.id);
      if (existente) {
        const nuevaCantidad = existente.cantidad + pickerCantidad;
        return prev.map(p => p.refaccionId === ref.id ? { ...p, cantidad: nuevaCantidad, subtotal: nuevaCantidad * p.precioVenta, costoTotal: nuevaCantidad * p.precioCompra } : p);
      }
      return [...prev, { refaccionId: ref.id, nombre: ref.nombre, codigo: ref.codigo, cantidad: pickerCantidad, precioCompra: ref.precioCompra, precioVenta: pVenta, subtotal: pickerCantidad * pVenta, costoTotal: pickerCantidad * ref.precioCompra }];
    });
    setPickerRefId('');
    setPickerCantidad(1);
    setPickerPrecioVenta(0);
  };

  const handlePickerRefChange = (id: string) => {
    setPickerRefId(id);
    const ref = inventario.find(r => r.id === id);
    if (!ref) {
      setPickerPrecioVenta(0);
      return;
    }
    if (form.clienteId) {
      const prices = trabajos
        .filter(t => t.clienteId === form.clienteId)
        .flatMap(t => t.partes.filter(p => p.refaccionId === id && p.precioVenta > 0).map(p => p.precioVenta));
      if (prices.length > 0) {
        setPickerPrecioVenta(Math.max(...prices));
        return;
      }
    }
    setPickerPrecioVenta(ref.precioCompra);
  };

  const removerParte = (refaccionId: string) => setPartesSeleccionadas(prev => prev.filter(p => p.refaccionId !== refaccionId));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteId || !form.vehiculoId || !form.descripcion) return;
    onGuardar({
      ...form,
      manoDeObra: totalManoDeObra,
      manoDeObraItems: laborItems,
      refacciones: totalVentaRefacciones,
      costoRefacciones: totalCostoRefacciones,
      requiereFactura: form.requiereFactura,
      folioFiscal: form.requiereFactura && form.folioFiscal ? form.folioFiscal : undefined,
      partes: partesSeleccionadas,
      pagos: [],
    });
    setForm(emptyForm);
    setLaborItems([]);
    setLaborConcepto('');
    setLaborPrecio(0);
    setPartesSeleccionadas([]);
    setPickerRefId('');
    setPickerCantidad(1);
    setPickerPrecioVenta(0);
  };

  const getCliente = (id: string) => clientes.find(c => c.id === id);
  const getVehiculo = (id: string) => vehiculos.find(v => v.id === id);
  const pickerRef = inventario.find(r => r.id === pickerRefId);

  const intel: PricingIntel | null = useMemo(() => {
    if (!pickerRefId || !form.clienteId) return null;
    const ref = inventario.find(r => r.id === pickerRefId);
    if (!ref) return null;
    return getPricingIntel(pickerRefId, form.clienteId, ref.precioCompra, trabajos);
  }, [pickerRefId, form.clienteId, inventario, trabajos]);

  const vehiculoDelTrabajo = vehiculos.find(v => v.id === form.vehiculoId);
  const isCompatible = (r: Refaccion) => isPartCompatibleWithVehiculo(r, vehiculoDelTrabajo);
  const partesParaEstaUnidad = inventario.filter(r => r.vehiculoId === form.vehiculoId && isCompatible(r));
  const partesCompatibles = inventario.filter(r => r.vehiculoId !== form.vehiculoId && r.compatibilidad?.length && isCompatible(r));
  const partesUniversales = inventario.filter(r => r.vehiculoId !== form.vehiculoId && (!r.compatibilidad || r.compatibilidad.length === 0));
  const totalCompatibles = form.vehiculoId ? partesParaEstaUnidad.length + partesCompatibles.length + partesUniversales.length : inventario.length;

  return (
    <div>
      <SectionTitle title="Registro de Trabajos" subtitle="Selecciona cliente, unidad y las refacciones usadas del inventario." />

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Nuevo Trabajo</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>① Cliente</Label>
              <Select value={form.clienteId} onChange={e => handleClienteChange(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
            </div>
            <div>
              <Label>② Unidad / Vehículo</Label>
              <Select value={form.vehiculoId} onChange={e => setForm(f => ({ ...f, vehiculoId: e.target.value }))} required disabled={!form.clienteId || vehiculosDelCliente.length === 0}>
                <option value="">Seleccionar unidad...</option>
                {vehiculosDelCliente.map(v => <option key={v.id} value={v.id}>{labelVehiculo(v)}</option>)}
              </Select>
            </div>
          </div>

          {form.clienteId && vehiculosDelCliente.length === 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <span>⚠️</span>
              <span>Este cliente no tiene unidades. Ve a <span className="font-bold">👥 Clientes</span> para registrar una primero.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div>
              <Label>Descripción general del trabajo</Label>
              <Input type="text" placeholder="Ej. Servicio completo frenos y aceite..." value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} required />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 bg-slate-700">
              <span className="text-xs font-bold text-white uppercase tracking-widest">② Mano de Obra</span>
              <span className="ml-3 text-slate-400 text-xs">Agrega cada tarea con su precio</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-48">
                  <Label>Concepto</Label>
                  <Input type="text" placeholder="Ej. Arreglo de frenos, engrase de pernos..." value={laborConcepto} onChange={e => setLaborConcepto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarLabor(); } }} />
                </div>
                <div className="w-36">
                  <Label>Precio ($)</Label>
                  <Input type="number" placeholder="0.00" min="0.01" step="0.01" value={laborPrecio || ''} onChange={e => setLaborPrecio(Number(e.target.value))} />
                </div>
                <div className="flex items-end">
                  <Btn variant="primary" disabled={!laborConcepto.trim() || laborPrecio <= 0} onClick={agregarLabor}>+ Agregar</Btn>
                </div>
              </div>

              {laborItems.length > 0 ? (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Concepto</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Precio</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {laborItems.map(l => (
                        <tr key={l.id} className="bg-white">
                          <td className="px-3 py-2 text-slate-800 font-medium">{l.concepto}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(l.precio)}</td>
                          <td className="px-3 py-2 text-center"><Btn size="sm" variant="danger" onClick={() => removerLabor(l.id)}>✕</Btn></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td className="px-3 py-2 text-sm font-bold text-slate-700 text-right">Total Mano de Obra:</td>
                        <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(totalManoDeObra)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">Sin conceptos de mano de obra. El trabajo se registra con mano de obra = $0.00</p>
              )}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-widest">③ Refacciones del Inventario</span>
              {inventario.length === 0 && <button type="button" onClick={onIrAInventario} className="text-xs text-indigo-300 hover:text-white underline font-medium">Ir a Inventario →</button>}
            </div>

            {inventario.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">
                <p>El inventario está vacío.</p>
                <button type="button" onClick={onIrAInventario} className="mt-2 text-indigo-600 font-semibold hover:underline">Agregar refacciones al inventario →</button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {form.vehiculoId && vehiculoDelTrabajo && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${totalCompatibles > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    <span>🚗</span>
                    <span>{totalCompatibles > 0 ? `Mostrando ${totalCompatibles} refacción${totalCompatibles !== 1 ? 'es' : ''} compatibles con ${vehiculoDelTrabajo.marca} ${vehiculoDelTrabajo.modelo}` : `Sin refacciones marcadas como compatibles con ${vehiculoDelTrabajo.marca} ${vehiculoDelTrabajo.modelo} — se muestran las universales`}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2 lg:col-span-2">
                    <Label>Refacción</Label>
                    <Select value={pickerRefId} onChange={e => handlePickerRefChange(e.target.value)}>
                      <option value="">Seleccionar pieza...</option>
                      {partesParaEstaUnidad.length > 0 && <optgroup label="🎯 Compradas para esta unidad">{partesParaEstaUnidad.map(r => <option key={r.id} value={r.id}>{r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock</option>)}</optgroup>}
                      {partesCompatibles.length > 0 && vehiculoDelTrabajo && <optgroup label={`✅ Compatible con ${vehiculoDelTrabajo.marca} ${vehiculoDelTrabajo.modelo}`}>{partesCompatibles.map(r => <option key={r.id} value={r.id}>{r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock</option>)}</optgroup>}
                      {partesUniversales.length > 0 && <optgroup label="🌐 Universales (todos los vehículos)">{partesUniversales.map(r => <option key={r.id} value={r.id}>{r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock</option>)}</optgroup>}
                      {!form.vehiculoId && inventario.map(r => <option key={r.id} value={r.id}>{r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>Cantidad</Label>
                    <Input type="number" min="1" step="1" placeholder="1" value={pickerCantidad || ''} onChange={e => setPickerCantidad(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Precio venta ($){intel?.clientLastSale && pickerPrecioVenta > 0 && pickerPrecioVenta < intel.clientLastSale.precio && <span className="ml-2 text-amber-600 font-bold text-xs">⚠ menor que antes</span>}</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" value={pickerPrecioVenta || ''} onChange={e => setPickerPrecioVenta(Number(e.target.value))} className={intel?.clientLastSale && pickerPrecioVenta > 0 && pickerPrecioVenta < intel.clientLastSale.precio ? '!border-amber-400 !ring-amber-400' : ''} />
                  </div>
                </div>

                {pickerRef && intel && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-slate-500 text-xs">Costo: <strong className="text-slate-700">${fmt(pickerRef.precioCompra)}</strong>/{pickerRef.unidad}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400 font-medium">Sugerencias:</span>
                      {intel.markups.map(m => <button key={m.pct} type="button" onClick={() => setPickerPrecioVenta(m.price)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${pickerPrecioVenta === m.price ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}>{m.pct}% margen ${fmt(m.price)}</button>)}
                      {pickerRef.stock < pickerCantidad && <span className="text-xs font-semibold text-amber-600 ml-auto">⚠ solo {pickerRef.stock} en stock</span>}
                    </div>

                    {intel.clientLastSale && (() => {
                      const isLower = pickerPrecioVenta > 0 && pickerPrecioVenta < intel.clientLastSale!.precio;
                      const isSame = pickerPrecioVenta === intel.clientLastSale!.precio;
                      return (
                        <div className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 border ${isLower ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200'}`}>
                          <div className="text-xs">
                            <span className={`font-bold ${isLower ? 'text-amber-700' : 'text-indigo-700'}`}>{isLower ? '⚠️' : '📋'} {isLower ? `Estás cobrando menos que antes ($${fmt(pickerPrecioVenta)} vs $${fmt(intel.clientLastSale!.precio)})` : isSame ? `Mismo precio que el máximo cobrado ($${fmt(intel.clientLastSale!.precio)})` : `Mayor precio cobrado a este cliente: $${fmt(intel.clientLastSale!.precio)}`}</span>
                            <span className="text-slate-400 ml-1">— {new Date(intel.clientLastSale!.fecha).toLocaleDateString('es-MX')}{intel.clientAllSales.length > 1 && ` · ${intel.clientAllSales.length} veces vendida`}</span>
                          </div>
                          {!isSame && <button type="button" onClick={() => setPickerPrecioVenta(intel.clientLastSale!.precio)} className={`text-xs font-bold whitespace-nowrap px-2.5 py-1 rounded-lg border transition-all ${isLower ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700' : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'}`}>Usar ${fmt(intel.clientLastSale!.precio)}</button>}
                        </div>
                      );
                    })()}

                    {intel.otherMin !== null && <div className="text-xs text-slate-400 flex items-center gap-1"><span>💬</span><span>Otros clientes pagaron: <strong className="text-slate-600">{intel.otherMin === intel.otherMax ? `$${fmt(intel.otherMin!)}` : `$${fmt(intel.otherMin!)} – $${fmt(intel.otherMax!)}`}</strong></span></div>}
                  </div>
                )}

                <div className="flex justify-between items-center gap-3 flex-wrap">
                  {pickerPrecioVenta > 0 && pickerRef && <span className="text-xs text-slate-500">Margen: <strong className={pickerPrecioVenta > pickerRef.precioCompra ? 'text-emerald-600' : 'text-slate-600'}>${fmt((pickerPrecioVenta - pickerRef.precioCompra) * pickerCantidad)} ({(((pickerPrecioVenta - pickerRef.precioCompra) / pickerRef.precioCompra) * 100).toFixed(0)}%)</strong>{pickerCantidad > 1 && ` · subtotal cobrado $${fmt(pickerPrecioVenta * pickerCantidad)}`}</span>}
                  <div className={!pickerRef ? 'ml-auto' : ''}><Btn variant="primary" disabled={!pickerRefId || pickerCantidad <= 0} onClick={agregarParte}>+ Agregar pieza</Btn></div>
                </div>

                {partesSeleccionadas.length > 0 ? (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Refacción</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Cant.</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Costo</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Venta</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-600 uppercase tracking-wide">Margen</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {partesSeleccionadas.map(p => {
                          const margen = p.subtotal - p.costoTotal;
                          return <tr key={p.refaccionId} className="bg-white"><td className="px-3 py-2 text-slate-800 font-medium">{p.nombre}{p.codigo && <span className="ml-1.5 text-xs font-mono text-slate-400">{p.codigo}</span>}</td><td className="px-3 py-2 text-right text-slate-700">{p.cantidad}</td><td className="px-3 py-2 text-right text-slate-400 text-xs">${fmt(p.costoTotal)}</td><td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(p.subtotal)}</td><td className="px-3 py-2 text-right font-medium text-emerald-600">${fmt(margen)}</td><td className="px-3 py-2 text-center"><Btn size="sm" variant="danger" onClick={() => removerParte(p.refaccionId)}>✕</Btn></td></tr>;
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200"><tr><td colSpan={2} className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Totales:</td><td className="px-3 py-2 text-right text-xs text-slate-400 font-semibold">${fmt(totalCostoRefacciones)}</td><td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(totalVentaRefacciones)}</td><td className="px-3 py-2 text-right font-extrabold text-emerald-600">${fmt(utilidadRefacciones)}</td><td></td></tr></tfoot>
                    </table>
                  </div>
                ) : <p className="text-xs text-slate-400 text-center py-2">Sin refacciones agregadas. El trabajo se registra con refacciones = $0.00</p>}
              </div>
            )}
          </div>

          <div className={`border rounded-xl p-4 space-y-3 ${form.requiereFactura ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.requiereFactura} onChange={e => setForm(f => ({ ...f, requiereFactura: e.target.checked, folioFiscal: '' }))} className="w-4 h-4 accent-amber-500 cursor-pointer" />
              <div>
                <span className={`font-semibold text-sm ${form.requiereFactura ? 'text-amber-800' : 'text-slate-700'}`}>🧾 ¿Requiere factura fiscal?</span>
                <span className="text-xs text-slate-400 ml-2">{form.requiereFactura ? 'Se agrega IVA 16% al total' : 'Sin IVA — pago sin factura fiscal'}</span>
              </div>
            </label>

            {form.requiereFactura && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label>Folio Fiscal (opcional)</Label>
                  <Input type="text" placeholder="Ej. FAC-2026-0042" value={form.folioFiscal} onChange={e => setForm(f => ({ ...f, folioFiscal: e.target.value }))} className="font-mono" />
                </div>
                <div className="flex items-end">
                  <div className="w-full bg-amber-100 border border-amber-200 rounded-lg px-4 py-2.5 text-sm">
                    <div className="flex justify-between text-amber-700"><span>Subtotal:</span><span className="font-semibold">${fmt(subtotalSinIVA)}</span></div>
                    <div className="flex justify-between text-amber-700 mt-0.5"><span>IVA 16%:</span><span className="font-semibold">+ ${fmt(ivaCalculado)}</span></div>
                    <div className="flex justify-between text-amber-900 font-bold border-t border-amber-300 mt-1.5 pt-1.5"><span>Total:</span><span>${fmt(totalConIVA)}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(totalManoDeObra > 0 || totalVentaRefacciones > 0) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 space-y-2 text-sm">
              <div className="flex flex-wrap gap-6">
                <div><span className="text-indigo-500 font-semibold">Mano de obra</span>{laborItems.length > 0 && <span className="text-indigo-400 ml-1">({laborItems.length} concepto{laborItems.length !== 1 ? 's' : ''})</span>}{': '}<span className="font-bold text-slate-800">${fmt(totalManoDeObra)}</span></div>
                <div><span className="text-indigo-500 font-semibold">Venta refacciones:</span> <span className="font-bold text-slate-800">${fmt(totalVentaRefacciones)}</span></div>
                {form.requiereFactura ? <><div><span className="text-amber-600 font-semibold">IVA 16%:</span> <span className="font-bold text-amber-700">+ ${fmt(ivaCalculado)}</span></div><div><span className="text-indigo-700 font-bold">Total: </span><span className="font-extrabold text-indigo-800 text-base">${fmt(totalConIVA)}</span></div></> : <div><span className="text-indigo-700 font-bold">Total: </span><span className="font-extrabold text-indigo-800 text-base">${fmt(subtotalSinIVA)}</span></div>}
              </div>
              {utilidadRefacciones !== 0 && <div className="text-xs text-slate-500 border-t border-indigo-100 pt-2 flex flex-wrap gap-4"><span>Costo refacciones: <strong className="text-slate-700">${fmt(totalCostoRefacciones)}</strong></span><span>Margen en partes: <strong className={utilidadRefacciones >= 0 ? 'text-emerald-600' : 'text-rose-600'}>${fmt(utilidadRefacciones)}</strong></span><span>Utilidad total: <strong className="text-emerald-700">${fmt(totalManoDeObra + utilidadRefacciones)}</strong></span></div>}
            </div>
          )}

          <Btn type="submit" variant="primary" fullWidth disabled={!form.clienteId || !form.vehiculoId || !form.descripcion}>✓ Registrar Trabajo</Btn>
        </form>
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-700 mb-3">Historial de Trabajos{trabajos.length > 0 && <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{trabajos.length}</span>}</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-800 text-white">{['Fecha', 'Cliente', 'Unidad', 'Descripción', 'Refacciones', 'Mano de Obra', 'Total'].map((h, i) => <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {trabajos.map((trabajo, i) => {
                const cliente = getCliente(trabajo.clienteId);
                const vehiculo = getVehiculo(trabajo.vehiculoId);
                return (
                  <tr key={trabajo.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">{new Date(trabajo.fecha).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">{vehiculo ? <span><span className="text-slate-700 font-medium">{[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')}</span>{vehiculo.placa && <span className="ml-1.5 text-xs bg-slate-200 text-slate-600 font-mono font-semibold px-1.5 py-0.5 rounded">{vehiculo.placa}</span>}</span> : <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {trabajo.descripcion}
                      {trabajo.partes?.length > 0 && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded-full">{trabajo.partes.length} pieza{trabajo.partes.length !== 1 ? 's' : ''}</span>}
                      {trabajo.requiereFactura && <span className="ml-2 text-xs bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">🧾 +IVA{trabajo.folioFiscal ? ` ${trabajo.folioFiscal}` : ''}</span>}
                      {trabajo.requiereFactura && trabajo.estadoFacturacion === 'facturado' && <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full">✓ Facturado</span>}
                      {trabajo.requiereFactura && trabajo.estadoFacturacion !== 'facturado' && onGenerarFactura && onIrAFacturas && <button type="button" onClick={() => { onGenerarFactura(trabajo.id); onIrAFacturas(); }} className="ml-2 text-xs bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded-full hover:bg-amber-100 hover:text-amber-700 transition-colors">+ Factura</button>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700"><div>${fmt(trabajo.refacciones)}</div></td>
                    <td className="px-4 py-3 text-right text-slate-700"><div>${fmt(trabajo.manoDeObra)}</div>{trabajo.manoDeObraItems?.length > 1 && <div className="text-xs text-slate-400 mt-0.5">{trabajo.manoDeObraItems.length} conceptos</div>}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">${fmt(trabajo.total)}</td>
                  </tr>
                );
              })}
              {trabajos.length === 0 && <EmptyRow cols={7} message="Sin trabajos registrados. Agrega el primero arriba." />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
