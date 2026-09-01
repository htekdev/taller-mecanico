/**
 * page-state.ts
 *
 * Lightweight page-state persistence layer.
 * Saves per-module UI state (filters, search text, active tabs, sort order)
 * to localStorage so users return to exactly where they left off.
 *
 * This is intentionally separate from form-draft.ts — form drafts preserve
 * in-progress form data (48h TTL, cleared on save), while page state preserves
 * navigation choices (7-day TTL, never cleared — they just expire).
 *
 * Usage:
 *   // Replace useState with usePersistedState for filter/tab/search state:
 *   const [filtroEstado, setFiltroEstado] = usePersistedState<'todos'|'pendiente'|'completado'>(
 *     'taller_trabajos_filtro_estado',
 *     'todos'
 *   );
 *
 * Keys used across the app:
 *   taller_trabajos_subtab
 *   taller_trabajos_filtro_estado
 *   taller_trabajos_filtro_facturacion
 *   taller_trabajos_filtro_tft
 *   taller_trabajos_filtro_refacciones
 *   taller_trabajos_filtro_cliente
 *   taller_trabajos_filtro_vehiculo
 *   taller_trabajos_ver_cancelados
 *   taller_inventario_filtro_texto
 *   taller_inventario_filtro_proveedor
 *   taller_inventario_filtro_categoria
 *   taller_facturas_filtro
 *   taller_facturas_filtro_cliente
 *   taller_facturas_busqueda
 *   taller_facturas_ver_canceladas
 *   taller_ordenes_filtro
 *   taller_ordenes_filtro_proveedor
 *   taller_gastos_filtro
 *   taller_clientes_busqueda
 */

import { useState, useEffect, useRef } from 'react';

// Page state expires after 7 days — long enough for any work week, short enough
// to avoid surprising the user with stale filters after returning from vacation.
const PAGE_STATE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface StateEnvelope<T> {
  data: T;
  savedAt: number; // Date.now()
}

/**
 * Read persisted page state. Returns null if missing, expired, or invalid.
 * Safe to call server-side (returns null when window is undefined).
 */
function readPageState<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as StateEnvelope<T>;
    if (typeof envelope.savedAt !== 'number') return null;
    if (Date.now() - envelope.savedAt > PAGE_STATE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return envelope.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Persist page state to localStorage.
 * Silently ignores quota errors — stale UX is better than a crash.
 */
function writePageState<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: StateEnvelope<T> = { data, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * usePersistedState — drop-in replacement for useState that persists to localStorage.
 *
 * - Reads from localStorage synchronously in the useState initializer (no FOUC).
 * - Writes to localStorage with a debounce (default 300ms) on every state change.
 * - Handles SSR safely (returns defaultValue when window is undefined).
 * - TTL: 7 days. Expired entries are cleaned up on next read.
 *
 * @param key - Unique localStorage key. Use the taller_ prefix convention.
 * @param defaultValue - Value to use if nothing is persisted or if persisted data expired.
 * @param debounceMs - How long to debounce writes (default 300ms).
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  debounceMs = 300,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Synchronous read in initializer — no flash of default content on page load.
  const [value, setValue] = useState<T>(() => {
    const saved = readPageState<T>(key);
    return saved !== null ? saved : defaultValue;
  });

  // Keep key ref up to date in case the parent re-renders with a different key
  // (shouldn't happen in this app, but defensive coding is free).
  const keyRef = useRef(key);
  keyRef.current = key;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      writePageState(keyRef.current, value);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, debounceMs]);

  return [value, setValue];
}
