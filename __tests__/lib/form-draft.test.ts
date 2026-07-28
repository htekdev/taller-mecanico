import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readDraft, writeDraft, clearDraft } from '@/app/lib/form-draft';

// ── helpers ──────────────────────────────────────────────────────────────────

interface TestData {
  name: string;
  value: number;
}

const KEY = 'test_draft_key';
const SAMPLE: TestData = { name: 'taller', value: 42 };

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

// ── readDraft ─────────────────────────────────────────────────────────────────

describe('readDraft', () => {
  it('returns null when key does not exist', () => {
    expect(readDraft(KEY)).toBeNull();
  });

  it('returns data that was written', () => {
    writeDraft<TestData>(KEY, SAMPLE);
    const result = readDraft<TestData>(KEY);
    expect(result).toEqual(SAMPLE);
  });

  it('returns null for corrupted JSON', () => {
    localStorage.setItem(KEY, 'not-valid-json{{{');
    expect(readDraft(KEY)).toBeNull();
  });

  it('returns null when envelope is missing savedAt', () => {
    localStorage.setItem(KEY, JSON.stringify({ data: SAMPLE }));
    expect(readDraft(KEY)).toBeNull();
  });

  it('returns null for expired draft (>48h) and removes it from storage', () => {
    const OLD_TS = Date.now() - (49 * 60 * 60 * 1000); // 49 hours ago
    localStorage.setItem(KEY, JSON.stringify({ data: SAMPLE, savedAt: OLD_TS }));
    expect(readDraft(KEY)).toBeNull();
    // Should have cleaned up the key
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('returns data for draft saved recently (within TTL)', () => {
    const RECENT_TS = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    localStorage.setItem(KEY, JSON.stringify({ data: SAMPLE, savedAt: RECENT_TS }));
    expect(readDraft<TestData>(KEY)).toEqual(SAMPLE);
  });

  it('returns null in SSR environment (window undefined)', () => {
    const win = global.window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window = undefined;
    try {
      expect(readDraft(KEY)).toBeNull();
    } finally {
      global.window = win;
    }
  });
});

// ── writeDraft ────────────────────────────────────────────────────────────────

describe('writeDraft', () => {
  it('persists data that can be read back', () => {
    writeDraft<TestData>(KEY, SAMPLE);
    const result = readDraft<TestData>(KEY);
    expect(result).toEqual(SAMPLE);
  });

  it('overwrites a previous draft', () => {
    writeDraft<TestData>(KEY, SAMPLE);
    writeDraft<TestData>(KEY, { name: 'updated', value: 99 });
    const result = readDraft<TestData>(KEY);
    expect(result).toEqual({ name: 'updated', value: 99 });
  });

  it('does not throw on storage quota error', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => writeDraft<TestData>(KEY, SAMPLE)).not.toThrow();
  });

  it('is a no-op in SSR environment (window undefined)', () => {
    const win = global.window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window = undefined;
    try {
      expect(() => writeDraft<TestData>(KEY, SAMPLE)).not.toThrow();
    } finally {
      global.window = win;
    }
  });
});

// ── clearDraft ────────────────────────────────────────────────────────────────

describe('clearDraft', () => {
  it('removes a key that was written', () => {
    writeDraft<TestData>(KEY, SAMPLE);
    expect(readDraft(KEY)).not.toBeNull();
    clearDraft(KEY);
    expect(readDraft(KEY)).toBeNull();
  });

  it('is safe to call on a key that does not exist', () => {
    expect(() => clearDraft('nonexistent_key')).not.toThrow();
  });

  it('is a no-op in SSR environment (window undefined)', () => {
    writeDraft<TestData>(KEY, SAMPLE);
    const win = global.window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window = undefined;
    try {
      expect(() => clearDraft(KEY)).not.toThrow();
    } finally {
      global.window = win;
    }
  });
});
