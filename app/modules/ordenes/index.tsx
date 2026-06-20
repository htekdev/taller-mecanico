'use client';

import { useState } from 'react';
import type { OrdenCompra, Proveedor, Refaccion, CompraItem } from '@/app/types';
import { Label, Input, Select, Btn, SectionTitle } from '@/app/components/ui';
import { fmt, BADGE_ORDEN } from '@/app/lib/utils';

// Categorías comunes de refacciones para el selector rápido
const CATEGORIAS_COMUNES = [
  'Filtros', 'Frenos', 'Suspensión', 'Motor', 'Transmisión',
  'Eléctrico', 'Escape', 'Enfriamiento', 'Lubricantes', 'Otro',
];

export function VistaOrdenesCompra({
  ordenes,
  proveedores,
  inventario,
  onCrearOrden,
  onRecibirOrden,
  onCancelarOrden,
  onIrAProveedores,
  onCrearRefaccionNueva,
}: {
  ordenes: OrdenCompra[];
  proveedores: Proveedor[];
  inventario: Refaccion[];
  onCrearOrden: (data: Omit<OrdenCompra, 'id' | 'estado' | 'fechaRecibida' | 'pagos'>) => void;
  onRecibirOrden: (id: string) => void;
  onCancelarOrden: (id: string) => void;
  onIrAProveedores: () => void;
  onCrearRefaccionNueva: (data: Omit<Refaccion, 'id'>) => Refaccion;
}) {
  const hoy = new Date().toISOString().split('T')[0];

  // ── Form principal OC ─────────────────────────────────────────────────────
  const [formProveedorId, setFormProveedorId] = useState('');
  const [formFecha, setFormFecha] = useState(hoy);
  const [formDesc, setFormDesc] = useState('');
  const [formNumOrden, setFormNumOrden] = useState('');
  const [itemsOrden, setItemsOrden] = useState<CompraItem[]>([]);
  const [filtro, setFiltro] = useState<'todos'|'pendiente'|'recibida'|'cancelada'>('todos');

  // ── Modo agregar pieza ────────────────────────────────────────────────────
  const [modoAgregar, setModoAgregar] = useState<'existente' | 'nueva'>('existente');

  // Pieza existente
  const [pickerRefId, setPickerRefId] = useState('');
  const [pickerCantidad, setPickerCantidad] = useState(1);
  const [pickerPrecio, setPickerPrecio] = useState(0);

  // Nueva refacción
  const [newNombre, setNewNombre]         = useState('');
  const [newCodigo, setNewCodigo]         = useState('');
  const [newCategoria, setNewCategoria]   = useState('');
  const [newCategoriaCustom, setNewCategoriaCustom] = useState('');
  const [newUnidad, setNewUnidad]         = useState('pza');
  const [newPrecio, setNewPrecio]         = useState(0);
  const [newCantidad, setNewCantidad]     = useState(1);

  const totalOrden = itemsOrden.reduce((s, i) => s + i.subtotal, 0);
  const pickerRef  = inventario.find(r => r.id === pickerRefId);

  // ── Agregar pieza existente ───────────────────────────────────────────────
  const agregarItem = () => {
    if (!pickerRefId || pickerCantidad <= 0 || pickerPrecio <= 0) return;
    const ref = inventario.find(r => r.id === pickerRefId);
    if (!ref) return;
    setItemsOrden(prev => {
      const ex = prev.find(i => i.refaccionId === ref.id);
      if (ex) { const nc = ex.cantidad + pickerCantidad; return prev.map(i => i.refaccionId === ref.id ? { ...i, cantidad: nc, subtotal: nc * i.precioCompra } : i); }
      return [...prev, { refaccionId: ref.id, nombre: ref.nombre, cantidad: pickerCantidad, precioCompra: pickerPrecio, subtotal: pickerCantidad * pickerPrecio }];
    });
    setPickerRefId(''); setPickerCantidad(1); setPickerPrecio(0);
  };

  // ── Agregar nueva refacción al catálogo + orden ───────────────────────────
  const agregarRefaccionNueva = () => {
    if (!newNombre.trim() || newPrecio <= 0 || newCantidad <= 0) return;
    const categoriaFinal = newCategoria === '__custom__' ? newCategoriaCustom.trim() : newCategoria;
    const nuevaRef = onCrearRefaccionNueva({
      nombre:       newNombre.trim(),
      codigo:       newCodigo.trim(),
      categoria:    categoriaFinal,
      unidad:       newUnidad || 'pza',
      precioCompra: newPrecio,
      stock:        0,          // stock arranca en 0 — sube al recibir OC
      stockMinimo:  1,
    });
    setItemsOrden(prev => [
      ...prev,
      {
        refaccionId:  nuevaRef.id,
        nombre:       nuevaRef.nombre,
        cantidad:     newCantidad,
        precioCompra: newPrecio,
        subtotal:     newCantidad * newPrecio,
      },
    ]);
    // Limpiar form nueva refacción
    setNewNombre(''); setNewCodigo(''); setNewCategoria(''); setNewCategoriaCustom('');
    setNewUnidad('pza'); setNewPrecio(0); setNewCantidad(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProveedorId || itemsOrden.length === 0) return;
    onCrearOrden({ proveedorId: formProveedorId, fecha: formFecha, descripcion: formDesc, partes: itemsOrden, total: totalOrden, numeroOrden: formNumOrden || undefined });
    setFormProveedorId(''); setFormFecha(hoy); setFormDesc(''); setFormNumOrden(''); setItemsOrden([]);
  };

  const ordenesFiltradas = [...ordenes]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(o => filtro === 'todos' || o.estado === filtro);

  const counts = { todos: ordenes.length, pendiente: ordenes.filter(o => o.estado === 'pendiente').length, recibida: ordenes.filter(o => o.estado === 'recibida').length, cancelada: ordenes.filter(o => o.estado === 'cancelada').length };
  const pendientesRecibir = counts.pendiente;

  return (
    <div>
      <SectionTitle title="Órdenes de Compra" subtitle="Crea una OC para un proveedor. Al marcarla como 'recibida', el inventario se actualiza y pasa a Cuentas por Pagar." />

      {pendientesRecibir > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-5 flex items-center gap-3 text-sm">
          <span className="text-amber-600 font-semibold">⏳ {pendientesRecibir} orden{pendientesRecibir !== 1 ? 'es' : ''} pendiente{pendientesRecibir !== 1 ? 's' : ''} de recibir</span>
        </div>
      )}

      {/* Crear OC */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Nueva Orden de Compra</h3>
        {proveedores.length === 0 ? (
          <div className="text-center py-4 text-sm text-slate-400">
            <p>Registra un proveedor primero.</p>
            <button type="button" onClick={onIrAProveedores} className="mt-1 text-indigo-600 font-semibold hover:underline">Ir a Proveedores →</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2"><Label>Proveedor *</Label>
                <Select value={formProveedorId} onChange={e => setFormProveedorId(e.target.value)} required>
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </Select></div>
              <div><Label>Fecha</Label>
                <Input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} required /></div>
              <div><Label>Nº Orden (opcional)</Label>
                <Input type="text" placeholder="Ej. OC-2026-001" value={formNumOrden} onChange={e => setFormNumOrden(e.target.value)} className="font-mono" /></div>
            </div>
            <div><Label>Descripción (opcional)</Label>
              <Input type="text" placeholder="Ej. Reposición mensual filtros" value={formDesc} onChange={e => setFormDesc(e.target.value)} /></div>

            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-3 bg-slate-700">
                <span className="text-xs font-bold text-white uppercase tracking-widest">Piezas a Ordenar</span>
                <span className="ml-3 text-slate-400 text-xs">El inventario aumentará cuando marques la OC como recibida</span>
              </div>
              <div className="p-4 space-y-3">

                {/* ── Toggle modo agregar ── */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                  <button
                    type="button"
                    onClick={() => setModoAgregar('existente')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${modoAgregar === 'existente' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    📦 Del inventario
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoAgregar('nueva')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${modoAgregar === 'nueva' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    ✨ Nueva refacción
                  </button>
                </div>

                {/* ── Modo: Pieza existente ── */}
                {modoAgregar === 'existente' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div className="sm:col-span-2"><Label>Refacción</Label>
                        <Select value={pickerRefId} onChange={e => { setPickerRefId(e.target.value); const r = inventario.find(x => x.id === e.target.value); setPickerPrecio(r?.precioCompra ?? 0); }}>
                          <option value="">Seleccionar pieza...</option>
                          {inventario.map(r => <option key={r.id} value={r.id}>{r.nombre}{r.codigo ? ` (${r.codigo})` : ''}</option>)}
                        </Select></div>
                      <div><Label>Cantidad</Label>
                        <Input type="number" min="1" step="1" placeholder="1" value={pickerCantidad || ''} onChange={e => setPickerCantidad(Number(e.target.value))} /></div>
                      <div><Label>Precio compra ($)</Label>
                        <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={pickerPrecio || ''} onChange={e => setPickerPrecio(Number(e.target.value))} /></div>
                    </div>
                    <div className="flex justify-between items-center">
                      {pickerRef && pickerPrecio > 0 && <span className="text-xs text-slate-500">Subtotal: <strong>${fmt(pickerPrecio * pickerCantidad)}</strong></span>}
                      <Btn variant="primary" size="sm" disabled={!pickerRefId || pickerCantidad <= 0 || pickerPrecio <= 0} onClick={agregarItem}>+ Agregar</Btn>
                    </div>
                  </>
                )}

                {/* ── Modo: Nueva refacción ── */}
                {modoAgregar === 'nueva' && (
                  <div className="border border-indigo-100 rounded-xl bg-indigo-50 p-4 space-y-3">
                    <p className="text-xs text-indigo-700 font-medium">
                      💡 La refacción se registrará automáticamente en el catálogo de inventario. El stock comenzará en 0 y aumentará al marcar la OC como recibida.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Nombre *</Label>
                        <Input type="text" placeholder="Ej. Filtro de aceite Bosch" value={newNombre} onChange={e => setNewNombre(e.target.value)} />
                      </div>
                      <div>
                        <Label>Código (opcional)</Label>
                        <Input type="text" placeholder="Ej. 0986AF1036" value={newCodigo} onChange={e => setNewCodigo(e.target.value)} className="font-mono" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label>Categoría</Label>
                        <Select value={newCategoria} onChange={e => setNewCategoria(e.target.value)}>
                          <option value="">Sin categoría</option>
                          {CATEGORIAS_COMUNES.map(c => <option key={c} value={c}>{c}</option>)}
                          <option value="__custom__">Otra (escribir)...</option>
                        </Select>
                        {newCategoria === '__custom__' && (
                          <Input type="text" placeholder="Ej. Dirección hidráulica" value={newCategoriaCustom} onChange={e => setNewCategoriaCustom(e.target.value)} className="mt-2" />
                        )}
                      </div>
                      <div>
                        <Label>Unidad</Label>
                        <Select value={newUnidad} onChange={e => setNewUnidad(e.target.value)}>
                          <option value="pza">Pieza (pza)</option>
                          <option value="lt">Litro (lt)</option>
                          <option value="kg">Kilogramo (kg)</option>
                          <option value="m">Metro (m)</option>
                          <option value="par">Par</option>
                          <option value="juego">Juego</option>
                          <option value="caja">Caja</option>
                        </Select>
                      </div>
                      <div>
                        <Label>Precio compra ($) *</Label>
                        <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={newPrecio || ''} onChange={e => setNewPrecio(Number(e.target.value))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <Label>Cantidad *</Label>
                        <Input type="number" min="1" step="1" placeholder="1" value={newCantidad || ''} onChange={e => setNewCantidad(Number(e.target.value))} />
                      </div>
                      <div className="flex items-end gap-3 sm:col-span-3">
                        {newNombre && newPrecio > 0 && newCantidad > 0 && (
                          <span className="text-xs text-indigo-600 font-semibold pb-2.5">
                            Subtotal: ${fmt(newPrecio * newCantidad)}
                          </span>
                        )}
                        <Btn
                          variant="primary"
                          size="sm"
                          disabled={!newNombre.trim() || newPrecio <= 0 || newCantidad <= 0}
                          onClick={agregarRefaccionNueva}
                        >
                          + Registrar y agregar a OC
                        </Btn>
                      </div>
                    </div>
                  </div>
                )}
                {itemsOrden.length > 0 && (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>{['Pieza','Cant.','Precio','Subtotal',''].map((h,i) => <th key={i} className={`px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide ${i > 0 && i < 4 ? 'text-right' : i === 0 ? 'text-left' : ''}`}>{h}</th>)}</tr>
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
                        <tr><td colSpan={3} className="px-3 py-2 text-sm font-bold text-slate-700 text-right">Total OC:</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(totalOrden)}</td><td></td></tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <Btn type="submit" variant="primary" fullWidth disabled={!formProveedorId || itemsOrden.length === 0}>+ Crear Orden de Compra</Btn>
          </form>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['todos','pendiente','recibida','cancelada'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${filtro === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
            {f === 'todos' ? 'Todas' : BADGE_ORDEN[f].label} ({counts[f]})
          </button>
        ))}
      </div>

      {ordenesFiltradas.length === 0 ? (
        <div className="text-center py-12 text-slate-400"><div className="text-5xl mb-3">📋</div><p className="font-medium text-slate-500">Sin órdenes registradas</p></div>
      ) : (
        <div className="space-y-2">
          {ordenesFiltradas.map((orden, i) => {
            const prov = proveedores.find(p => p.id === orden.proveedorId);
            const badge = BADGE_ORDEN[orden.estado];
            return (
              <div key={orden.id} className={`border border-slate-200 rounded-xl p-4 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">🏪 {prov?.nombre ?? '—'}</span>
                      {orden.numeroOrden && <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{orden.numeroOrden}</span>}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex gap-2 flex-wrap">
                      <span>{new Date(orden.fecha).toLocaleDateString('es-MX')}</span>
                      {orden.descripcion && <span>· {orden.descripcion}</span>}
                      <span>· {orden.partes.length} pieza{orden.partes.length !== 1 ? 's' : ''}</span>
                      <span>· Total: <strong className="text-slate-700">${fmt(orden.total)}</strong></span>
                    </div>
                    {orden.estado === 'recibida' && orden.fechaRecibida && (
                      <div className="text-xs text-emerald-600 mt-0.5">Recibida: {new Date(orden.fechaRecibida).toLocaleDateString('es-MX')}</div>
                    )}
                  </div>
                  {orden.estado === 'pendiente' && (
                    <div className="flex gap-2">
                      <Btn size="sm" variant="success" onClick={() => onRecibirOrden(orden.id)}>✓ Marcar Recibida</Btn>
                      <Btn size="sm" variant="danger" onClick={() => onCancelarOrden(orden.id)}>Cancelar</Btn>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
