'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Refaccion, Vehiculo, Trabajo, PricingIntel } from '@/app/types';
import { fmt, formatearFecha } from '@/app/lib/utils';
import { getPricingIntel } from '@/app/lib/pricing';

interface Props {
  inventario: Refaccion[];
  vehiculo: Vehiculo | undefined;
  clienteId: string;
  trabajos: Trabajo[];
  onAgregar: (refId: string, cantidad: number, precioVenta: number) => void;
  onCerrar: () => void;
}

export function BuscadorRefacciones({ inventario, vehiculo, clienteId, trabajos, onAgregar, onCerrar }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [catFiltro, setCatFiltro] = useState<string>('');
  const [soloCompatibles, setSoloCompatibles] = useState(!!vehiculo);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [precioVenta, setPrecioVenta] = useState(0);
  const [ultimoAgregado, setUltimoAgregado] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  const refaccionesFiltradas = useMemo(() => {
    const isCompatible = (r: Refaccion): boolean => {
      if (!vehiculo) return true;
      if (!r.compatibilidad || r.compatibilidad.length === 0) return true;
      const marca  = vehiculo.marca.toLowerCase().trim();
      const modelo = vehiculo.modelo.toLowerCase().trim();
      return r.compatibilidad.some(c =>
        c.marca.toLowerCase().trim() === marca &&
        (c.modelos.length === 0 || c.modelos.some(m => m.toLowerCase().trim() === modelo))
      );
    };
    let items = inventario;
    if (soloCompatibles && vehiculo) {
      items = items.filter(r => isCompatible(r));
    }
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
    return [...items].sort((a, b) => {
      const aIsLinked = a.vehiculoId === vehiculo?.id;
      const bIsLinked = b.vehiculoId === vehiculo?.id;
      const aIsCompat = a.compatibilidad?.length ?? 0;
      const bIsCompat = b.compatibilidad?.length ?? 0;
      if (aIsLinked !== bIsLinked) return aIsLinked ? -1 : 1;
      if (aIsCompat !== bIsCompat) return aIsCompat ? -1 : 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [inventario, soloCompatibles, vehiculo, catFiltro, busqueda]);

  const categorias = useMemo(() => {
    const cats = new Set(inventario.map(r => r.categoria).filter(Boolean));
    return Array.from(cats).sort();
  }, [inventario]);

  const abrirParte = (r: Refaccion) => {
    if (expandido === r.id) { setExpandido(null); return; }
    setExpandido(r.id);
    setCantidad(1);
    if (clienteId) {
      const prices = trabajos
        .filter(t => t.clienteId === clienteId)
        .flatMap(t => (t.partes ?? []).filter(p => p.refaccionId === r.id && p.precioVenta > 0).map(p => p.precioVenta));
      if (prices.length > 0) {
        setPrecioVenta(Math.max(...prices));
        return;
      }
    }
    setPrecioVenta(r.precioCompra);
  };

  const confirmarAgregar = (r: Refaccion) => {
    const pv = precioVenta > 0 ? precioVenta : r.precioCompra;
    onAgregar(r.id, cantidad, pv);
    setExpandido(null);
    setCantidad(1);
    setPrecioVenta(0);
    // Brief success flash — modal stays open for multiple additions
    setUltimoAgregado(r.nombre);
    setTimeout(() => setUltimoAgregado(null), 2500);
  };

  const expandedRef = expandido ? inventario.find(r => r.id === expandido) : null;

  const intel: PricingIntel | null = useMemo(() => {
    if (!expandido || !clienteId || !expandedRef) return null;
    return getPricingIntel(expandido, clienteId, expandedRef.precioCompra, trabajos);
  }, [expandido, clienteId, expandedRef, trabajos]);

  const compatLabel = (r: Refaccion): string => {
    if (!r.compatibilidad || r.compatibilidad.length === 0) return '🌐 Universal';
    return r.compatibilidad.map(c => c.marca).join(', ');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">

      {/* ── Header: search + compat toggle ─────────────────────────────────── */}
      <div className="bg-slate-800 px-4 py-3 flex items-center gap-3 shadow-md flex-shrink-0">
        <button
          onClick={onCerrar}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all text-xl font-bold flex-shrink-0"
          aria-label="Cerrar"
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
        {vehiculo && (
          <button
            type="button"
            onClick={() => setSoloCompatibles(v => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex-shrink-0 ${
              soloCompatibles
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
            }`}
          >
            {soloCompatibles ? '✅ Compatibles' : '🌐 Todos'}
          </button>
        )}
      </div>

      {/* ── Category filter pills ────────────────────────────────────────────── */}
      {categorias.length > 0 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto bg-slate-50 border-b border-slate-200 flex-shrink-0 scrollbar-hide">
          <button
            type="button"
            onClick={() => setCatFiltro('')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
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
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
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

      {/* ── Success flash ────────────────────────────────────────────────────── */}
      <div aria-live="polite" aria-atomic="true" className="mx-4 mt-3 flex-shrink-0">
        {ultimoAgregado && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 rounded-lg px-4 py-2.5 text-sm text-emerald-700 font-semibold shadow-sm">
            <span className="text-emerald-500">✓</span>
            <span>{ultimoAgregado} agregado</span>
          </div>
        )}
      </div>

      {/* ── Parts grid ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">
        {refaccionesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
            <span className="text-4xl">🔍</span>
            <p className="text-sm font-medium">Sin resultados</p>
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="text-xs text-indigo-600 hover:underline mt-1"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {refaccionesFiltradas.map(r => {
              const isExpanded = expandido === r.id;
              const isLinked   = r.vehiculoId === vehiculo?.id;
              const hasCompat  = r.compatibilidad && r.compatibilidad.length > 0;
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
                  {/* Card header — click to expand */}
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
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{r.codigo}</span>
                          )}
                          {r.categoria && (
                            <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{r.categoria}</span>
                          )}
                          {isLinked ? (
                            <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">🎯 Esta unidad</span>
                          ) : hasCompat ? (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">✅ {compatLabel(r)}</span>
                          ) : (
                            <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">🌐 Universal</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2 flex flex-col items-end gap-1">
                        <p className="font-bold text-slate-900 text-sm">${fmt(r.precioCompra)}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          r.stock <= 0
                            ? 'bg-red-100 text-red-700'
                            : lowStock
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {r.stock <= 0 ? 'Sin stock' : `{r.stock} {r.unidad}`}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* ── Expanded panel ── */}
                  {isExpanded && expandedRef?.id === r.id && (
                    <div className="border-t border-indigo-200 bg-indigo-50 p-3 space-y-3">

                      {/* Pricing intel */}
                      {intel && (
                        <div className="space-y-2">
                          {/* Markup suggestions */}
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="text-xs text-slate-500 font-medium">
                              Costo: <strong className="text-slate-700">${fmt(r.precioCompra)}</strong>
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-xs text-slate-400">Sugerencias:</span>
                            {intel.markups.map(m => (
                              <button
                                key={m.pct}
                                type="button"
                                onClick={() => setPrecioVenta(m.price)}
                                className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                  precioVenta === m.price
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                                }`}
                              >
                                {m.pct}% → ${fmt(m.price)}
                              </button>
                            ))}
                          </div>

                          {/* Client last sale */}
                          {intel.clientLastSale && (() => {
                            const isLower = precioVenta > 0 && precioVenta < intel.clientLastSale!.precio;
                            return (
                              <div className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs border ${
                                isLower ? 'bg-amber-50 border-amber-200' : 'bg-white border-indigo-100'
                              }`}>
                                <span className={isLower ? 'text-amber-700 font-bold' : 'text-indigo-700'}>
                                  {isLower ? '⚠️' : '📋'} Último cobro a este cliente:{' '}
                                  <strong>${fmt(intel.clientLastSale!.precio)}</strong>
                                  <span className="text-slate-400 font-normal ml-1">
                                    — {formatearFecha(intel.clientLastSale!.fecha)}
                                    {intel.clientAllSales.length > 1 && ` · ${intel.clientAllSales.length}x`}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPrecioVenta(intel.clientLastSale!.precio)}
                                  className="px-2 py-0.5 rounded bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex-shrink-0"
                                >
                                  Usar
                                </button>
                              </div>
                            );
                          })()}

                          {/* Other clients range */}
                          {intel.otherMin !== null && (
                            <p className="text-xs text-slate-400">
                              💬 Otros clientes: ${fmt(intel.otherMin!)}
                              {intel.otherMax !== intel.otherMin ? ` – $${fmt(intel.otherMax!)}` : ''}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Qty + precio inputs */}
                      <div className="flex gap-2">
                        <div className="w-24 flex-shrink-0">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Cant.</label>
                          <input
                            type="number"
                              inputMode="numeric"
                              min="1"
                            step="1"
                            value={cantidad || ''}
                            onChange={e => setCantidad(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                            Precio venta ($)
                            {intel?.clientLastSale && precioVenta > 0 && precioVenta < intel.clientLastSale.precio && (
                              <span className="ml-1 text-amber-600 font-bold normal-case text-xs">⚠ menor que antes</span>
                            )}
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={precioVenta || ''}
                            onChange={e => setPrecioVenta(Number(e.target.value))}
                            className={`w-full px-3 py-2 bg-white border rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 ${
                              intel?.clientLastSale && precioVenta > 0 && precioVenta < intel.clientLastSale.precio
                                ? 'border-amber-400 focus:ring-amber-400'
                                : 'border-slate-300 focus:ring-indigo-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Margen + Agregar */}
                      <div className="flex items-center justify-between gap-3">
                        {precioVenta > 0 && (
                          <span className="text-xs text-slate-500">
                            Margen:{' '}
                            <strong className={precioVenta > r.precioCompra ? 'text-emerald-600' : 'text-slate-600'}>
                              ${fmt((precioVenta - r.precioCompra) * cantidad)}{' '}
                              ({(((precioVenta - r.precioCompra) / (r.precioCompra || 1)) * 100).toFixed(0)}%)
                            </strong>
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={cantidad <= 0}
                          onClick={() => confirmarAgregar(r)}
                          className="ml-auto px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-slate-400">
          {refaccionesFiltradas.length} refacción{refaccionesFiltradas.length !== 1 ? 'es' : ''} mostrada{refaccionesFiltradas.length !== 1 ? 's' : ''}
          {inventario.length !== refaccionesFiltradas.length && ` de ${inventario.length}`}
        </span>
        <button
          type="button"
          onClick={onCerrar}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-all"
        >
          Listo
        </button>
      </div>
    </div>
  );
}
