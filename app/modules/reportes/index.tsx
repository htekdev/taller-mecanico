'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SectionTitle, Card, Btn, Input, Label, Select } from '@/app/components/ui';

// ─── Types ───────────────────────────────────────────────────────────────────

type Categoria = 'bug' | 'mejora' | 'sugerencia';
type Prioridad = 'alta' | 'media' | 'baja';
type EstadoFiltro = 'todos' | 'pendiente' | 'en_progreso' | 'resuelto';

interface Reporte {
  numero: number;
  titulo: string;
  estado: 'pendiente' | 'en_progreso' | 'resuelto';
  categoria: string;
  prioridad: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  url: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORIA_LABELS: Record<Categoria, string> = {
  bug: '🐛 Error',
  mejora: '✨ Mejora',
  sugerencia: '💡 Sugerencia',
};

const ESTADO_LABELS: Record<string, { label: string; className: string }> = {
  pendiente:   { label: '⏳ Pendiente',   className: 'bg-amber-100 text-amber-800' },
  en_progreso: { label: '🔵 En Progreso', className: 'bg-blue-100 text-blue-800' },
  resuelto:    { label: '✅ Resuelto',    className: 'bg-emerald-100 text-emerald-800' },
};

const PRIORIDAD_LABELS: Record<string, string> = {
  alta:  '🔴 Alta',
  media: '🟡 Media',
  baja:  '🟢 Baja',
};

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VistaReportes() {
  const [tab, setTab] = useState<'nuevo' | 'estado'>('estado');

  // Form state
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('bug');
  const [prioridad, setPrioridad] = useState<Prioridad | ''>('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form submission state
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState<{ numero: number; url: string } | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Issue list state
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargandoReportes, setCargandoReportes] = useState(false);
  const [errorReportes, setErrorReportes] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('todos');

  // ── Load issues ────────────────────────────────────────────────────────────

  const cargarReportes = useCallback(async () => {
    setCargandoReportes(true);
    setErrorReportes(null);
    try {
      const res = await fetch('/api/feedback', { cache: 'no-store' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Error al cargar los reportes');
      }
      const data: Reporte[] = await res.json();
      setReportes(data);
    } catch (err) {
      setErrorReportes(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCargandoReportes(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'estado') {
      cargarReportes();
    }
  }, [tab, cargarReportes]);

  // ── Screenshot handling ────────────────────────────────────────────────────

  const handleScreenshot = (file: File | null) => {
    setScreenshotFile(file);
    if (!file) {
      setScreenshotPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setScreenshotPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Form submit ────────────────────────────────────────────────────────────

  const enviarReporte = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);
    setExito(null);

    if (!titulo.trim()) { setErrorForm('El título es obligatorio'); return; }
    if (!descripcion.trim()) { setErrorForm('La descripción es obligatoria'); return; }

    setEnviando(true);
    try {
      const payload: Record<string, unknown> = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoria,
        ...(prioridad && { prioridad }),
        ...(screenshotPreview && { screenshot: screenshotPreview }),
      };

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar el reporte');

      setExito({ numero: data.numero, url: data.url });
      // Reset form
      setTitulo('');
      setDescripcion('');
      setCategoria('bug');
      setPrioridad('');
      setScreenshotFile(null);
      setScreenshotPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'Error al enviar el reporte');
    } finally {
      setEnviando(false);
    }
  };

  // ── Filtered issues ────────────────────────────────────────────────────────

  const reportesFiltrados = filtroEstado === 'todos'
    ? reportes
    : reportes.filter(r => r.estado === filtroEstado);

  const conteos = {
    todos: reportes.length,
    pendiente: reportes.filter(r => r.estado === 'pendiente').length,
    en_progreso: reportes.filter(r => r.estado === 'en_progreso').length,
    resuelto: reportes.filter(r => r.estado === 'resuelto').length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <SectionTitle
        title="📣 Reportes y Sugerencias"
        subtitle="Envía reportes de errores o sugerencias de mejora al equipo técnico"
      />

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('estado')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            tab === 'estado'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          📋 Ver Reportes
          {conteos.pendiente > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              tab === 'estado' ? 'bg-indigo-400 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              {conteos.pendiente}
            </span>
          )}
        </button>
        <button
          onClick={() => { setTab('nuevo'); setExito(null); setErrorForm(null); }}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            tab === 'nuevo'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          ✏️ Nuevo Reporte
        </button>
      </div>

      {/* ── Tab: Nuevo Reporte ── */}
      {tab === 'nuevo' && (
        <div className="max-w-xl">
          {exito ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-lg font-bold text-emerald-800 mb-2">¡Reporte enviado!</h3>
              <p className="text-emerald-700 text-sm mb-1">
                Tu reporte <span className="font-semibold">#{exito.numero}</span> fue registrado con éxito.
              </p>
              <p className="text-emerald-600 text-xs mb-4">
                El equipo técnico lo revisará pronto.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Btn
                  variant="ghost"
                  onClick={() => { setExito(null); setTitulo(''); setDescripcion(''); }}
                >
                  Enviar otro reporte
                </Btn>
                <Btn
                  variant="primary"
                  onClick={() => setTab('estado')}
                >
                  Ver todos los reportes
                </Btn>
              </div>
            </div>
          ) : (
            <form onSubmit={enviarReporte} className="space-y-5">
              {errorForm && (
                <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3 text-sm">
                  {errorForm}
                </div>
              )}

              <div>
                <Label>Título *</Label>
                <Input
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Describe brevemente el problema o sugerencia"
                  maxLength={120}
                  required
                />
                <p className="text-xs text-slate-400 mt-1">{titulo.length}/120</p>
              </div>

              <div>
                <Label>Descripción *</Label>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Describe con detalle qué pasó, qué esperabas que pasara, y cómo reproducirlo..."
                  rows={5}
                  maxLength={2000}
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">{descripcion.length}/2000</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoría</Label>
                  <Select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value as Categoria)}
                  >
                    <option value="bug">🐛 Error en la app</option>
                    <option value="mejora">✨ Mejora</option>
                    <option value="sugerencia">💡 Sugerencia</option>
                  </Select>
                </div>
                <div>
                  <Label>Prioridad (opcional)</Label>
                  <Select
                    value={prioridad}
                    onChange={e => setPrioridad(e.target.value as Prioridad | '')}
                  >
                    <option value="">Sin prioridad</option>
                    <option value="alta">🔴 Alta</option>
                    <option value="media">🟡 Media</option>
                    <option value="baja">🟢 Baja</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Captura de pantalla (opcional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => handleScreenshot(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4
                    file:rounded-lg file:border-0 file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100
                    border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
                {screenshotPreview && (
                  <div className="mt-2 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screenshotPreview}
                      alt="Vista previa"
                      className="max-h-40 rounded-lg border border-slate-200 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-rose-600"
                      aria-label="Eliminar captura"
                    >
                      ×
                    </button>
                    <p className="text-xs text-slate-500 mt-1">
                      📎 {screenshotFile?.name}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-1">
                <Btn type="submit" disabled={enviando} fullWidth>
                  {enviando ? 'Enviando...' : '📤 Enviar Reporte'}
                </Btn>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Tab: Estado de Reportes ── */}
      {tab === 'estado' && (
        <div>
          {/* Summary badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {(
              [
                { key: 'todos',      label: 'Total',       color: 'bg-slate-100 text-slate-700' },
                { key: 'pendiente',  label: 'Pendientes',  color: 'bg-amber-50 text-amber-800 border border-amber-200' },
                { key: 'en_progreso',label: 'En Progreso', color: 'bg-blue-50 text-blue-800 border border-blue-200' },
                { key: 'resuelto',   label: 'Resueltos',   color: 'bg-emerald-50 text-emerald-800 border border-emerald-200' },
              ] as { key: EstadoFiltro; label: string; color: string }[]
            ).map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setFiltroEstado(key)}
                className={`rounded-xl p-3 text-center transition-all ring-offset-1 ${color} ${
                  filtroEstado === key ? 'ring-2 ring-indigo-400 shadow-sm' : 'hover:opacity-80'
                }`}
              >
                <div className="text-2xl font-bold">{conteos[key]}</div>
                <div className="text-xs font-semibold mt-0.5">{label}</div>
              </button>
            ))}
          </div>

          {/* Reload + action bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">
              {filtroEstado === 'todos' ? 'Todos los reportes' : `Reportes: ${ESTADO_LABELS[filtroEstado]?.label}`}
            </p>
            <div className="flex gap-2">
              <Btn variant="ghost" size="sm" onClick={cargarReportes} disabled={cargandoReportes}>
                {cargandoReportes ? '⏳' : '🔄'} Actualizar
              </Btn>
              <Btn variant="primary" size="sm" onClick={() => setTab('nuevo')}>
                + Nuevo
              </Btn>
            </div>
          </div>

          {/* Error */}
          {errorReportes && (
            <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3 text-sm mb-4">
              {errorReportes}
              <button onClick={cargarReportes} className="ml-3 underline font-semibold">Reintentar</button>
            </div>
          )}

          {/* Loading */}
          {cargandoReportes && (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              Cargando reportes...
            </div>
          )}

          {/* Empty */}
          {!cargandoReportes && !errorReportes && reportesFiltrados.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-slate-500 text-sm font-medium">
                {filtroEstado === 'todos'
                  ? 'No hay reportes todavía'
                  : `No hay reportes ${ESTADO_LABELS[filtroEstado]?.label?.toLowerCase()}`}
              </p>
              <button
                onClick={() => setTab('nuevo')}
                className="mt-3 text-indigo-600 text-sm font-semibold hover:underline"
              >
                Enviar el primer reporte →
              </button>
            </div>
          )}

          {/* Issue list */}
          {!cargandoReportes && reportesFiltrados.length > 0 && (
            <div className="space-y-3">
              {reportesFiltrados.map((reporte) => {
                const estadoInfo = ESTADO_LABELS[reporte.estado];
                return (
                  <div
                    key={reporte.numero}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-xs text-slate-400 font-mono">#{reporte.numero}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estadoInfo.className}`}>
                            {estadoInfo.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {CATEGORIA_LABELS[reporte.categoria as Categoria] ?? reporte.categoria}
                          </span>
                          {reporte.prioridad && (
                            <span className="text-xs text-slate-500">
                              {PRIORIDAD_LABELS[reporte.prioridad] ?? reporte.prioridad}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800 leading-snug">
                          {/* Strip the [Categoría] prefix that the API adds */}
                          {reporte.titulo.replace(/^\[.*?\]\s*/, '')}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Enviado el {formatFecha(reporte.fechaCreacion)}
                          {reporte.fechaActualizacion !== reporte.fechaCreacion && (
                            <> · Actualizado {formatFecha(reporte.fechaActualizacion)}</>
                          )}
                        </p>
                      </div>
                      <a
                        href={reporte.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-indigo-600 text-xs font-medium flex-shrink-0 mt-0.5"
                        title="Ver en GitHub"
                      >
                        Ver →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
