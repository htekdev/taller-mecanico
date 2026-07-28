/**
 * form-draft.ts
 *
 * Lightweight form-draft persistence layer.
 * Saves in-progress form data to localStorage so users can navigate away
 * (switch apps on mobile, open another tab, etc.) and come back without
 * losing their entered data.
 *
 * Usage:
 *   // In your component:
 *   useEffect(() => {
 *     if (!draftKey || pantalla !== 'formulario') return;
 *     const timer = setTimeout(() => writeDraft(draftKey, { pantalla, form }), 600);
 *     return () => clearTimeout(timer);
 *   }, [draftKey, pantalla, form]);
 *
 *   // On successful submit:
 *   clearDraft(draftKey);
 */

// Drafts expire after 48 hours — plenty for a work shift, avoids stale surprises.
const DRAFT_TTL_MS = 48 * 60 * 60 * 1000;

interface DraftEnvelope<T> {
  data: T;
  savedAt: number; // Date.now()
}

/**
 * Read a saved draft. Returns null if missing, expired, or invalid.
 */
export function readDraft<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope<T>;
    if (typeof envelope.savedAt !== 'number') return null;
    if (Date.now() - envelope.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return envelope.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Persist a draft to localStorage.
 * Silently ignores quota errors — data loss is better than a crash.
 */
export function writeDraft<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: DraftEnvelope<T> = { data, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Remove a saved draft (call on successful form submission).
 */
export function clearDraft(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // noop
  }
}
