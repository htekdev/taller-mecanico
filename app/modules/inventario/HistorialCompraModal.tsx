'use client';

import { useState, useEffect } from 'react';
import type { HistorialCompraRefaccion, Proveedor, Refaccion } from '@/app/types';
import { Label, Input, Select, Btn } from '@/app/components/ui';
import { fmt } from '@/app/lib/utils';

// ────────────────────────────────────────────────────────────────────────────
// HistorialCompraModal
//
// Opens a full-screen modal (mobile-first overlay) showing the purchase
// history for a single inventory part (refacción).
// Includes a form to add a new purchase entry inline.
// ────────────────────────────────────────────────────────────────────────────

interface HistorialCompraModalProps {
  refaccion: Refaccion;
  historial: HistorialCompraRefaccion[];
  proveedores: Proveedor[];
  cargando: boolean;
  errorCarga: string | null;
  onAgregarEntrada: (data: {
    proveedorId?: string;
    proveedorNombre: string;
    fecha: string;
    cantidad: number;
    precioUnitario: number;
    notas?: string;
  }) => Promise<void>;
  onCerrar: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

export function HistorialCompraModal({
  refaccion,
  historial,
  proveedores,
  cargando,
  errorCarga,
  onAgregarEntrada,
  onCerrar,
}: HistorialCompraModalProps) {
  const [form, setForm] = useState({
    proveedorId: '',
    proveedorNombreManual: '',
    fecha: today(),
    cantidad: 1,
    precioUnitario: refaccion.precioCompra,
    notas: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [exitoGuardado, setExitoGuardado] = useState(false);

  // Reset form when the modal opens
  useEffect(() => {
    setForm({
      proveedorId: refaccion.proveedorId ?? '',
      proveedorNombreManual: '',
      fecha: today(),
      cantidad: 1,
      precioUnitario: refaccion.precioCompra,
      notas: '',
    });
    setErrorGuardado(null);
    setExitoGuardado(false);
  }, [refaccion.id, refaccion.proveedorId, refaccion.precioCompra]);

  // Resolve display name for a proveedor
  const nombreProveedor = (id?: string, nombreSnap?: string) => {
    if (!id && !nombreSnap) return '—';
    if (nombreSnap) return nombreSnap;
    return proveedores.find(p => p.id === id)?.nombre ?? '—';
  };

  // Build proveedorNombre for the insert — prefer live select, fall back to manual
  const resolveProveedorNombre = () => {
    if (form.proveedorId) {
      return proveedores.find(p => p.id === form.proveedorId)?.nombre ?? form.proveedorNombreManual.trim();
    }
    return form.proveedorNombreManual.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.cantidad <= 0 || form.precioUnitario <= 0 || !form.fecha) return;

    const proveedorNombre = resolveProveedorNombre();

    setGuardando(true);
    setErrorGuardado(null);
    try {
      await onAgregarEntrada({
        proveedorId: form.proveedorId || undefined,
        proveedorNombre,
        fecha: form.fecha,
        cantidad: form.cantidad,
        precioUnitario: form.precioUnitario,
        notas: form.notas.trim() || undefined,
      });
      // Reset form on success
      setForm(f => ({
        ...f,
        fecha: today(),
        cantidad: 1,
        precioUnitario: refaccion.precioCompra,
        notas: '',
      }));
      setExitoGuardado(true);
      setTimeout(() => setExitoGuardado(false), 3000);
    } catch (err) {
      setErrorGuardado(err instanceof Error ? err.message : 'No se pudo guardar la entrada. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCerrar();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="historial-modal-title"
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Historial de Compras</p>
            <h2
              id="historial-modal-title"
              className="text-base font-bold text-slate-800 leading-tight truncate"
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
            className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors p-1 -m-1 rounded-lg"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1">
          {/* ── Nueva entrada ── */}
          <div className="p-5 border-b border-slate-100 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
              Registrar Entrada de Compra
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Proveedor: select from existing or type manually */}
              <div>
                <Label>Proveedor</Label>
                <Select
                  value={form.proveedorId}
                  onChange={e => setForm(f => ({ ...f, proveedorId: e.target.value }))}
                >
                  <option value="">— Escribir nombre manualmente —</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </Select>
              </div>
              {!form.proveedorId && (
                <div>
                  <Label>Nombre del proveedor *</Label>
                  <Input
                    type="text"
                    placeholder="Ej. Refaccionaria La Nacional"
                    value={form.proveedorNombreManual}
                    onChange={e => setForm(f => ({ ...f, proveedorNombreManual: e.target.value }))}
                    required
                  />
                </div>
              )}
              {/* Fecha */}
              <div>
                <Label>Fecha de compra *</Label>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  required
                />
              </div>
              {/* Cantidad + Precio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cantidad *</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="1"
                    value={form.cantidad || ''}
                    onChange={e => setForm(f => ({ ...f, cantidad: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <Label>Precio unitario ($) *</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    placeholder="0.00"
                    value={form.precioUnitario || ''}
                    onChange={e => setForm(f => ({ ...f, precioUnitario: Number(e.target.value) }))}
                    required
                  />
                </div>
              </div>
              {/* Total preview */}
              {form.cantidad > 0 && form.precioUnitario > 0 && (
                <p className="text-xs text-slate-500">
                  Total: <span className="font-semibold text-slate-700">{fmt(form.cantidad * form.precioUnitario)}</span>
                </p>
              )}
              {/* Notas */}
              <div>
                <Label>Notas <span className="font-normal text-slate-400">(opcional)</span></Label>
                <Input
                  type="text"
                  placeholder="Ej. Factura #1234, pago en efectivo"
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                />
              </div>
              {/* Errors / success */}
              {errorGuardado && (
                <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {errorGuardado}
                </p>
              )}
              {exitoGuardado && (
                <p role="status" className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  ✅ Entrada registrada correctamente.
                </p>
              )}
              <Btn type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : '+ Agregar Entrada'}
              </Btn>
            </form>
          </div>

          {/* ── Historial list ── */}
          <div className="p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
              Entradas Registradas
            </h3>

            {cargando && (
              <div className="text-center py-8">
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
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📦</p>
                <p className="text-sm text-slate-500">Aún no hay entradas registradas para esta pieza.</p>
                <p className="text-xs text-slate-400 mt-1">Usa el formulario de arriba para agregar la primera entrada.</p>
              </div>
            )}

            {!cargando && historial.length > 0 && (
              <div className="space-y-3" data-testid="historial-list">
                {historial.map((entrada, idx) => (
                  <div
                    key={entrada.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 space-y-2"
                    data-testid="historial-entrada"
                  >
                    {/* Row 1: date + total */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">
                        📅 {new Date(entrada.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
                          day: 'numeric', month: 'long', year: 'numeric'
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
                    {/* Row 3: qty + price */}
                    <div className="flex gap-4 text-xs text-slate-600">
                      <span><span className="text-slate-400">Cantidad:</span> <span className="font-medium">{entrada.cantidad} {refaccion.unidad}</span></span>
                      <span><span className="text-slate-400">Precio unit.:</span> <span className="font-medium">{fmt(entrada.precioUnitario)}</span></span>
                    </div>
                    {/* Row 4: notas (optional) */}
                    {entrada.notas && (
                      <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-2 mt-2">
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
    </div>
  );
}
