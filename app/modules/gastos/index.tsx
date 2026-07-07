'use client';

import { useState } from 'react';
import type { Gasto, GastoCategoria } from '@/app/types';
import { GASTO_CATEGORIAS, GASTO_SUBCATEGORIAS } from '@/app/types';
import { Btn, Input, Label, Select, SectionTitle } from '@/app/components/ui';
import { fmt, formatearFecha, getHoy } from '@/app/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type FiltroCat = 'todos' | GastoCategoria;

interface GastoFormData {
  categoria: GastoCategoria;
  subcategoria: string;
  concepto: string;
  monto: string;
  fecha: string;
  notas: string;
}

const emptyForm = (fecha: string): GastoFormData => ({
  categoria: 'operativo',
  subcategoria: GASTO_SUBCATEGORIAS.operativo[0],
  concepto: '',
  monto: '',
  fecha,
  notas: '',
});

// Helper: detect if a subcategoria value is a custom "otros" entry
const esPredefinida = (cat: GastoCategoria, sub: string) =>
  GASTO_SUBCATEGORIAS[cat].includes(sub);

// ─── Gasto Form ───────────────────────────────────────────────────────────────

function GastoForm({
  initial,
  onGuardar,
  onCancelar,
  customPersonalSubs = [],
  onNuevaPersonalSub,
}: {
  initial: GastoFormData;
  onGuardar: (data: GastoFormData) => Promise<void>;
  onCancelar: () => void;
  customPersonalSubs?: string[];
  onNuevaPersonalSub?: (sub: string) => void;
}) {
  const [form, setForm] = useState<GastoFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Track whether "Otros" is selected so we can show a free-text input
  const [otroSubcat, setOtroSubcat] = useState(() => {
    const predefined = GASTO_SUBCATEGORIAS[initial.categoria];
    return !predefined.includes(initial.subcategoria) && initial.subcategoria !== '';
  });
  const [otroSubcatTexto, setOtroSubcatTexto] = useState(() => {
    const predefined = GASTO_SUBCATEGORIAS[initial.categoria];
    return !predefined.includes(initial.subcategoria) ? initial.subcategoria : '';
  });

  const upd = <K extends keyof GastoFormData>(k: K, v: GastoFormData[K]) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === 'categoria') {
        // Reset subcategory selection when category changes
        next.subcategoria = GASTO_SUBCATEGORIAS[v as GastoCategoria][0];
        setOtroSubcat(false);
        setOtroSubcatTexto('');
      }
      return next;
    });
  };

  const handleSubcatChange = (value: string) => {
    if (value === '__otros__') {
      setOtroSubcat(true);
      setOtroSubcatTexto('');
      setForm(prev => ({ ...prev, subcategoria: '' }));
    } else {
      setOtroSubcat(false);
      setOtroSubcatTexto('');
      upd('subcategoria', value);
    }
  };

  const handleOtroTexto = (texto: string) => {
    setOtroSubcatTexto(texto);
    setForm(prev => ({ ...prev, subcategoria: texto.trim() }));
  };

  // valid: when "Otros" is selected, also require otroSubcatTexto
  const subcatOk = otroSubcat ? otroSubcatTexto.trim().length > 0 : true;
  const valid = form.concepto.trim() && Number(form.monto) > 0 && form.fecha && subcatOk;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onGuardar(form);
      // Persist new custom subcategory for 'personal' category for future use
      if (form.categoria === 'personal' && otroSubcat && otroSubcatTexto.trim()) {
        onNuevaPersonalSub?.(otroSubcatTexto.trim());
      }
    } catch (err) {
    console.error('[GastoForm] Error al guardar gasto:', err);
    setSaveError('Error al guardar. Intenta de nuevo.');
  } finally { setSaving(false); }
  };

  const catInfo = GASTO_CATEGORIAS.find(c => c.key === form.categoria)!;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      {/* Categoria + Subcategoria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Categoría</Label>
          <Select value={form.categoria} onChange={e => upd('categoria', e.target.value as GastoCategoria)}>
            {GASTO_CATEGORIAS.map(c => (
              <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Subcategoría</Label>
          <Select
            value={otroSubcat ? '__otros__' : form.subcategoria}
            onChange={e => handleSubcatChange(e.target.value)}
          >
            {GASTO_SUBCATEGORIAS[form.categoria].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
            {form.categoria === 'personal' && customPersonalSubs
              .filter(s => !GASTO_SUBCATEGORIAS['personal'].includes(s))
              .map(s => (
                <option key={s} value={s}>[+] {s}</option>
              ))}
            <option value="__otros__">
              {form.categoria === 'personal' ? '✏️ Escribir nueva subcategoria...' : '✏️ Otros (escribir...)'}
            </option>
          </Select>
          {otroSubcat && (
            <Input
              className="mt-2"
              value={otroSubcatTexto}
              onChange={e => handleOtroTexto(e.target.value)}
              placeholder="Describe el tipo de gasto..."
              autoFocus
            />
          )}
        </div>
      </div>

      {/* Concepto */}
      <div>
        <Label>Concepto <span className="text-rose-500">*</span></Label>
        <Input
          value={form.concepto}
          onChange={e => upd('concepto', e.target.value)}
          placeholder={`ej. ${catInfo.emoji} ${form.subcategoria} — Junio 2026`}
        />
      </div>

      {/* Monto + Fecha */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Monto ($) <span className="text-rose-500">*</span></Label>
          <Input
            type="number" min="0.01" step="0.01"
            value={form.monto}
            onChange={e => upd('monto', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label>Fecha <span className="text-rose-500">*</span></Label>
          <Input type="date" value={form.fecha} onChange={e => upd('fecha', e.target.value)} />
        </div>
      </div>

      {/* Notas */}
      <div>
        <Label>Notas (opcional)</Label>
        <Input
          value={form.notas}
          onChange={e => upd('notas', e.target.value)}
          placeholder="Referencia, proveedor, número de factura..."
        />
      </div>

      {saveError && <p className="text-red-600 text-sm mt-1 bg-red-50 rounded p-2">{saveError}</p>}
      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Btn variant="primary" disabled={!valid || saving} onClick={handleSubmit}>
          {saving ? '⏳ Guardando...' : '✓ Guardar'}
        </Btn>
        <Btn variant="ghost" onClick={onCancelar}>Cancelar</Btn>
      </div>
    </div>
  );
}

// ─── Gasto Row ────────────────────────────────────────────────────────────────

function GastoRow({
  gasto,
  onEditar,
  onEliminar,
}: {
  gasto: Gasto;
  onEditar: (g: Gasto) => void;
  onEliminar: (id: string) => void;
}) {
  const catInfo = GASTO_CATEGORIAS.find(c => c.key === gasto.categoria)!;
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2 rounded-lg transition-colors gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-lg flex-shrink-0">{catInfo.emoji}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{gasto.concepto}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {gasto.subcategoria} · {formatearFecha(gasto.fecha)}
            {gasto.notas && <> · <span className="italic">{gasto.notas}</span></>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-sm font-bold text-slate-900 tabular-nums">${fmt(gasto.monto)}</span>
        <div className="flex gap-1">
          <button
            onClick={() => onEditar(gasto)}
            className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded"
            title="Editar"
          >✏️</button>
          <button
            onClick={() => onEliminar(gasto.id)}
            className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded"
            title="Eliminar"
          >🗑️</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VistaGastos({
  gastos,
  mesActual,
  onCrear,
  onEditar,
  onEliminar,
}: {
  gastos: Gasto[];
  mesActual: string;
  onCrear: (data: Omit<Gasto, 'id' | 'tallerId'>) => Promise<void>;
  onEditar: (id: string, data: Partial<Omit<Gasto, 'id' | 'tallerId'>>) => Promise<void>;
  onEliminar: (id: string) => Promise<void>;
}) {
  const hoy = getHoy();
  const [filtro, setFiltro] = useState<FiltroCat>('todos');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Custom subcategories for 'personal' category, persisted in localStorage
  const PERSONAL_SUBS_KEY = 'taller_personal_subcats';
  const [customPersonalSubs, setCustomPersonalSubs] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(PERSONAL_SUBS_KEY) ?? '[]') as string[]; }
    catch { return []; }
  });

  const handleNuevaPersonalSub = (sub: string) => {
    setCustomPersonalSubs(prev => {
      if (prev.includes(sub)) return prev;
      const next = [...prev, sub];
      localStorage.setItem(PERSONAL_SUBS_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Filter to current month
  const gastosMes = gastos.filter(g => g.fecha.startsWith(mesActual));

  // Apply category filter
  const gastosFiltrados = filtro === 'todos'
    ? gastosMes
    : gastosMes.filter(g => g.categoria === filtro);

  // Per-category totals
  const totalPorCat = (cat: GastoCategoria) =>
    gastosMes.filter(g => g.categoria === cat).reduce((s, g) => s + g.monto, 0);
  const totalMes = gastosMes.reduce((s, g) => s + g.monto, 0);

  // Group filtered gastos by category for display
  const grouped = GASTO_CATEGORIAS.map(cat => ({
    cat,
    items: gastosFiltrados.filter(g => g.categoria === cat.key),
    total: totalPorCat(cat.key),
  })).filter(g => filtro === 'todos' ? g.items.length > 0 || true : g.items.length > 0);

  const handleGuardar = async (form: GastoFormData) => {
    await onCrear({
      categoria:    form.categoria,
      subcategoria: form.subcategoria,
      concepto:     form.concepto.trim(),
      monto:        Number(form.monto),
      fecha:        form.fecha,
      notas:        form.notas.trim() || undefined,
    });
    setShowForm(false);
  };

  const handleUpdate = async (form: GastoFormData) => {
    if (!editingId) return;
    await onEditar(editingId, {
      categoria:    form.categoria,
      subcategoria: form.subcategoria,
      concepto:     form.concepto.trim(),
      monto:        Number(form.monto),
      fecha:        form.fecha,
      notas:        form.notas.trim() || undefined,
    });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onEliminar(id);
      setConfirmDelete(null);
    } catch (err) {
      console.error('[GastoPage] Error al eliminar gasto:', err);
      setDeleteError('Error al eliminar el gasto. Intenta de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const editingGasto = editingId ? gastos.find(g => g.id === editingId) : null;

  const mesLabel = new Date(mesActual + '-15').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <SectionTitle
          title="Gastos"
          subtitle={`${mesLabel} · ${gastosMes.length} gasto${gastosMes.length !== 1 ? 's' : ''} registrado${gastosMes.length !== 1 ? 's' : ''}`}
        />
        {!showForm && !editingId && (
          <Btn variant="primary" onClick={() => setShowForm(true)}>+ Nuevo Gasto</Btn>
        )}
      </div>

      {/* ── Add form ── */}
      {showForm && (
        <div className="mb-6">
          <GastoForm
            initial={emptyForm(hoy)}
            onGuardar={handleGuardar}
            onCancelar={() => setShowForm(false)}
            customPersonalSubs={customPersonalSubs}
            onNuevaPersonalSub={handleNuevaPersonalSub}
          />
        </div>
      )}

      {/* ── Total del mes ── */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total del mes</span>
          <span className="text-2xl font-extrabold text-slate-900 tabular-nums">${fmt(totalMes)}</span>
        </div>
        {/* Category summary pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {GASTO_CATEGORIAS.map(cat => {
            const t = totalPorCat(cat.key);
            return (
              <button
                key={cat.key}
                onClick={() => setFiltro(filtro === cat.key ? 'todos' : cat.key)}
                className={`text-left px-3 py-2 rounded-lg border transition-all ${
                  filtro === cat.key
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="text-base mb-0.5">{cat.emoji}</div>
                <div className="text-xs text-slate-500 font-medium leading-tight">{cat.label}</div>
                <div className="text-sm font-bold text-slate-800 tabular-nums">${fmt(t)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Category filter tabs ── */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {([{ key: 'todos', label: 'Todos', emoji: '📋' }, ...GASTO_CATEGORIAS] as { key: FiltroCat; label: string; emoji: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filtro === f.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {f.emoji} {f.label}
            {f.key !== 'todos' && (
              <span className="ml-1 opacity-75">({gastosMes.filter(g => g.categoria === f.key).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Grouped list ── */}
      <div className="space-y-4">
        {grouped.map(({ cat, items, total }) => {
          if (filtro !== 'todos' && items.length === 0) return null;
          if (filtro === 'todos' && items.length === 0) return null;
          return (
            <div key={cat.key} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="font-bold text-slate-700 text-sm">{cat.label}</span>
                  <span className="text-xs text-slate-400">({items.length})</span>
                </div>
                <span className="font-bold text-slate-900 tabular-nums text-sm">${fmt(total)}</span>
              </div>
              {/* Rows */}
              <div className="px-3">
                {items.map(g => {
                  if (editingId === g.id) {
                    return (
                      <div key={g.id} className="py-2">
                        <GastoForm
                          initial={{
                            categoria: g.categoria,
                            subcategoria: g.subcategoria,
                            concepto: g.concepto,
                            monto: String(g.monto),
                            fecha: g.fecha,
                            notas: g.notas ?? '',
                          }}
                          onGuardar={handleUpdate}
                          onCancelar={() => setEditingId(null)}
                          customPersonalSubs={customPersonalSubs}
                          onNuevaPersonalSub={handleNuevaPersonalSub}
                        />
                      </div>
                    );
                  }
                  if (confirmDelete === g.id) {
                    return (
                      <div key={g.id} className="flex items-center justify-between py-3 px-2 bg-rose-50 rounded-lg my-1">
                        <div><span className="text-sm text-rose-700 font-medium">¿Eliminar &quot;{g.concepto}&quot;?</span>
                        {deleteError && <p className="text-xs text-rose-600 mt-0.5">{deleteError}</p>}</div>
                        <div className="flex gap-2">
                          <Btn size="sm" variant="danger" onClick={() => handleDelete(g.id)}>Sí, eliminar</Btn>
                          <Btn size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Btn>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <GastoRow
                      key={g.id}
                      gasto={g}
                      onEditar={g => setEditingId(g.id)}
                      onEliminar={id => { setDeleteError(null); setConfirmDelete(id); }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {gastosMes.length === 0 && (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
            <div className="text-5xl mb-3">💸</div>
            <p className="font-semibold text-slate-600 mb-1">Sin gastos registrados</p>
            <p className="text-sm text-slate-400 mb-4">Registra los gastos del mes para calcular la utilidad neta.</p>
            <Btn variant="primary" onClick={() => setShowForm(true)}>+ Agregar primer gasto</Btn>
          </div>
        )}

        {gastosMes.length > 0 && gastosFiltrados.length === 0 && filtro !== 'todos' && (
          <div className="text-center py-10 bg-white border border-slate-200 rounded-xl text-slate-400">
            <p className="font-medium">No hay gastos de esta categoría este mes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
