'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Refaccion } from '@/app/types';
import { fmt } from '@/app/lib/utils';

interface Props {
  inventario: Refaccion[];
  onAgregar: (refId: string, cantidad: number, precioCompra: number) => void;
  onCerrar: () => void;
}

export function BuscadorInventarioOC({ inventario, onAgregar, onCerrar }: Props) {
  const [busqueda, setBusqueda]           = useState('');
  const [catFiltro, setCatFiltro]         = useState<string>('');
  const [expandido, setExpandido]         = useState<string | null>(null);
  const [cantidad, setCantidad]           = useState(1);
  const [precio, setPrecio]               = useState(0);
  const [ultimoAgregado, setUltimoAgregado] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search + Escape to close
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  // Unique categories from inventory
  const categorias = useMemo(() => {
    const cats = new Set(inventario.map(r => r.categoria).filter(Boolean));
    return Array.from(cats).sort() as string[];
  }, [inventario]);

  // Filtered + sorted inventory
  const refaccionesFiltradas = useMemo(() => {
    let items = inventario;
    if (catFiltro) {
      items = items.filter(r => r.categoria === catFiltro);
    }
    const q = busqueda.trim().toLowerCase();
    if (q) {
      items = items.filter(r =>
        r.nombre.toLowerCase().includes(q) ||
        (r.codigo ?? '').toLowerCase().includes(q)
      );
    }
    return [...items].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [inventario, catFiltro, busqueda]);

  const abrirParte = (r: Refaccion) => {
    if (expandido === r.id) { setExpandido(null); return; }
    setExpandido(r.id);
    setCantidad(1);
    setPrecio(r.precioCompra);
  };

  const confirmarAgregar = (r: Refaccion) => {
    const pc = precio > 0 ? precio : r.precioCompra;
    onAgregar(r.id, cantidad, pc);
    setExpandido(null);
    setCantidad(1);
    setPrecio(0);
    setUltimoAgregado(r.nombre);
    setTimeout(() => setUltimoAgregado(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Buscar inventario">

      {/* ── Header: back + search ─────────────────────────────────────────── */}
      <div className="bg-slate-800 px-4 py-3 flex items-center gap-3 shadow-md flex-shrink-0">
        <button
          type="button"
          onClick={onCerrar}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all text-xl font-bold flex-shrink-0"
          aria-label="Cerrar buscador"
        >
          ←
        </button>
        <div className="flex-1 relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        <span className="text-slate-400 text-xs whitespace-nowrap flex-shrink-0">
          {refaccionesFiltradas.length} pieza{refaccionesFiltradas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Category filter pills ─────────────────────────────────────────── */}
      {categorias.length > 0 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto bg-slate-50 border-b border-slate-200 flex-shrink-0 scrollbar-hide">
          <button
            type="button"
            onClick={() => setCatFiltro('')}
            className={`px-4 py-2.5 text-sm min-h-[44px] rounded-full font-semibold whitespace-nowrap transition-all ${
              catFiltro === ''
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todas
          </button>
          {categorias.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCatFiltro(catFiltro === cat ? '' : cat)}
              className={`px-4 py-2.5 text-sm min-h-[44px] rounded-full font-semibold whitespace-nowrap transition-all ${
                catFiltro === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Success flash ─────────────────────────────────────────────────── */}
      {ultimoAgregado && (
        <div
          role="status"
          aria-live="polite"
          className="mx-4 mt-3 flex-shrink-0 flex items-center gap-2 bg-emerald-50 border border-emerald-300 rounded-lg px-4 py-2.5 text-sm text-emerald-700 font-semibold shadow-sm"
        >
          <span className="text-emerald-500" aria-hidden="true">✓</span>
          <span>{ultimoAgregado} agregado a la orden</span>
        </div>
      )}

      {/* ── Parts grid ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">
        {refaccionesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
            <span className="text-4xl" aria-hidden="true">🔍</span>
            <p className="text-sm font-medium">Sin resultados</p>
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="px-4 py-2 min-h-[44px] text-xs text-indigo-600 hover:underline mt-1"
              >
                Limpiar búsqueda
              </button>
            )}
            {catFiltro && (
              <button
                type="button"
                onClick={() => setCatFiltro('')}
                className="px-4 py-2 min-h-[44px] text-xs text-indigo-600 hover:underline"
              >
                Ver todas las categorías
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {refaccionesFiltradas.map(r => {
              const isExpanded = expandido === r.id;
              const lowStock   = r.stock <= r.stockMinimo;

              return (
                <div
                  key={r.id}
                  className={`border rounded-xl overflow-hidden transition-all ${
                    isExpanded
                      ? 'border-indigo-400 shadow-md ring-1 ring-indigo-200'
                      : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  {/* ── Card header — click to expand ── */}
                  <button
                    type="button"
                    onClick={() => abrirParte(r)}
                    className="w-full text-left p-3 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm leading-snug">{r.nombre}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {r.codigo && (
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {r.codigo}
                            </span>
                          )}
                          {r.categoria && (
                            <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {r.categoria}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-bold text-slate-900 text-sm">${fmt(r.precioCompra)}</p>
                        <p className={`text-xs mt-0.5 ${lowStock ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                          {lowStock ? `⚠ ${r.stock}` : r.stock} {r.unidad}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* ── Expanded: qty + price + confirm ── */}
                  {isExpanded && (
                    <div className="border-t border-indigo-200 bg-indigo-50 p-3 space-y-3">
                      <div className="flex gap-2">
                        <div className="w-24 flex-shrink-0">
                            <label htmlFor={`cant-${r.id}`} className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                            Cant.
                          </label>
                          <input
                              id={`cant-${r.id}`}
                              type="number"
                              min="1"
                              step="1"
                              inputMode="numeric"
                              value={cantidad || ''}
                              onChange={e => setCantidad(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label htmlFor={`precio-${r.id}`} className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                              Precio compra ($)
                            </label>
                            <input
                              id={`precio-${r.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={precio || ''}
                              onChange={e => setPrecio(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                      </div>
                      {precio > 0 && cantidad > 0 && (
                        <p className="text-xs text-slate-500">
                          Subtotal: <strong className="text-slate-700">${fmt(precio * cantidad)}</strong>
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => confirmarAgregar(r)}
                        disabled={cantidad <= 0 || precio <= 0}
                        className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        + Agregar a la orden
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
