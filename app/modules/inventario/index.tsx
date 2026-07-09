'use client';

import { useState } from 'react';
import type { Refaccion, Cliente, Vehiculo, Proveedor, CompatibilidadVehiculo } from '@/app/types';
import { Label, Input, Select, Btn, SectionTitle } from '@/app/components/ui';
import { CATEGORIAS, UNIDADES, labelVehiculo, fmt } from '@/app/lib/utils';

export function VistaInventario({
  inventario,
  clientes,
  vehiculos,
  proveedores,
  onGuardarRefaccion,
  onRecibirStock,
  onActualizarCompatibilidad,
  onEliminarRefaccion,
  onGuardarProveedor,
}: {
  inventario: Refaccion[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  proveedores: Proveedor[];
  onGuardarRefaccion: (r: Omit<Refaccion, 'id'>) => Promise<void>;
  onRecibirStock: (id: string, cantidad: number) => void;
  onActualizarCompatibilidad: (id: string, compatibilidad: CompatibilidadVehiculo[]) => void;
  onEliminarRefaccion: (id: string) => Promise<void>;
  onGuardarProveedor: (data: Omit<Proveedor, 'id'>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    nombre: '', codigo: '', categoria: 'Filtros', unidad: 'pza',
    precioCompra: 0, stock: 0, stockMinimo: 1, vehiculoId: '', proveedorId: '',
  });
  const [formCategoriaCustom, setFormCategoriaCustom] = useState('');
  const [formClienteId, setFormClienteId] = useState('');
  const [compatibilidad, setCompatibilidad] = useState<CompatibilidadVehiculo[]>([]);
  const [modeloInputs, setModeloInputs] = useState<Record<number, string>>({});
  const [expandido, setExpandido] = useState<string | null>(null);
  const [recibirCantidad, setRecibirCantidad] = useState<Record<string, number>>({});
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [guardandoForm, setGuardandoForm] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  // ── Estado para eliminar pieza ──
  const [confirmandoEliminar, setConfirmandoEliminar] = useState<string | null>(null);
  const [eliminandoPieza, setEliminandoPieza]         = useState<string | null>(null);
  const [errorEliminar, setErrorEliminar]             = useState<string | null>(null);

  // ── Estado para agregar proveedor inline ──
  const [mostrarFormProveedor, setMostrarFormProveedor] = useState(false);
  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState('');
  const [nuevoProveedorTel, setNuevoProveedorTel]       = useState('');
  const [guardandoProveedor, setGuardandoProveedor]     = useState(false);
  const [errorProveedor, setErrorProveedor]             = useState<string | null>(null);

  // ── Estado para edición de compatibilidad de piezas existentes ──
  // Modelo plano: cada entrada es un par (marca, modelo)
  const [editandoCompat, setEditandoCompat] = useState<string | null>(null);
  const [pares, setPares]                   = useState<{ marca: string; modelo: string }[]>([]);
  const [nuevoMarca, setNuevoMarca]         = useState('');
  const [nuevoModelo, setNuevoModelo]       = useState('');
  const [savedId, setSavedId]               = useState<string | null>(null);

  const vehiculosDelCliente = vehiculos.filter(v => v.clienteId === formClienteId);

  const addCompatMarca = () =>
    setCompatibilidad(prev => [...prev, { marca: '', modelos: [] }]);
  const removeCompatMarca = (i: number) => {
    setCompatibilidad(prev => prev.filter((_, idx) => idx !== i));
    setModeloInputs(prev => { const n = { ...prev }; delete n[i]; return n; });
  };
  const updateCompatMarca = (i: number, marca: string) =>
    setCompatibilidad(prev => prev.map((g, idx) => idx === i ? { ...g, marca } : g));
  const addCompatModelo = (i: number) => {
    const m = (modeloInputs[i] ?? '').trim();
    if (!m) return;
    setCompatibilidad(prev => prev.map((g, idx) =>
      idx === i ? { ...g, modelos: g.modelos.includes(m) ? g.modelos : [...g.modelos, m] } : g
    ));
    setModeloInputs(prev => ({ ...prev, [i]: '' }));
  };
  const removeCompatModelo = (i: number, modelo: string) =>
    setCompatibilidad(prev => prev.map((g, idx) =>
      idx === i ? { ...g, modelos: g.modelos.filter(m => m !== modelo) } : g
    ));

  // ── Helpers para edición de compatibilidad (modelo plano de pares) ──
  const abrirEditCompat = (r: Refaccion) => {
    // Convertir CompatibilidadVehiculo[] → lista plana de pares
    const parFlat: { marca: string; modelo: string }[] = [];
    for (const c of (r.compatibilidad ?? [])) {
      if (c.modelos.length === 0) {
        parFlat.push({ marca: c.marca, modelo: '' });
      } else {
        for (const m of c.modelos) parFlat.push({ marca: c.marca, modelo: m });
      }
    }
    setPares(parFlat);
    setNuevoMarca('');
    setNuevoModelo('');
    setEditandoCompat(r.id);
    setExpandido(null);
  };
  const agregarPar = () => {
    if (!nuevoMarca.trim()) return;
    setPares(prev => [...prev, { marca: nuevoMarca.trim(), modelo: nuevoModelo.trim() }]);
    setNuevoMarca('');
    setNuevoModelo('');
  };
  const removePar = (i: number) => setPares(prev => prev.filter((_, idx) => idx !== i));
  const guardarCompatEdit = (id: string) => {
    let paresFinales = [...pares];
    if (nuevoMarca.trim()) {
      paresFinales = [...paresFinales, { marca: nuevoMarca.trim(), modelo: nuevoModelo.trim() }];
    }

    const grouped: Record<string, string[]> = {};
    for (const p of paresFinales.filter(p => p.marca.trim())) {
      const mk = p.marca.trim();
      if (!grouped[mk]) grouped[mk] = [];
      const md = p.modelo.trim();
      if (md && !grouped[mk].includes(md)) grouped[mk].push(md);
    }
    const compat = Object.entries(grouped).map(([marca, modelos]) => ({ marca, modelos }));
    onActualizarCompatibilidad(id, compat);
    setEditandoCompat(null);
    setPares([]);
    setNuevoMarca('');
    setNuevoModelo('');
    setSavedId(id);
    setTimeout(() => setSavedId(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || form.precioCompra <= 0) return;
    const compatFinal = compatibilidad.filter(c => c.marca.trim());
    // Resolve custom category
    const categoriaFinal = form.categoria === '__custom__' ? formCategoriaCustom.trim() : form.categoria;
    setGuardandoForm(true);
    setErrorGuardado(null);
    try {
      await onGuardarRefaccion({ ...form, categoria: categoriaFinal, compatibilidad: compatFinal.length > 0 ? compatFinal : undefined });
      // only reset AFTER successful save
      setForm({ nombre: '', codigo: '', categoria: 'Filtros', unidad: 'pza', precioCompra: 0, stock: 0, stockMinimo: 1, vehiculoId: '', proveedorId: '' });
      setFormCategoriaCustom('');
      setFormClienteId('');
      setCompatibilidad([]);
      setModeloInputs({});
    } catch {
      setErrorGuardado('No se pudo guardar la refacción. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setGuardandoForm(false);
    }
  };

  const handleClienteChange = (clienteId: string) => {
    setFormClienteId(clienteId);
    setForm(f => ({ ...f, vehiculoId: '' }));  // reset vehicle when client changes
  };

  const handleRecibir = (id: string) => {
    const cant = recibirCantidad[id] ?? 0;
    if (cant > 0) {
      onRecibirStock(id, cant);
      setRecibirCantidad(prev => ({ ...prev, [id]: 0 }));
      setExpandido(null);
    }
  };

  const handleEliminar = async (id: string) => {
    setEliminandoPieza(id);
    setErrorEliminar(null);
    try {
      await onEliminarRefaccion(id);
      setConfirmandoEliminar(null);
    } catch (err) {
      setErrorEliminar(err instanceof Error ? err.message : 'No se pudo eliminar la pieza');
    } finally {
      setEliminandoPieza(null);
    }
  };

  // doGuardarProveedor — core save logic, callable from button click OR form submit (Enter)
  const doGuardarProveedor = async () => {
    if (!nuevoProveedorNombre.trim()) return;
    setGuardandoProveedor(true);
    setErrorProveedor(null);
    try {
      await onGuardarProveedor({ nombre: nuevoProveedorNombre.trim(), telefono: nuevoProveedorTel.trim() });
      setNuevoProveedorNombre('');
      setNuevoProveedorTel('');
      setMostrarFormProveedor(false);
    } catch (err) {
      setErrorProveedor(err instanceof Error ? err.message : 'No se pudo guardar el proveedor');
    } finally {
      setGuardandoProveedor(false);
    }
  };

  // handleGuardarProveedor — form onSubmit (Enter key in input)
  const handleGuardarProveedor = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    doGuardarProveedor();
  }

  const stockStatus = (r: Refaccion) => {
    if (r.stock <= 0)             return { label: 'Sin stock',           cls: 'bg-rose-100 text-rose-700' };
    if (r.stock <= r.stockMinimo) return { label: `Stock bajo (${r.stock})`, cls: 'bg-amber-100 text-amber-700' };
    return { label: `${r.stock} ${r.unidad}`, cls: 'bg-emerald-100 text-emerald-700' };
  };

  // Resolve vehiculo label for display in table
  const vehiculoLabel = (vehiculoId?: string) => {
    if (!vehiculoId) return null;
    const v = vehiculos.find(x => x.id === vehiculoId);
    if (!v) return null;
    const c = clientes.find(x => x.id === v.clienteId);
    return `${c?.nombre ?? '?'} · ${[v.anio, v.marca, v.modelo].filter(Boolean).join(' ')}`;
  };
  const proveedorNombre = (proveedorId?: string) =>
    proveedores.find(p => p.id === proveedorId)?.nombre ?? null;

  const inventarioFiltrado = [...inventario]
    .filter(r => {
      if (filtroProveedor && r.proveedorId !== filtroProveedor) return false;
      if (filtroCategoria && r.categoria !== filtroCategoria) return false;
      return true;
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  // ── Dynamic category list: CATEGORIAS base + any custom categories in inventory ──
  const categoriasInventario = Array.from(
    new Set([...CATEGORIAS, ...inventario.map(r => r.categoria).filter(Boolean)])
  ).sort((a, b) => a.localeCompare(b, 'es'));

  return (
    <div>
      <SectionTitle
        title="Inventario de Refacciones"
        subtitle="Registra las piezas en stock. Puedes vincular una pieza a una unidad específica si fue comprada para esa reparación."
      />

      {/* ── Formulario nueva refacción ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Agregar Refacción al Inventario</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre + Código + Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Label>Nombre de la refacción *</Label>
              <Input type="text" placeholder="Ej. Filtro de aceite Fram PH3614"
                value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
            </div>
            <div>
              <Label>Código / SKU</Label>
              <Input type="text" placeholder="Ej. FRAM-PH3614" value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} className="font-mono" />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                <option value="__custom__">Otra (escribir)...</option>
              </Select>
              {form.categoria === '__custom__' && (
                <Input
                  type="text"
                  placeholder="Ej. Dirección hidráulica"
                  value={formCategoriaCustom}
                  onChange={e => setFormCategoriaCustom(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
          </div>

          {/* Unidad + Precio + Stock + Stock mínimo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label>Unidad</Label>
              <Select value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </Select>
            </div>
            <div>
              <Label>Precio de compra ($) *</Label>
              <Input type="number" placeholder="0.00" min="0.01" step="0.01"
                value={form.precioCompra || ''}
                onChange={e => setForm(f => ({ ...f, precioCompra: Number(e.target.value) }))} required />
            </div>
            <div>
              <Label>Stock inicial</Label>
              <Input type="number" placeholder="0" min="0" step="1"
                value={form.stock || ''}
                onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Stock mínimo</Label>
              <Input type="number" placeholder="1" min="0" step="1"
                value={form.stockMinimo || ''}
                onChange={e => setForm(f => ({ ...f, stockMinimo: Number(e.target.value) }))} />
            </div>
          </div>

          {/* ── Vincular a unidad (opcional) ── */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              🎯 Vincular a una unidad específica <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Si compraste esta pieza específicamente para la reparación de una unidad, selecciónala aquí.
              Aparecerá destacada cuando registres un trabajo para esa unidad.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Cliente</Label>
                <Select value={formClienteId} onChange={e => handleClienteChange(e.target.value)}>
                  <option value="">Sin vincular (stock general)</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </Select>
              </div>
              <div>
                <Label>Unidad del cliente</Label>
                <Select
                  value={form.vehiculoId}
                  onChange={e => setForm(f => ({ ...f, vehiculoId: e.target.value }))}
                  disabled={!formClienteId || vehiculosDelCliente.length === 0}
                >
                  <option value="">Seleccionar unidad...</option>
                  {vehiculosDelCliente.map(v => (
                    <option key={v.id} value={v.id}>{labelVehiculo(v)}</option>
                  ))}
                </Select>
                {formClienteId && vehiculosDelCliente.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Este cliente no tiene unidades registradas.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Proveedor (opcional) ── */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">🏪 Proveedor habitual <span className="font-normal normal-case text-slate-400">(opcional)</span></p>
              </div>
              <Btn size="sm" variant="ghost" type="button" onClick={() => setMostrarFormProveedor(v => !v)}
                className="whitespace-nowrap">
                {mostrarFormProveedor ? '✕ Cancelar' : '+ Nuevo proveedor'}
              </Btn>
            </div>

            {mostrarFormProveedor && (
              <form onSubmit={handleGuardarProveedor} className="bg-slate-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Agregar nuevo proveedor:</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input type="text" placeholder="Nombre del proveedor *"
                    aria-label="Nombre del proveedor"
                    value={nuevoProveedorNombre}
                    onChange={e => setNuevoProveedorNombre(e.target.value)}
                    className="w-full sm:flex-1" required />
                  <Input type="tel" inputMode="tel" placeholder="Teléfono"
                    aria-label="Teléfono del proveedor"
                    value={nuevoProveedorTel}
                    onChange={e => setNuevoProveedorTel(e.target.value)}
                    className="w-full sm:flex-1" />
                  <Btn type="button" size="sm" variant="primary" disabled={guardandoProveedor || !nuevoProveedorNombre.trim()}
                    onClick={doGuardarProveedor} className="whitespace-nowrap">
                    {guardandoProveedor ? '⏳' : '✓ Guardar'}
                  </Btn>
                </div>
                {errorProveedor && (
                  <p className="text-xs text-rose-600 mt-1">⚠️ {errorProveedor}</p>
                )}
              </form>
            )}

            {proveedores.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay proveedores registrados. Usa &quot;+ Nuevo proveedor&quot; para agregar uno.</p>
            ) : (
              <Select value={form.proveedorId} onChange={e => setForm(f => ({ ...f, proveedorId: e.target.value }))}>
                <option value="">Sin proveedor asignado</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            )}
          </div>

          {/* ── Compatibilidad de vehículos ── */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">🚗 Compatibilidad de Vehículos</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {compatibilidad.length === 0
                    ? 'Sin restricciones — aparecerá para cualquier vehículo (universal)'
                     : `${compatibilidad.filter(c => c.marca.trim()).length} marca(s) configurada(s)`}
                </p>
              </div>
              <Btn size="sm" variant="ghost" onClick={addCompatMarca} type="button">+ Agregar marca</Btn>
            </div>

            {compatibilidad.map((grupo, gi) => (
              <div key={gi} className="bg-slate-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input type="text" placeholder="Marca (ej. Ford, Isuzu, VW...)"
                      value={grupo.marca}
                      onChange={e => updateCompatMarca(gi, e.target.value)} />
                  </div>
                  <Btn size="sm" variant="danger" type="button" onClick={() => removeCompatMarca(gi)}>✕</Btn>
                </div>
                {grupo.marca && (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {grupo.modelos.map(m => (
                        <span key={m} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {m}
                          <button type="button" onClick={() => removeCompatModelo(gi, m)} className="hover:text-rose-600">×</button>
                        </span>
                      ))}
                      {grupo.modelos.length === 0 && (
                        <span className="text-xs text-slate-400 italic">Sin modelos específicos — aplica a todos los {grupo.marca || '...'}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input type="text" placeholder="Modelo (ej. F-150, 300...)"
                        value={modeloInputs[gi] ?? ''}
                        onChange={e => setModeloInputs(prev => ({ ...prev, [gi]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompatModelo(gi); } }}
                        className="flex-1" />
                      <Btn size="sm" variant="primary" type="button"
                        disabled={!(modeloInputs[gi] ?? '').trim()}
                        onClick={() => addCompatModelo(gi)}>+ Modelo</Btn>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {errorGuardado && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              ⚠️ {errorGuardado}
            </div>
          )}

          <Btn type="submit" variant="primary" disabled={guardandoForm || !form.nombre || form.precioCompra <= 0}>
            {guardandoForm ? '⏳ Guardando...' : '+ Agregar al Inventario'}
          </Btn>
        </form>
      </div>

      {/* ── Lista de refacciones ── */}
      {inventario.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">📦</div>
          <p className="font-medium text-slate-500">Inventario vacío</p>
          <p className="text-sm mt-1">Agrega las piezas que tienes en stock arriba.</p>
        </div>
      ) : (
        <div>
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="min-w-40">
              <Select value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)}>
                <option value="">Todos los proveedores</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            </div>
            <div className="min-w-40">
              <Select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
                <option value="">Todas las categorías</option>
                {categoriasInventario.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            {(filtroProveedor || filtroCategoria) && (
              <button
                type="button"
                onClick={() => { setFiltroProveedor(''); setFiltroCategoria(''); }}
                className="text-xs text-slate-500 hover:text-rose-600 font-medium"
              >
                ✕ Limpiar filtros
              </button>
            )}
          </div>
          {(() => {
          return (
          <>
          {inventarioFiltrado.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="font-medium">No se encontraron resultados.</p>
            </div>
          ) : (
          <div>
          <h3 className="text-base font-bold text-slate-700 mb-3">
            Piezas en Inventario
            <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{inventarioFiltrado.length}</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  {['Código','Nombre / Unidad vinculada','Categoría','Proveedor','Precio Compra','Stock','Acciones'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i >= 4 ? 'text-right' : 'text-left'} ${i === 6 ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
               {inventarioFiltrado.map((r, i) => {
                  const status      = stockStatus(r);
                  const isExp       = expandido === r.id;
                  const isEditCompat = editandoCompat === r.id;
                  const vLabel      = vehiculoLabel(r.vehiculoId);
                  return (
                    <>
                      <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{r.codigo || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{r.nombre}</div>
                          {vLabel && (
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">
                                🎯 {vLabel}
                              </span>
                            </div>
                          )}
                          {r.compatibilidad && r.compatibilidad.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {r.compatibilidad.map((c, ci) => (
                                <span key={ci} className="text-xs bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full border border-emerald-200">
                                  🚗 {c.marca}: {c.modelos.join(', ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded-full">{r.categoria}</span>
                        </td>
                        <td className="px-4 py-3">
                          {proveedorNombre(r.proveedorId) ? (
                            <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                              🏪 {proveedorNombre(r.proveedorId)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sin proveedor</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">${fmt(r.precioCompra)} / {r.unidad}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                            <div className="flex flex-col gap-1 items-center">
                              <Btn size="sm" variant={isExp ? 'ghost' : 'success'}
                                onClick={() => { setExpandido(isExp ? null : r.id); setEditandoCompat(null); }}>
                                {isExp ? '✕ Cerrar' : '+ Existencias'}
                              </Btn>
                              <Btn size="sm" variant={isEditCompat ? 'ghost' : 'primary'}
                                onClick={() => isEditCompat ? setEditandoCompat(null) : abrirEditCompat(r)}>
                                {isEditCompat ? '✕ Cerrar' : '🚗 Compatibilidad'}
                              </Btn>
                              {confirmandoEliminar === r.id ? (
                                <div className="flex flex-col gap-1 mt-0.5 items-center">
                                  <div className="flex gap-1">
                                    <Btn size="sm" variant="danger"
                                      disabled={eliminandoPieza === r.id}
                                      onClick={() => handleEliminar(r.id)}>
                                      {eliminandoPieza === r.id ? '⏳' : '✓ Confirmar'}
                                    </Btn>
                                    <Btn size="sm" variant="ghost" onClick={() => { setConfirmandoEliminar(null); setErrorEliminar(null); }}>
                                     Cancelar
                                    </Btn>
                                  </div>
                                  {errorEliminar && (
                                    <p className="text-xs text-rose-600 max-w-[120px] text-center">⚠️ {errorEliminar}</p>
                                  )}
                                </div>
                              ) : (
                                <Btn size="sm" variant="danger"
                                  onClick={() => { setConfirmandoEliminar(r.id); setErrorEliminar(null); }}>
                                  🗑 Eliminar
                                </Btn>
                              )}
                            </div>
                          </td>
                        </tr>
                      {isExp && (
                        <tr key={`${r.id}-recibir`} className="bg-emerald-50 border-t border-emerald-200">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-sm font-semibold text-emerald-800">Recibir existencias de <em>{r.nombre}</em>:</span>
                              <div className="flex items-center gap-2">
                                <Input type="number" placeholder="Cantidad" min="1" step="1"
                                  value={recibirCantidad[r.id] || ''}
                                  onChange={e => setRecibirCantidad(prev => ({ ...prev, [r.id]: Number(e.target.value) }))}
                                  className="w-28" />
                                <span className="text-sm text-emerald-700 font-medium">{r.unidad}</span>
                                <Btn size="sm" variant="success"
                                  disabled={!recibirCantidad[r.id] || recibirCantidad[r.id] <= 0}
                                  onClick={() => handleRecibir(r.id)}>
                                  ✓ Confirmar
                                </Btn>
                              </div>
                              <span className="text-xs text-emerald-600">Stock actual: {r.stock} {r.unidad}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {isEditCompat && (
                        <tr key={`${r.id}-compat`} className="bg-indigo-50 border-t border-indigo-200">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="space-y-3">
                              {/* Título */}
                              <div>
                                <span className="text-sm font-semibold text-indigo-800">
                                  🚗 Compatibilidad — <em>{r.nombre}</em>
                                </span>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Agrega los vehículos que son compatibles con esta pieza.
                                  Puedes agregar varios.
                                </p>
                              </div>

                              {/* Fila de captura: Marca + Modelo + Agregar */}
                              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                                <Input type="text" placeholder="Marca (ej. Kenworth, Ford...)"
                                  value={nuevoMarca}
                                  onChange={e => setNuevoMarca(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarPar(); } }}
                                  className="flex-1 min-w-0" />
                                <Input type="text" placeholder="Modelo (ej. T680, F-150...)"
                                  value={nuevoModelo}
                                  onChange={e => setNuevoModelo(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarPar(); } }}
                                  className="flex-1 min-w-0" />
                                <Btn size="sm" variant="primary" type="button"
                                  disabled={!nuevoMarca.trim()}
                                  onClick={agregarPar}>
                                  + Agregar
                                </Btn>
                              </div>

                              {/* Lista de pares agregados */}
                              {pares.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">
                                  Sin compatibilidad — aplica a cualquier vehículo. Agrega una marca arriba.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {pares.map((p, pi) => (
                                    <span key={pi} className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full">
                                      🚗 {p.marca}{p.modelo ? ` — ${p.modelo}` : ''}
                                      <button type="button" onClick={() => removePar(pi)}
                                        className="text-indigo-400 hover:text-rose-600 font-bold leading-none">×</button>
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Botones guardar / cancelar */}
                              <div className="flex items-center gap-2 pt-1 flex-wrap">
                                <Btn size="sm" variant="primary" type="button"
                                  onClick={() => guardarCompatEdit(r.id)}>
                                  ✓ Guardar compatibilidad
                                </Btn>
                                <Btn size="sm" variant="ghost" type="button"
                                  onClick={() => setEditandoCompat(null)}>
                                  Cancelar
                                </Btn>
                                {savedId === r.id && (
                                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                    ✓ ¡Guardado!
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
          )}
          </>
          );
          })()}
        </div>
      )}
    </div>
  );
}
