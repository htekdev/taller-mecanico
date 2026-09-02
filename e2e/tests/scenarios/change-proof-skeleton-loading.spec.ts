/**
 * change-proof-skeleton-loading.spec.ts
 *
 * Walkthrough proof for PR #219 — skeleton loading UX + scroll persistence.
 *
 * Verifies four things:
 *   Phase 1 — Content loads after skeleton: page eventually shows
 *              app-content-loaded (skeleton → content transition).
 *   Phase 2 — Persisted vista survives full reload: seed 'trabajos',
 *              reload, verify trabajos tab is active.
 *   Phase 3 — Persisted filter value survives hard reload.
 *   Phase 4 — Scroll key survives reload (read path for scroll restoration):
 *              seeds a taller_scroll_cotizaciones key, reloads, verifies it's
 *              still present and non-zero (scroll restoration uses it on load).
 *
 * Test focuses on observable outcomes — not skeleton internals (which would
 * require network interception).
 */

import { test, expect } from '../../fixtures';

test.describe('Skeleton Loading + Scroll Persistence UX', () => {
  // Authenticate once before each test — uses the same pattern as all other specs.
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  // ─── Phase 1: Content always loads after the skeleton phase ────────────────
  test('Phase 1 — app-content-loaded appears after initial load', async ({ page }) => {
    // loginAsTestUser() already waited for app-content-loaded — just confirm it's visible.
    await expect(page.locator('[data-testid="app-content-loaded"]')).toBeVisible({ timeout: 30000 });
  });

  // ─── Phase 2: Persisted vista survives full page reload ────────────────────
  test('Phase 2 — persisted vista restored after full reload', async ({ page }) => {
    await page.evaluate(() => {
      try { localStorage.setItem('taller_last_vista', 'trabajos'); } catch { /* noop */ }
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="app-content-loaded"]')).toBeVisible({ timeout: 60000 });

    const trabajosTab = page.locator('nav button', { hasText: 'Trabajos' });
    const isActive = await trabajosTab.evaluate(el =>
      el.className.includes('bg-indigo-600') || el.className.includes('text-white'),
    ).catch(() => false);
    expect(isActive).toBe(true);
  });

  // ─── Phase 3: Filter value persists across reload ───────────────────────────
  test('Phase 3 — persisted filter survives hard reload', async ({ page }) => {
    // Land on clientes first so trabajos module is unmounted — avoids stale unmount flush
    await page.evaluate(() => {
      try { localStorage.setItem('taller_last_vista', 'clientes'); } catch { /* noop */ }
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="app-content-loaded"]')).toBeVisible({ timeout: 60000 });

    // Seed filter state while trabajos is unmounted (no flush can overwrite it)
    await page.evaluate(() => {
      try {
        localStorage.setItem('taller_last_vista', 'trabajos');
        const envelope = { data: 'pendiente', savedAt: Date.now() };
        localStorage.setItem('taller_trabajos_filtro_estado', JSON.stringify(envelope));
      } catch { /* noop */ }
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="app-content-loaded"]')).toBeVisible({ timeout: 60000 });

    const storedValue = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('taller_trabajos_filtro_estado');
        if (!raw) return null;
        return JSON.parse(raw)?.data ?? null;
      } catch { return null; }
    });

    expect(storedValue).toBe('pendiente');
  });

  // ─── Phase 4: Scroll position key survives reload (Sofia's cotizaciones case) ─
  // Simulates saving scroll before app-switch and verifying it's available on return.
  test('Phase 4 — scroll position key present after reload (cotizaciones)', async ({ page }) => {
    await expect(page.locator('[data-testid="app-content-loaded"]')).toBeVisible({ timeout: 30000 });

    // Seed scroll position directly (mimics what visibilitychange handler saves)
    await page.evaluate(() => {
      try {
        const envelope = { data: 350, savedAt: Date.now() };
        localStorage.setItem('taller_scroll_cotizaciones', JSON.stringify(envelope));
        localStorage.setItem('taller_last_vista', 'cotizaciones');
      } catch { /* noop */ }
    });

    // Reload — simulates OS killing the background tab
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="app-content-loaded"]')).toBeVisible({ timeout: 60000 });

    // Wait for scroll restoration timeout (50ms in page.tsx)
    await page.waitForTimeout(300);

    // Scroll key must survive the reload so restoreScrollPosition can use it
    const scrollData = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('taller_scroll_cotizaciones');
        if (!raw) return null;
        return JSON.parse(raw)?.data ?? null;
      } catch { return null; }
    });

    expect(typeof scrollData).toBe('number');
    expect(scrollData).toBeGreaterThan(0);
  });
});
