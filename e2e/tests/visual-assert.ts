import { Locator, Page, expect } from '@playwright/test';

/**
 * Visual Assertion Helpers — Taller Mecánico E2E
 *
 * Wraps standard Playwright assertions with visual highlighting so that
 * anyone watching the recorded video can SEE what element is being validated.
 *
 * Each assertion:
 * 1. Scrolls the element into view
 * 2. Draws a colored highlight border around the target
 * 3. Optionally shows a floating label explaining the assertion
 * 4. Pauses briefly (visible in video recording)
 * 5. Performs the actual assertion
 * 6. Flashes green (pass) or red (fail)
 * 7. Removes the highlight
 *
 * Colors:
 * - Green (#00ff00) = asserting visibility/existence
 * - Blue (#3b82f6) = asserting content/value
 * - Yellow (#fbbf24) = asserting state (disabled, class, etc.)
 * - Red (#ef4444) = asserting absence/hidden
 */

const HIGHLIGHT_DURATION = 400; // ms — visible in video at 30fps
const FLASH_DURATION = 200;

interface HighlightOptions {
  color?: string;
  label?: string;
  duration?: number;
}

async function highlight(locator: Locator, options: HighlightOptions = {}) {
  const { color = '#00ff00', label, duration = HIGHLIGHT_DURATION } = options;

  try {
    await locator.scrollIntoViewIfNeeded({ timeout: 3_000 });
  } catch {
    // Element might not be scrollable — continue anyway
  }

  await locator.evaluate(
    (el, { color, label }) => {
      // Add highlight
      el.style.outline = `3px solid ${color}`;
      el.style.outlineOffset = '3px';
      el.style.transition = 'outline 0.15s ease-in-out';

      // Add floating label if provided
      if (label) {
        const tag = document.createElement('div');
        tag.id = '__e2e_assert_label';
        tag.textContent = label;
        tag.style.cssText = `
          position: absolute; top: -28px; left: 0; z-index: 99999;
          background: ${color}; color: #000; font-size: 11px; font-weight: bold;
          padding: 2px 8px; border-radius: 4px; white-space: nowrap;
          font-family: monospace; pointer-events: none;
        `;
        el.style.position = el.style.position || 'relative';
        el.appendChild(tag);
      }
    },
    { color, label }
  ).catch(() => {});

  await locator.page().waitForTimeout(duration);
}

async function removeHighlight(locator: Locator) {
  await locator.evaluate((el) => {
    el.style.outline = '';
    el.style.outlineOffset = '';
    el.style.transition = '';
    const label = el.querySelector('#__e2e_assert_label');
    if (label) label.remove();
  }).catch(() => {});
}

async function flashResult(locator: Locator, passed: boolean) {
  const color = passed ? '#00ff00' : '#ef4444';
  await locator.evaluate(
    (el, color) => {
      el.style.outline = `4px solid ${color}`;
      el.style.outlineOffset = '2px';
    },
    color
  ).catch(() => {});
  await locator.page().waitForTimeout(FLASH_DURATION);
  await removeHighlight(locator);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Assert element is visible with green highlight in video.
 */
export async function expectVisible(locator: Locator, label?: string) {
  await highlight(locator, { color: '#00ff00', label: label || '✓ visible' });
  await expect(locator).toBeVisible();
  await flashResult(locator, true);
}

/**
 * Assert element is NOT visible with red highlight on the page area.
 */
export async function expectHidden(locator: Locator, label?: string) {
  // Can't highlight something that's hidden — highlight the page instead
  await expect(locator).not.toBeVisible();
}

/**
 * Assert element contains specific text with blue highlight.
 */
export async function expectText(locator: Locator, text: string | RegExp, label?: string) {
  await highlight(locator, { color: '#3b82f6', label: label || `✓ "${text}"` });
  if (typeof text === 'string') {
    await expect(locator).toContainText(text);
  } else {
    await expect(locator).toHaveText(text);
  }
  await flashResult(locator, true);
}

/**
 * Assert element has a specific CSS class with yellow highlight.
 */
export async function expectClass(locator: Locator, classPattern: RegExp, label?: string) {
  await highlight(locator, { color: '#fbbf24', label: label || `✓ class ${classPattern}` });
  await expect(locator).toHaveClass(classPattern);
  await flashResult(locator, true);
}

/**
 * Assert element is disabled with yellow highlight.
 */
export async function expectDisabled(locator: Locator, label?: string) {
  await highlight(locator, { color: '#fbbf24', label: label || '✓ disabled' });
  await expect(locator).toBeDisabled();
  await flashResult(locator, true);
}

/**
 * Assert element is enabled with green highlight.
 */
export async function expectEnabled(locator: Locator, label?: string) {
  await highlight(locator, { color: '#00ff00', label: label || '✓ enabled' });
  await expect(locator).toBeEnabled();
  await flashResult(locator, true);
}

/**
 * Assert element has a specific value with blue highlight.
 */
export async function expectValue(locator: Locator, value: string, label?: string) {
  await highlight(locator, { color: '#3b82f6', label: label || `✓ value="${value}"` });
  await expect(locator).toHaveValue(value);
  await flashResult(locator, true);
}

/**
 * Assert a count of elements matching a locator.
 */
export async function expectCount(locator: Locator, count: number, label?: string) {
  await expect(locator).toHaveCount(count);
}

/**
 * Visual pause with a label overlay on the page — useful for marking
 * test phases in the video (e.g., "Step 3: Creating cotización").
 */
export async function showPhaseLabel(page: Page, text: string, duration = 800) {
  await page.evaluate(
    ({ text }) => {
      const overlay = document.createElement('div');
      overlay.id = '__e2e_phase_label';
      overlay.textContent = text;
      overlay.style.cssText = `
        position: fixed; top: 12px; right: 12px; z-index: 999999;
        background: rgba(0,0,0,0.85); color: #fff; font-size: 14px;
        font-weight: bold; padding: 8px 16px; border-radius: 8px;
        font-family: system-ui, sans-serif; pointer-events: none;
        animation: fadeIn 0.2s ease-in;
      `;
      document.body.appendChild(overlay);
    },
    { text }
  );
  await page.waitForTimeout(duration);
  await page.evaluate(() => {
    const el = document.getElementById('__e2e_phase_label');
    if (el) el.remove();
  });
}
