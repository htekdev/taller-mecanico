'use client';

import { useState } from 'react';
import type { OrdenCompra, Proveedor, Refaccion, CompraItem, ItemCompatibilidad } from '@/app/types';
import { Label, Input, Select, Btn, SectionTitle } from '@/app/components/ui';
import { fmt, BADGE_ORDEN, formatearFecha, getHoy } from '@/app/lib/utils';

// ── Modal de edición de OC ────────────────────────────────────────────────────
function ModalEditarOrden({
  orden,
  inventario,
  onGuardar,
  onCerrar,
}: {
  orden: OrdenCompra;
  inventario: Refaccion[];
  onGuardar: (data: Pick<OrdenCompra, 'descripcion' | 'numeroOrden' | 'partes' | 'subtotalSinIVA' | 'ivaAmount' | 'total' | 'conIVA'>) => void;
  onCerrar: () => void;
}) {
  const [desc, setDesc] = useState(orden.descripcion);
  const [numOrden, setNumOrden] = useState(orden.numeroOrden ?? '');
  const [conIVA, setConIVA] = useState(orden.conIVA);
  const [items, setItems] = useState<CompraItem[]>(orden.partes ?? []);
  const [pickerRefId, setPickerRefId] = useState('');
  const [pickerCantidad, setPickerCantidad] = useState(1);
  const [pickerPrecio, setPickerPrecio] = useState(0);
  const [guardando, setGuardando] = useState(false);
  // Modo agregar: collapsed by default, expanded when user taps "+ Agregar refacción"
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  // Modo de agregar: del inventario o libre (nombre libre)
  const [modoAgregarModal, setModoAgregarModal] = useState<'existente' | 'libre'>('existente');
  // Campos para pieza libre
  const [newLibreNombre, setNewLibreNombre] = useState('');
  const [newLibreCantidad, setNewLibreCantidad] = useState(1);
  const [newLibrePrecio, setNewLibrePrecio] = useState(0);
  const [newLibreCategoria, setNewLibreCategoria] = useState('');
  const [newLibreCategoriaCustom, setNewLibreCategoriaCustom] = useState('');
  // Compatibilidad por pieza: { marca, modelo } en curso por refaccionId
  const [compatInputs, setCompatInputs] = useState<Record<string, { marca: string; modelo: string }>>({});

  const getCompat = (id: string) => compatInputs[id] ?? { marca: '', modelo: '' };
  const setCompat = (id: string, f: Partial<{ marca: string; modelo: string }>) =>
    setCompatInputs(prev => ({ ...prev, [id]: { ...getCompat(id), ...f } }));

  // Edición inline de cantidad, precio y nombre de un item existente
  const editarCantidad = (idx: number, nc: number) => {
    const n = Math.max(1, nc);
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: n, subtotal: n * it.precioCompra } : it));
  };
  const editarPrecio = (idx: number, np: number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, precioCompra: np, subtotal: it.cantidad * np } : it));
  };
  const editarNombre = (idx: number, nombre: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, nombre } : it));
  };

  const agregarItem = () => {
    const ref = inventario.find(r => r.id === pickerRefId);
    if (!ref || pickerCantidad <= 0 || pickerPrecio <= 0) return;
    const subtotal = pickerCantidad * pickerPrecio;
    setItems(prev => [...prev, {
      refaccionId: ref.id, nombre: ref.nombre, cantidad: pickerCantidad,
      precioCompra: pickerPrecio, subtotal, compatibilidad: [],
    }]);
    setPickerRefId(''); setPickerCantidad(1); setPickerPrecio(0);
  };

  const agregarLibre = () => {
    if (!newLibreNombre.trim() || newLibreCantidad <= 0 || newLibrePrecio <= 0) return;
    const tempId = `libre-${Date.now()}`;
    const categoriaLibre = newLibreCategoria === '__custom__' ? newLibreCategoriaCustom.trim() : newLibreCategoria;
    setItems(prev => [...prev, {
      refaccionId: tempId,
      nombre: newLibreNombre.trim(),
      cantidad: newLibreCantidad,
      precioCompra: newLibrePrecio,
      subtotal: newLibreCantidad * newLibrePrecio,
      compatibilidad: [],
      categoria: categoriaLibre,
    }]);
    setNewLibreNombre(''); setNewLibreCantidad(1); setNewLibrePrecio(0);
    setNewLibreCategoria(''); setNewLibreCategoriaCustom('');
  };

  const quitarItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const agregarVehiculo = (refaccionId: string) => {
    const { marca, modelo } = getCompat(refaccionId);
    if (!marca.trim()) return;
    setItems(prev => prev.map(it =>
      it.refaccionId === refaccionId
        ? { ...it, compatibilidad: [...(it.compatibilidad ?? []), { marca: marca.trim(), modelo: modelo.trim() || undefined }] }
        : it
    ));
    setCompatInputs(prev => ({ ...prev, [refaccionId]: { marca: '', modelo: '' } }));
  };

  const quitarVehiculo = (refaccionId: string, idx: number) => {
    setItems(prev => prev.map(it =>
      it.refaccionId === refaccionId
        ? { ...it, compatibilidad: (it.compatibilidad ?? []).filter((_, i) => i !== idx) }
        : it
    ));
  };

  const subtotalSinIVA = items.reduce((s, p) => s + p.subtotal, 0);
  const ivaAmount = conIVA ? Math.round(subtotalSinIVA * 0.16 * 100) / 100 : 0;
  const total = subtotalSinIVA + ivaAmount;

  const handleGuardar = () => {
    if (items.length === 0) return;  // description is optional — only parts are required
    setGuardando(true);
    onGuardar({ descripcion: desc.trim(), numeroOrden: numOrden.trim() || undefined, partes: items, subtotalSinIVA, ivaAmount, total, conIVA });
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto px-4 py-6" onClick={onCerrar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto my-auto p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">✏️ Editar Orden de Compra</h2>
            <p className="text-xs text-slate-500 mt-0.5">Edita los datos de la orden para corregir errores.</p>
          </div>
          <button type="button" onClick={onCerrar} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {/* Descripción + Número */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Descripción <span className="text-slate-400 font-normal text-xs">(opcional)</span></Label>
            <Input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej. Compra mensual de filtros" />
          </div>
          <div>
            <Label>Número de orden <span className="text-slate-400 font-normal text-xs">(opcional)</span></Label>
            <Input type="text" value={numOrden} onChange={e => setNumOrden(e.target.value)} placeholder="Ej. OC-001" />
          </div>
        </div>

        {/* IVA toggle */}
        <label className="flex items-center gap-3 cursor-pointer bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 select-none">
          <input type="checkbox" checked={conIVA} onChange={e => setConIVA(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
          <span className="text-sm font-medium text-slate-700">Factura del proveedor incluye IVA (16%)</span>
        </label>

        {/* Items actuales */}
        {items.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Piezas en la orden</p>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                  {/* Fila principal — editable inline */}
                  <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap">
                    <input type="text" value={item.nombre}
                      onChange={e => editarNombre(idx, e.target.value)}
                      className="flex-1 font-medium text-slate-800 text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400 min-w-[120px]" />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">Cant:</span>
                      <input type="number" min="1" step="1" value={item.cantidad}
                        onChange={e => editarCantidad(idx, Number(e.target.value))}
                        className="w-14 text-xs border border-slate-200 rounded px-1.5 py-1 text-right focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">$c/u:</span>
                      <input type="number" min="0.01" step="0.01" value={item.precioCompra || ''}
                        onChange={e => editarPrecio(idx, Number(e.target.value))}
                        className="w-20 text-xs border border-slate-200 rounded px-1.5 py-1 text-right focus:outline-none focus:border-indigo-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">= ${fmt(item.subtotal)}</span>
                    <button type="button" onClick={() => quitarItem(idx)} className="text-rose-500 hover:text-rose-700 font-bold text-sm ml-1 shrink-0">✕</button>
                  </div>
                  {/* Fila compatibilidad */}
                  <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
                    {/* Tags existentes */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="text-sm">🚗</span>
                      {(item.compatibilidad ?? []).length === 0 && (
                        <span className="text-xs text-slate-400 italic">Sin asignar</span>
                      )}
                      {(item.compatibilidad ?? []).map((v, vi) => (
                        <span key={vi} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          {v.marca}{v.modelo ? ` ${v.modelo}` : ''}
                          <button type="button" onClick={() => quitarVehiculo(item.refaccionId, vi)} className="text-indigo-400 hover:text-indigo-600 leading-none ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                    {/* Inputs Marca + Modelo */}
                    <div className="flex gap-2 flex-wrap items-end">
                      <div className="flex-1 min-w-[100px]">
                        <p className="text-xs text-slate-500 mb-1">Marca *</p>
                        <input type="text" placeholder="Ej. Ford" value={getCompat(item.refaccionId).marca}
                          onChange={e => setCompat(item.refaccionId, { marca: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarVehiculo(item.refaccionId); } }}
                          className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400 bg-white" />
                      </div>
                      <div className="flex-1 min-w-[100px]">
                        <p className="text-xs text-slate-500 mb-1">Modelo <span className="text-slate-400">(opcional)</span></p>
                        <input type="text" placeholder="Ej. F-150" value={getCompat(item.refaccionId).modelo}
                          onChange={e => setCompat(item.refaccionId, { modelo: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarVehiculo(item.refaccionId); } }}
                          className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400 bg-white" />
                      </div>
                      <button type="button" onClick={() => agregarVehiculo(item.refaccionId)}
                        disabled={!getCompat(item.refaccionId).marca.trim()}
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                        + Agregar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {/* Totales */}
              <div className="pt-1 text-right space-y-0.5">
                {conIVA && <>
                  <p className="text-xs text-slate-500">Subtotal (sin IVA): ${fmt(subtotalSinIVA)}</p>
                  <p className="text-xs text-amber-700">IVA (16%): +${fmt(ivaAmount)}</p>
                </>}
                <p className="text-sm font-extrabold text-slate-900">Total: ${fmt(total)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Agregar pieza — colapsable, oculto por defecto */}
        {!mostrarAgregar ? (
          <button type="button" onClick={() => setMostrarAgregar(true)}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl py-2.5 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
            ＋ Agregar refacción
          </button>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Agregar pieza</p>
              <button type="button" onClick={() => setMostrarAgregar(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-3">
              <button type="button" onClick={() => setModoAgregarModal('existente')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${modoAgregarModal === 'existente' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                📦 Del inventario
              </button>
              <button type="button" onClick={() => setModoAgregarModal('libre')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${modoAgregarModal === 'libre' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                ✨ Nueva (libre)
              </button>
            </div>

            {modoAgregarModal === 'existente' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <Label>Pieza</Label>
                    <Select value={pickerRefId} onChange={e => {
                      setPickerRefId(e.target.value);
                      const r = inventario.find(x => x.id === e.target.value);
                      if (r) setPickerPrecio(r.precioCompra);
                    }}>
                      <option value="">Seleccionar pieza...</option>
                      {inventario.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.codigo})</option>)}
                    </Select>
                  </div>
                  <div><Label>Cantidad</Label><Input type="number" min="1" step="1" value={pickerCantidad} onChange={e => setPickerCantidad(Number(e.target.value))} /></div>
                  <div><Label>Precio ($)</Label><Input type="number" min="0" step="0.01" value={pickerPrecio || ''} onChange={e => setPickerPrecio(Number(e.target.value))} /></div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Btn type="button" size="sm" variant="ghost" onClick={() => { agregarItem(); setMostrarAgregar(false); }} disabled={!pickerRefId || pickerCantidad <= 0 || pickerPrecio <= 0}>+ Agregar pieza</Btn>
                </div>
              </>
            )}

            {modoAgregarModal === 'libre' && (
              <div className="space-y-3">
                <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                  💡 Agrega una pieza con nombre libre — no necesita estar en el inventario.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Nombre de la pieza *</Label>
                    <Input type="text" placeholder="Ej. Empaque de válvula" value={newLibreNombre} onChange={e => setNewLibreNombre(e.target.value)} />
                  </div>
                  <div>
                    <Label>Cantidad</Label>
                    <Input type="number" min="1" step="1" placeholder="1" value={newLibreCantidad || ''} onChange={e => setNewLibreCantidad(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Precio compra ($)</Label>
                    <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={newLibrePrecio || ''} onChange={e => setNewLibrePrecio(Number(e.target.value))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Categoría</Label>
                    <Select value={newLibreCategoria} onChange={e => setNewLibreCategoria(e.target.value)}>
                      <option value="">Sin categoría</option>
                      {CATEGORIAS_COMUNES.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__custom__">Otra (escribir)...</option>
                    </Select>
                    {newLibreCategoria === '__custom__' && (
                      <Input
                        type="text"
                        placeholder="Ej. Dirección hidráulica"
                        value={newLibreCategoriaCustom}
                        onChange={e => setNewLibreCategoriaCustom(e.target.value)}
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Btn type="button" size="sm" variant="ghost" onClick={() => { agregarLibre(); setMostrarAgregar(false); }}
                    disabled={!newLibreNombre.trim() || newLibreCantidad <= 0 || newLibrePrecio <= 0}>
                    + Agregar pieza libre
                  </Btn>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Btn type="button" variant="ghost" fullWidth onClick={onCerrar}>Cancelar</Btn>
          <Btn type="button" variant="primary" fullWidth onClick={handleGuardar} disabled={guardando || items.length === 0}>
            {guardando ? 'Guardando...' : '✓ Guardar cambios'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

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
  onEditarOrden,
  onIrAProveedores,
  onCrearRefaccionNueva,
}: {
  ordenes: OrdenCompra[];
  proveedores: Proveedor[];
  inventario: Refaccion[];
  onCrearOrden: (data: Omit<OrdenCompra, 'id' | 'estado' | 'fechaRecibida' | 'pagos'>) => void;
  onRecibirOrden: (id: string) => void;
  onCancelarOrden: (id: string) => void;
  onEditarOrden: (ordenId: string, data: Pick<OrdenCompra, 'descripcion' | 'numeroOrden' | 'partes' | 'subtotalSinIVA' | 'ivaAmount' | 'total' | 'conIVA'>) => void;
  onIrAProveedores: () => void;
  onCrearRefaccionNueva: (data: Omit<Refaccion, 'id'>) => Promise<Refaccion | null>;
}) {
  const hoy = getHoy();

  // ── Form principal OC ─────────────────────────────────────────────────────────
  const [formProveedorId, setFormProveedorId] = useState('');
  const [formFecha, setFormFecha] = useState(hoy);
  const [formDesc, setFormDesc] = useState('');
  const [formNumOrden, setFormNumOrden] = useState('');
  const [formConIVA, setFormConIVA] = useState(false);  // ¿la factura del proveedor incluye IVA?
  const [itemsOrden, setItemsOrden] = useState<CompraItem[]>([]);
  const [filtro, setFiltro] = useState<'todos'|'pendiente'|'recibida'|'cancelada'>('todos');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [filtroProveedorId, setFiltroProveedorId] = useState('');
  const [editandoOrden, setEditandoOrden] = useState<OrdenCompra | null>(null);

  // ── Modo agregar pieza ────────────────────────────────────────────────────────
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

  // Compatibilidad por pieza: { marca, modelo } en curso por refaccionId
  const [compatInputs, setCompatInputs] = useState<Record<string, { marca: string; modelo: string }>>({});

  const getCompat = (id: string) => compatInputs[id] ?? { marca: '', modelo: '' };
  const setCompat = (id: string, f: Partial<{ marca: string; modelo: string }>) =>
    setCompatInputs(prev => ({ ...prev, [id]: { ...getCompat(id), ...f } }));

  // ── IVA calculations ──────────────────────────────────────────────────────────
  const subtotalPiezas = itemsOrden.reduce((s, i) => s + i.subtotal, 0);
  const ivaCalculado   = formConIVA ? Math.round(subtotalPiezas * 0.16 * 100) / 100 : 0;
  const totalOrden     = subtotalPiezas + ivaCalculado;
  const pickerRef      = inventario.find(r => r.id === pickerRefId);

  // ── Compatibilidad helpers ────────────────────────────────────────────────────
  const agregarVehiculo = (refaccionId: string) => {
    const { marca, modelo } = getCompat(refaccionId);
    if (!marca.trim()) return;
    setItemsOrden(prev => prev.map(it =>
      it.refaccionId === refaccionId
        ? { ...it, compatibilidad: [...(it.compatibilidad ?? []), { marca: marca.trim(), modelo: modelo.trim() || undefined }] }
        : it
    ));
    setCompatInputs(prev => ({ ...prev, [refaccionId]: { marca: '', modelo: '' } }));
  };

  const quitarVehiculo = (refaccionId: string, idx: number) => {
    setItemsOrden(prev => prev.map(it =>
      it.refaccionId === refaccionId
        ? { ...it, compatibilidad: (it.compatibilidad ?? []).filter((_, i) => i !== idx) }
        : it
    ));
  };

  // ── Agregar pieza existente ───────────────────────────────────────────────
  const agregarItem = () => {
    if (!pickerRefId || pickerCantidad <= 0 || pickerPrecio <= 0) return;
    const ref = inventario.find(r => r.id === pickerRefId);
    if (!ref) return;
    setItemsOrden(prev => {
      const ex = prev.find(i => i.refaccionId === ref.id);
      if (ex) { const nc = ex.cantidad + pickerCantidad; return prev.map(i => i.refaccionId === ref.id ? { ...i, cantidad: nc, subtotal: nc * i.precioCompra } : i); }
      return [...prev, { refaccionId: ref.id, nombre: ref.nombre, cantidad: pickerCantidad, precioCompra: pickerPrecio, subtotal: pickerCantidad * pickerPrecio, compatibilidad: [] }];
    });
    setPickerRefId(''); setPickerCantidad(1); setPickerPrecio(0);
  };

  // ── Agregar nueva refacción al catálogo + orden ───────────────────────────
  const agregarRefaccionNueva = async () => {
    if (!newNombre.trim() || newPrecio <= 0 || newCantidad <= 0) return;
    const categoriaFinal = newCategoria === '__custom__' ? newCategoriaCustom.trim() : newCategoria;
    const nuevaRef = await onCrearRefaccionNueva({
      nombre:       newNombre.trim(),
      codigo:       newCodigo.trim(),
      categoria:    categoriaFinal,
      unidad:       newUnidad || 'pza',
      precioCompra: newPrecio,
      stock:        0,          // stock arranca en 0 — sube al recibir OC
      stockMinimo:  1,
    });
    if (!nuevaRef) return;
    setItemsOrden(prev => [
      ...prev,
      {
        refaccionId:  nuevaRef.id,
        nombre:       nuevaRef.nombre,
        cantidad:     newCantidad,
        precioCompra: newPrecio,
        subtotal:     newCantidad * newPrecio,
        compatibilidad: [],
      },
    ]);
    // Limpiar form nueva refacción
    setNewNombre(''); setNewCodigo(''); setNewCategoria(''); setNewCategoriaCustom('');
    setNewUnidad('pza'); setNewPrecio(0); setNewCantidad(1);
  };

  // True when the nueva-refacción sub-form is ready to be auto-registered on submit
  const nuevaRefaccionLista = modoAgregar === 'nueva' && newNombre.trim().length > 0 && newPrecio > 0 && newCantidad > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-register nueva refacción if the sub-form is filled
    let finalItems = [...itemsOrden];
    if (nuevaRefaccionLista) {
      const categoriaFinal = newCategoria === '__custom__' ? newCategoriaCustom.trim() : newCategoria;
      const nuevaRef = await onCrearRefaccionNueva({
        nombre:       newNombre.trim(),
        codigo:       newCodigo.trim(),
        categoria:    categoriaFinal,
        unidad:       newUnidad || 'pza',
        precioCompra: newPrecio,
        stock:        0,
        stockMinimo:  1,
      });
      if (!nuevaRef) return;
      finalItems = [...finalItems, {
        refaccionId:  nuevaRef.id,
        nombre:       nuevaRef.nombre,
        cantidad:     newCantidad,
        precioCompra: newPrecio,
        subtotal:     newCantidad * newPrecio,
        compatibilidad: [],
      }];
      setNewNombre(''); setNewCodigo(''); setNewCategoria(''); setNewCategoriaCustom('');
      setNewUnidad('pza'); setNewPrecio(0); setNewCantidad(1);
    }
    if (!formProveedorId || finalItems.length === 0) return;
    const piezasSubtotal = finalItems.reduce((s, i) => s + i.subtotal, 0);
    const ivaAmt = formConIVA ? Math.round(piezasSubtotal * 0.16 * 100) / 100 : 0;
    onCrearOrden({
      proveedorId: formProveedorId,
      fecha: formFecha,
      descripcion: formDesc,
      partes: finalItems,
      subtotalSinIVA: piezasSubtotal,
      ivaAmount: ivaAmt,
      total: piezasSubtotal + ivaAmt,
      conIVA: formConIVA,
      numeroOrden: formNumOrden || undefined,
    });
    setFormProveedorId(''); setFormFecha(hoy); setFormDesc(''); setFormNumOrden(''); setFormConIVA(false); setItemsOrden([]);
  };

  const ordenesFiltradas = [...ordenes]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(o => {
      if (filtroProveedorId && o.proveedorId !== filtroProveedorId) return false;
      if (filtro !== 'todos' && o.estado !== filtro) return false;
      return true;
    });

  const counts = { todos: ordenes.length, pendiente: ordenes.filter(o => o.estado === 'pendiente').length, recibida: ordenes.filter(o => o.estado === 'recibida').length, cancelada: ordenes.filter(o => o.estado === 'cancelada').length };
  const pendientesRecibir = counts.pendiente;

  return (
    <div>
      <SectionTitle title="Órdenes de Compra" subtitle="Crea una OC para un proveedor. Al marcarla como 'recibida', el inventario se actualiza y pasa a Cuentas por Pagar." />

      {/* ── Modal de edición de OC ── */}
      {editandoOrden && (
        <ModalEditarOrden
          orden={editandoOrden}
          inventario={inventario}
          onGuardar={(data) => { onEditarOrden(editandoOrden.id, data); setEditandoOrden(null); }}
          onCerrar={() => setEditandoOrden(null)}
        />
      )}

      {pendientesRecibir > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-5 flex items-center gap-3 text-sm">
          <span className="text-amber-600 font-semibold">⚠️ {pendientesRecibir} orden{pendientesRecibir !== 1 ? 'es' : ''} pendiente{pendientesRecibir !== 1 ? 's' : ''} de recibir</span>
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
                  <div className="space-y-2 mt-1">
                    {itemsOrden.map(it => (
                      <div key={it.refaccionId} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                        {/* Fila principal */}
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <span className="flex-1 font-medium text-slate-800 text-sm truncate">{it.nombre}</span>
                          <span className="text-xs text-slate-500 whitespace-nowrap">×{it.cantidad}</span>
                          <span className="text-xs text-slate-400 whitespace-nowrap">${fmt(it.precioCompra)}</span>
                          <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">${fmt(it.subtotal)}</span>
                          <button type="button" onClick={() => setItemsOrden(prev => prev.filter(i => i.refaccionId !== it.refaccionId))} className="text-rose-400 hover:text-rose-600 font-bold text-sm ml-1 shrink-0">✕</button>
                        </div>
                        {/* Fila compatibilidad — siempre visible */}
                        <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
                          {/* Tags */}
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className="text-sm">🚗</span>
                            {(it.compatibilidad ?? []).length === 0 && (
                              <span className="text-xs text-slate-400 italic">Sin asignar</span>
                            )}
                            {(it.compatibilidad ?? []).map((v, vi) => (
                              <span key={vi} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                {v.marca}{v.modelo ? ` ${v.modelo}` : ''}
                                <button type="button" onClick={() => quitarVehiculo(it.refaccionId, vi)} className="text-indigo-400 hover:text-indigo-600 leading-none ml-0.5">×</button>
                              </span>
                            ))}
                          </div>
                          {/* Inputs Marca + Modelo */}
                          <div className="flex gap-2 flex-wrap items-end">
                            <div className="flex-1 min-w-[90px]">
                              <p className="text-xs text-slate-500 mb-1">Marca *</p>
                              <input type="text" placeholder="Ej. Ford" value={getCompat(it.refaccionId).marca}
                                onChange={e => setCompat(it.refaccionId, { marca: e.target.value })}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarVehiculo(it.refaccionId); } }}
                                className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400 bg-white" />
                            </div>
                            <div className="flex-1 min-w-[90px]">
                              <p className="text-xs text-slate-500 mb-1">Modelo <span className="text-slate-400">(opcional)</span></p>
                              <input type="text" placeholder="Ej. F-150" value={getCompat(it.refaccionId).modelo}
                                onChange={e => setCompat(it.refaccionId, { modelo: e.target.value })}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarVehiculo(it.refaccionId); } }}
                                className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400 bg-white" />
                            </div>
                            <button type="button" onClick={() => agregarVehiculo(it.refaccionId)}
                              disabled={!getCompat(it.refaccionId).marca.trim()}
                              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                              + Agregar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Totales */}
                    <div className="pt-1 text-right space-y-0.5">
                      {formConIVA && (
                        <>
                          <p className="text-xs text-slate-500">Subtotal (sin IVA): ${fmt(subtotalPiezas)}</p>
                          <p className="text-xs text-amber-700">IVA (16%): +${fmt(ivaCalculado)}</p>
                        </>
                      )}
                      <p className="text-sm font-extrabold text-slate-900">Total OC: ${fmt(totalOrden)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* IVA Toggle */}
            <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${formConIVA ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <p className="text-sm font-semibold text-slate-800">¿La factura del proveedor incluye IVA?</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formConIVA
                    ? `Sí — se agregará IVA (16%): $${fmt(ivaCalculado)} → Total: $${fmt(totalOrden)}`
                    : 'No — el total no incluye IVA (precio de contado sin factura fiscal)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormConIVA(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formConIVA ? 'bg-amber-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formConIVA ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {/* Hints de validación */}
            {!formProveedorId && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Selecciona un proveedor para continuar.</p>
            )}
            {formProveedorId && itemsOrden.length === 0 && !nuevaRefaccionLista && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Agrega al menos una pieza a la orden.</p>
            )}
            <Btn type="submit" variant="primary" fullWidth
              disabled={!formProveedorId || (itemsOrden.length === 0 && !nuevaRefaccionLista)}>
              {nuevaRefaccionLista ? '+ Registrar pieza y crear orden' : '+ Crear Orden de Compra'}
            </Btn>
          </form>
        )}
      </div>

      {/* Filtros */}
      <div className="mb-4 space-y-3">
        <div className="max-w-xs">
          <Label>Proveedor</Label>
          <Select value={filtroProveedorId} onChange={e => setFiltroProveedorId(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'todos',     label: 'Todos' },
            { key: 'pendiente', label: 'Pendientes de recibir' },
            { key: 'recibida',  label: 'Recibidas' },
            { key: 'cancelada', label: 'Canceladas' },
          ] as const).map(({ key, label }) => (
            <Btn
              key={key}
              size="sm"
              variant={filtro === key ? 'primary' : 'ghost'}
              onClick={() => setFiltro(key)}
            >
              {label} ({counts[key]})
            </Btn>
          ))}
        </div>
      </div>

      {ordenesFiltradas.length === 0 ? (
        <div className="text-center py-12 text-slate-400"><div className="text-5xl mb-3">📋</div><p className="font-medium text-slate-500">No se encontraron resultados.</p></div>
      ) : (
        <div className="space-y-2">
          {ordenesFiltradas.map((orden, i) => {
            const prov = proveedores.find(p => p.id === orden.proveedorId);
            const badge = BADGE_ORDEN[orden.estado];
            const isExpandida = expandido === orden.id;
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
                      <span>{formatearFecha(orden.fecha)}</span>
                      {orden.descripcion && <span>· {orden.descripcion}</span>}
                      <span>· {orden.partes.length} pieza{orden.partes.length !== 1 ? 's' : ''}</span>
                      {orden.conIVA ? (
                        <span>· <strong className="text-slate-700">${fmt(orden.subtotalSinIVA)}</strong> + IVA <span className="text-amber-600">($${fmt(orden.ivaAmount)})</span> = <strong className="text-slate-900">${fmt(orden.total)}</strong></span>
                      ) : (
                        <span>· Total: <strong className="text-slate-700">${fmt(orden.total)}</strong></span>
                      )}
                      {orden.conIVA && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">IVA incluido</span>}
                    </div>
                    {orden.estado === 'recibida' && orden.fechaRecibida && (
                      <div className="text-xs text-emerald-600 mt-0.5">Recibida: {formatearFecha(orden.fechaRecibida)}</div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Btn size="sm" variant="ghost" onClick={() => setExpandido(isExpandida ? null : orden.id)}>
                      {isExpandida ? '▲ Ocultar' : '▼ Ver piezas'}
                    </Btn>
                    {orden.estado === 'pendiente' && (
                      <>
                        <Btn size="sm" variant="ghost" onClick={() => setEditandoOrden(orden)}>✏️ Editar</Btn>
                        <Btn size="sm" variant="success" onClick={() => onRecibirOrden(orden.id)}>✓ Marcar Recibida</Btn>
                        <Btn size="sm" variant="danger" onClick={() => onCancelarOrden(orden.id)}>Cancelar</Btn>
                      </>
                    )}
                    {orden.estado === 'recibida' && (
                      <Btn size="sm" variant="ghost" onClick={() => setEditandoOrden(orden)}>✏️ Corregir orden</Btn>
                    )}
                  </div>
                </div>
                {isExpandida && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Piezas en esta orden</p>
                    <div className="space-y-2">
                      {(orden.partes ?? []).map((it, index) => (
                        <div key={`${orden.id}-${index}`} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                          {/* Fila principal */}
                          <div className="flex justify-between items-center px-3 py-2.5">
                            <span className="text-slate-700 font-medium text-sm">{it.nombre} × {it.cantidad}</span>
                            <span className="font-semibold text-slate-800">${fmt(it.subtotal ?? 0)}</span>
                          </div>
                          {/* Fila compatibilidad — siempre visible (read-only) */}
                          <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 flex items-center gap-2 flex-wrap">
                            <span className="text-sm">🚗</span>
                            {(it.compatibilidad ?? []).length === 0 ? (
                              <span className="text-xs text-slate-400 italic">Sin asignar</span>
                            ) : (
                              (it.compatibilidad ?? []).map((v, vi) => {
                                const label = typeof v === 'string' ? v : `${v.marca}${v.modelo ? ` ${v.modelo}` : ''}`;
                                return <span key={vi} className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">{label}</span>;
                              })
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
                      {orden.conIVA && (
                        <>
                          <div className="flex justify-end text-xs text-slate-500">
                            <span>Subtotal piezas: ${fmt(orden.subtotalSinIVA)}</span>
                          </div>
                          <div className="flex justify-end text-xs text-amber-700">
                            <span>IVA (16%): +${fmt(orden.ivaAmount)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-end">
                        <span className="text-sm font-bold text-slate-700">Total: ${fmt(orden.total)}</span>
                      </div>
                    </div>
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
