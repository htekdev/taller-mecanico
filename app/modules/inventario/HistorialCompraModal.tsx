'use client';

import { useEffect } from 'react';
import type { HistorialCompraRefaccion, Proveedor, Refaccion } from '@/app/types';
import { fmt } from '@/app/lib/utils';

// ────────────────────────────────────────────────────────────────────────────
// HistorialCompraModal (read-only)
//
// Shows the purchase history for a single inventory part (refacción).
// Sofia's request: "solo el historial" — no add form, view-only.
// ────────────────────────────────────────────────────────────────────────────

interface HistorialCompraModalProps {
  refaccion: Refaccion;
  historial: HistorialCompraRefaccion[];
  proveedores: Proveedor[];
  cargando: boolean;
  errorCarga: string | null;
  onCerrar: () => void;
}

export function HistorialCompraModal({
  refaccion,
  historial,
  proveedores,
  cargando,
  errorCarga,
  onCerrar,
}: HistorialCompraModalProps) {
  // Resolve display name — prefer stored snapshot, fall back to live proveedor list
  const nombreProveedor = (proveedorId?: string, nombreSnap?: string) => {
    if (nombreSnap) return nombreSnap;
    if (proveedorId) return proveedores.find(p => p.id === proveedorId)?.nombre ?? '—';
    return '—';
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCerrar();
  };

  // Close on Escape key + focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="historial-modal-title"
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90dvh] flex flex-col shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Historial de Compras
            </p>
            <h2
              id="historial-modal-title"
              className="text-base font-bold text-slate-800 leading-tight"
            >
              {refaccion.nombre}
            </h2>
            {refaccion.codigo && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">{refaccion.codigo}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onCerrar}
          className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors p-3 rounded-lg"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable history list ── */}
        <div className="overflow-y-auto flex-1 p-5">
          {cargando && (
            <div className="text-center py-10">
              <div className="inline-block w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              <p className="text-xs text-slate-400 mt-2">Cargando historial…</p>
            </div>
          )}

          {errorCarga && !cargando && (
            <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {errorCarga}
            </p>
          )}

          {!cargando && !errorCarga && historial.length === 0 && (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-sm text-slate-500">Aún no hay entradas registradas para esta pieza.</p>
            </div>
          )}

          {!cargando && !errorCarga && historial.length > 0 && (
            <div className="space-y-3" data-testid="historial-list">
              {historial.map((entrada, idx) => (
                <div
                  key={entrada.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2"
                  data-testid="historial-entrada"
                >
                  {/* Row 1: date + total */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      📅 {new Date(entrada.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </span>
                    <span className="text-sm font-bold text-slate-800">{fmt(entrada.total)}</span>
                  </div>
                  {/* Row 2: proveedor */}
                  <div className="text-xs text-slate-600">
                    <span className="text-slate-400 mr-1">Proveedor:</span>
                    <span className="font-medium">
                      {nombreProveedor(entrada.proveedorId, entrada.proveedorNombre)}
                    </span>
                  </div>
                  {/* Row 3: qty + unit price */}
                  <div className="flex gap-4 text-xs text-slate-600">
                    <span>
                      <span className="text-slate-400">Cantidad:</span>{' '}
                      <span className="font-medium">{entrada.cantidad} {refaccion.unidad}</span>
                    </span>
                    <span>
                      <span className="text-slate-400">Precio unit.:</span>{' '}
                      <span className="font-medium">{fmt(entrada.precioUnitario)}</span>
                    </span>
                  </div>
                  {/* Row 4: notes (optional) */}
                  {entrada.notas && (
                    <p className="text-xs text-slate-500 italic border-t border-slate-200 pt-2 mt-1">
                      {entrada.notas}
                    </p>
                  )}
                  {/* Latest badge */}
                  {idx === 0 && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700 rounded px-2 py-0.5">
                      Última compra
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
