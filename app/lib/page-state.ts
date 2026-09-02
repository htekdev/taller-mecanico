/**
 * page-state.ts
 *
 * Lightweight page-state persistence layer.
 * Saves per-module UI state (filters, search text, active tabs, scroll position,
 * expanded rows) to localStorage so users return to exactly where they left off.
 *
 * This is intentionally separate from form-draft.ts — form drafts preserve
 * in-progress form data (48h TTL, cleared on save), while page state preserves
 * navigation choices (7-day TTL, never cleared — they just expire).
 *
 * Two main exports:
 *   usePersistedState   — drop-in useState replacement for filters/tabs/search
 *   saveScrollPosition  — imperative save of window.scrollY for a module key
 *   restoreScrollPosition — imperative restore (call after content renders)
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
 *   taller_inventario_expandido
 *   taller_facturas_filtro
 *   taller_facturas_filtro_cliente
 *   taller_facturas_busqueda
 *   taller_facturas_ver_canceladas
 *   taller_facturas_expandido
 *   taller_ordenes_filtro
 *   taller_ordenes_filtro_proveedor
 *   taller_ordenes_expandido
 *   taller_gastos_filtro
 *   taller_clientes_busqueda
 *   taller_clientes_expandido
 *   taller_scroll_{vista}
 */

import { useState, useEffect, useLayoutEffect, useRef } from 'react';

// SSR safety: Next.js pre-renders Client Components on the server. useLayoutEffect
// emits a warning when called during server rendering even in client components.
// This isomorphic version uses useLayoutEffect on the client (synchronous, before
// paint — critical for the valueRef timing guarantee) and silently falls back to
// useEffect on the server (where the effect body is a no-op ref assignment anyway).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// ─── Global visibilitychange flush registry ────────────────────────────────
//
// Problem: On mobile, the OS can kill a background browser tab at any time.
// When the user switches from Taller Mecánico to WhatsApp (or any other app),
// `document.visibilityState` changes to 'hidden'. If the OS then kills the tab,
// any pending 300ms debounce timers are lost — the filters never reach localStorage.
//
// Solution: maintain a module-level Set of flush functions. Each usePersistedState
// instance registers its own flush on mount and deregisters on unmount. A single
// visibilitychange listener flushes all of them the moment the app goes to background.
//
// This is safe: flush() is idempotent (writes the current value, cancels the timer).
// The debounce will not fire again after the flush because the timer is cleared.

const _pendingFlushes = new Set<() => void>();

function _registerFlush(fn: () => void): void {
  _pendingFlushes.add(fn);
}

function _deregisterFlush(fn: () => void): void {
  _pendingFlushes.delete(fn);
}

// Install the visibilitychange listener once at module load time (client only).
// Uses 'pagehide' as a fallback for iOS Safari where 'beforeunload' is unreliable
// and visibilitychange may not fire reliably on hard kills.
if (typeof window !== 'undefined') {
  const flushAll = () => {
    if (document.visibilityState === 'hidden') {
      _pendingFlushes.forEach(fn => fn());
    }
  };
  const flushAllPagehide = () => {
    _pendingFlushes.forEach(fn => fn());
  };
  document.addEventListener('visibilitychange', flushAll);
  window.addEventListener('pagehide', flushAllPagehide);
}

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
 * Save the current window scroll position for a given module key.
 * Called imperatively (before navigating away) — use from the navigation handler.
 *
 * @param moduleKey - e.g. 'trabajos', 'inventario', etc.
 */
export function saveScrollPosition(moduleKey: string): void {
  if (typeof window === 'undefined') return;
  writePageState(`taller_scroll_${moduleKey}`, Math.round(window.scrollY));
}

/**
 * Restore the saved scroll position for a given module key.
 * Call after the module content has rendered (use inside a setTimeout or
 * requestAnimationFrame to let the DOM settle first).
 *
 * Returns the restored scroll Y value, or 0 if nothing was saved.
 *
 * @param moduleKey - e.g. 'trabajos', 'inventario', etc.
 */
export function restoreScrollPosition(moduleKey: string): number {
  if (typeof window === 'undefined') return 0;
  const saved = readPageState<number>(`taller_scroll_${moduleKey}`);
  const scrollY = typeof saved === 'number' && saved >= 0 ? saved : 0;
  window.scrollTo({ top: scrollY, behavior: 'instant' });
  return scrollY;
}

/**
 * usePersistedState — drop-in replacement for useState that persists to localStorage.
 *
 * - Reads from localStorage synchronously in the useState initializer (no FOUC).
 * - Writes to localStorage with a debounce (default 300ms) on every state change.
 * - Unmount flush ensures data is saved even if navigation happens before debounce fires.
 * - visibilitychange flush ensures data is saved when user switches apps on mobile
 *   (before the OS can kill the background tab and lose the pending debounce timer).
 * - Handles SSR safely (returns defaultValue when window is undefined).
 * - TTL: 7 days. Expired entries are cleaned up on next read.
 *
 * ### Root-cause note (fix for stale-ref bug, PR #215):
 * valueRef MUST be updated via useLayoutEffect — NOT inside a regular useEffect.
 * useEffect runs async (after paint); if the user changes a filter and navigates
 * within ~50ms (before passive effects run), valueRef would be stale, causing the
 * unmount flush to write the OLD value and silently drop the user's filter change.
 * useLayoutEffect runs synchronously BEFORE paint — so valueRef is always fresh
 * before the user can interact with the page and trigger navigation.
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

  // Keep key ref in sync so the debounced write always uses the latest key.
  const keyRef = useRef(key);
  // useIsomorphicLayoutEffect: runs synchronously before paint on the client
  // (never in SSR where the ref update is a no-op anyway).
  useIsomorphicLayoutEffect(() => {
    keyRef.current = key;
  }, [key]);

  // Keep value ref in sync so the unmount flush always writes the latest value.
  // CRITICAL: use useIsomorphicLayoutEffect (not useEffect) here.
  // useEffect runs async (after paint) — if the user changes a filter and navigates
  // within ~16ms (before passive effects run), valueRef would be stale, causing the
  // unmount flush to write the OLD value and silently lose the user's change.
  // useIsomorphicLayoutEffect runs synchronously BEFORE paint, so valueRef is always
  // fresh before the user can click a nav button.
  const valueRef = useRef(value);
  useIsomorphicLayoutEffect(() => {
    valueRef.current = value;
  }, [value]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Register this instance's flush function with the global visibilitychange registry.
  // When the user switches apps (e.g. opens WhatsApp), document.visibilityState becomes
  // 'hidden' and all registered flushes are called immediately — before the OS can kill
  // the background tab and lose the pending 300ms debounce timer.
  // The flush function is stable (captured via closure over the stable refs) and is
  // deregistered on unmount so there are no leaks.
  useEffect(() => {
    const flush = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      writePageState(keyRef.current, valueRef.current);
    };
    _registerFlush(flush);
    return () => _deregisterFlush(flush);
  }, []); // intentionally empty — stable flush function, registered once on mount

  // Debounced write on every value change.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      writePageState(keyRef.current, value);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, debounceMs]);

  // Unmount flush — ensures state is always persisted even if the component
  // unmounts before the debounce fires (e.g. user navigates within 300ms).
  // valueRef.current is always up-to-date: synced via useIsomorphicLayoutEffect
  // above, which runs synchronously before paint — before any user interaction
  // can trigger navigation.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      writePageState(keyRef.current, valueRef.current);
    };
  }, []); // intentionally empty — runs only on unmount

  return [value, setValue];
}
