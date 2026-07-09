import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withRetry } from '@/e2e/utils/helpers';

/**
 * Unit tests for E2E utility helpers.
 *
 * Tests:
 * - withRetry: resolves immediately when fn succeeds on first try
 * - withRetry: retries on failure and eventually resolves
 * - withRetry: rejects after exhausting all retries
 * - withRetry: correct total call count with default options
 */

describe('withRetry()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when fn succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const promise = withRetry(fn, { retries: 2, delayMs: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and resolves when fn eventually succeeds', async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls < 3) throw new Error('temporary failure');
      return 'success';
    });
    const promise = withRetry(fn, { retries: 3, delayMs: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('rejects with the last error after exhausting all retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));
    const promise = withRetry(fn, { retries: 2, delayMs: 100 });
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow('persistent failure');
    // 1 initial attempt + 2 retries = 3 total calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('default options: retries 3 times (4 total calls)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const promise = withRetry(fn);
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow('fail');
    // 1 initial attempt + 3 retries = 4 total calls
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
