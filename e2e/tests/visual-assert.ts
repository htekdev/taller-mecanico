import { Locator, Page, expect } from '@playwright/test';

/**
 * Visual Assertion Helpers — Taller Mecánico E2E
 *
 * Wraps standard Playwright assertions with PULSING visual highlighting.
 * For use in recorded test videos to clearly show what is being validated.
 *
 * Colors:
 * - Green (#00ff00) = visibility/existence
 * - Blue (#3b82f6) = content/value
 * - Yellow (#fbbf24) = state (disabled, class)
 * - Magenta (#e879f9) = data persistence/values
 * - Cyan (#22d3ee) = navigation/flow
 */

const HIGHLIGHT_DURATION = 400;
const FLASH_DURATION = 200;

const pageAssertionCounts = new WeakMap<Page, number>();

function getCount(page: Page): number {
  return pageAssertionCounts.get(page) || 0;
}

function incrementCount(page: Page): number {
  const count = getCount(page) + 1;
  pageAssertionCounts.set(page, count);
  return count;
}

async function updateAssertionCounter(page: Page, count: number) {
  await page.evaluate(({ count }) => {
    let counter = document.getElementById('__e2e_assert_counter');
    if (!counter) {
      counter = document.createElement('div');
      counter.id = '__e2e_assert_counter';
      counter.style.cssText = `
        position: fixed; top: 12px; left: 12px; z-index: 999999;
        background: rgba(0,0,0,0.9); color: #4ade80; font-size: 13px;
        font-weight: bold; padding: 6px 12px; border-radius: 6px;
        font-family: monospace; pointer-events: none;
        border: 1px solid #4ade80;
      `;
      document.body.appendChild(counter);
    }
    counter.textContent = `✓ ${count} passed`;
  }, { count }).catch(() => {});
}

async function injectPulseStyle(page: Page) {
  await page.evaluate(() => {
    if (!document.getElementById('__e2e_pulse_style')) {
      const style = document.createElement('style');
      style.id = '__e2e_pulse_style';
      style.textContent = `
        @keyframes e2ePulse {
          0%, 100% { box-shadow: 0 0 4px 2px currentColor; }
          50% { box-shadow: 0 0 12px 6px currentColor; }
        }
      `;
      document.head.appendChild(style);
    }
  }).catch(() => {});
}

async function highlight(locator: Locator, color: string, label?: string) {
  try { await locator.scrollIntoViewIfNeeded({ timeout: 3_000 }); } catch {}
  await injectPulseStyle(locator.page());

  await locator.evaluate((el, { color, label }) => {
    el.style.color = color;
    el.style.boxShadow = `0 0 8px 4px ${color}`;
    el.style.animation = 'e2ePulse 0.6s ease-in-out infinite';
    el.style.borderRadius = el.style.borderRadius || '4px';
    if (label) {
      const tag = document.createElement('div');
      tag.id = '__e2e_assert_label';
      tag.textContent = label;
      tag.style.cssText = `
        position: absolute; top: -30px; left: 0; z-index: 99999;
        background: ${color}; color: #000; font-size: 11px; font-weight: bold;
        padding: 3px 10px; border-radius: 4px; white-space: nowrap;
        font-family: monospace; pointer-events: none;
      `;
      el.style.position = el.style.position || 'relative';
      el.appendChild(tag);
    }
  }, { color, label }).catch(() => {});

  await locator.page().waitForTimeout(HIGHLIGHT_DURATION);
}

async function removeHighlight(locator: Locator) {
  await locator.evaluate((el) => {
    el.style.boxShadow = '';
    el.style.animation = '';
    el.style.color = '';
    const label = el.querySelector('#__e2e_assert_label');
    if (label) label.remove();
  }).catch(() => {});
}

async function flashResult(locator: Locator, passed: boolean) {
  const color = passed ? '#4ade80' : '#ef4444';
  await locator.evaluate((el, color) => {
    el.style.animation = '';
    el.style.boxShadow = `0 0 12px 6px ${color}`;
  }, color).catch(() => {});
  await locator.page().waitForTimeout(FLASH_DURATION);
  await removeHighlight(locator);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Assert element is visible with green pulsing highlight. */
export async function expectVisible(locator: Locator, label?: string) {
  const page = locator.page();
  await highlight(locator, '#00ff00', label || '✓ visible');
  await expect(locator).toBeVisible();
  const count = incrementCount(page);
  await updateAssertionCounter(page, count);
  await flashResult(locator, true);
}

/** Assert element is NOT visible. */
export async function expectHidden(locator: Locator, label?: string) {
  const page = locator.page();
  await expect(locator).not.toBeVisible();
  const count = incrementCount(page);
  await updateAssertionCounter(page, count);
}

/** Assert element contains specific text with blue pulsing highlight. */
export async function expectText(locator: Locator, text: string | RegExp, label?: string) {
  const page = locator.page();
  await highlight(locator, '#3b82f6', label || `✓ "${text}"`);
  if (typeof text === 'string') {
    await expect(locator).toContainText(text);
  } else {
    await expect(locator).toHaveText(text);
  }
  const count = incrementCount(page);
  await updateAssertionCounter(page, count);
  await flashResult(locator, true);
}

/** Assert element has a specific CSS class with yellow highlight. */
export async function expectClass(locator: Locator, classPattern: RegExp, label?: string) {
  const page = locator.page();
  await highlight(locator, '#fbbf24', label || '✓ class');
  await expect(locator).toHaveClass(classPattern);
  const count = incrementCount(page);
  await updateAssertionCounter(page, count);
  await flashResult(locator, true);
}

/** Assert element is disabled with yellow highlight. */
export async function expectDisabled(locator: Locator, label?: string) {
  const page = locator.page();
  await highlight(locator, '#fbbf24', label || '✓ disabled');
  await expect(locator).toBeDisabled();
  const count = incrementCount(page);
  await updateAssertionCounter(page, count);
  await flashResult(locator, true);
}

/** Assert element is enabled with green highlight. */
export async function expectEnabled(locator: Locator, label?: string) {
  const page = locator.page();
  await highlight(locator, '#00ff00', label || '✓ enabled');
  await expect(locator).toBeEnabled();
  const count = incrementCount(page);
  await updateAssertionCounter(page, count);
  await flashResult(locator, true);
}

/** Assert element has a specific value with magenta highlight. */
export async function expectValue(locator: Locator, value: string, label?: string) {
  const page = locator.page();
  await highlight(locator, '#e879f9', label || `✓ value="${value}"`);
  await expect(locator).toHaveValue(value);
  const count = incrementCount(page);
  await updateAssertionCounter(page, count);
  await flashResult(locator, true);
}

/** Assert element count matches expected. */
export async function expectCount(locator: Locator, count: number, label?: string) {
  const page = locator.page();
  await expect(locator).toHaveCount(count);
  const c = incrementCount(page);
  await updateAssertionCounter(page, c);
}

/** Assert URL matches pattern. */
export async function expectURL(page: Page, pattern: string | RegExp) {
  await expect(page).toHaveURL(pattern);
  const count = incrementCount(page);
  await updateAssertionCounter(page, count);
}

/** Visual phase label overlay — marks phases in video recording. */
export async function showPhaseLabel(page: Page, text: string, duration = 250) {
  if (page.isClosed()) return;

  try {
    await page.evaluate(({ text }) => {
      const prev = document.getElementById('__e2e_phase_label');
      if (prev) prev.remove();
      const overlay = document.createElement('div');
      overlay.id = '__e2e_phase_label';
      overlay.textContent = text;
      overlay.style.cssText = `
        position: fixed; top: 12px; right: 12px; z-index: 999999;
        background: rgba(0,0,0,0.9); color: #fff; font-size: 16px;
        font-weight: bold; padding: 10px 20px; border-radius: 10px;
        font-family: system-ui, sans-serif; pointer-events: none;
        border: 2px solid rgba(255,255,255,0.3);
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      `;
      document.body.appendChild(overlay);
    }, { text });
    await page.waitForTimeout(duration);
    if (!page.isClosed()) {
      await page.evaluate(() => {
        const el = document.getElementById('__e2e_phase_label');
        if (el) el.remove();
      });
    }
  } catch {
    // Best-effort visual aid only.
  }
}
