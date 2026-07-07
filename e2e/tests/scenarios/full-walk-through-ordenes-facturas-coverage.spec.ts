import { test, expect } from '../../fixtures';

/**
 * Walk-through proof for PR #143:
 * test: coverage sprint — db unit tests & E2E change-proof for ordenes/facturas (#142 companion)
 *
 * Demonstrates: ordenes_compra and facturas modules load cleanly,
 * display Spanish content, and show no NaN/undefined values after PR #142
 * added error handling to 13 db.ts functions.
 */

test('full-walk-through-ordenes-facturas-coverage', async ({ page, loginPage, dashboardPage }) => {
  // ── Login ────────────────────────────────────────────────────────────────
  await loginPage.loginAsTestUser();
  await page.locator('nav').waitFor({ state: 'visible', timeout: 45_000 });
  await page.waitForTimeout(1000);

  // ── Ordenes de Compra module ─────────────────────────────────────────────
  await dashboardPage.navigateToModule('ordenes');
  await dashboardPage.waitForPageLoad();
  await page.waitForTimeout(1500);

  // Verify nav is visible — app did not crash
  await expect(page.locator('nav')).toBeVisible();

  // Verify no fatal error banners
  const ordenesError = page
    .locator('.bg-rose-50:has-text("Error"), .text-red-600:has-text("Error")')
    .first();
  const hasOrdenesError = await ordenesError.isVisible().catch(() => false);
  expect(hasOrdenesError).toBe(false);

  // Scroll through ordenes module
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(800);

  // Verify Spanish content rendered (no NaN/undefined)
  const ordenesText = await page.locator('main').innerText().catch(() => '');
  expect(ordenesText).not.toContain('NaN');
  expect(ordenesText).not.toContain('undefined');
  expect(ordenesText).not.toContain('Infinity');
  expect(ordenesText.length).toBeGreaterThan(10);

  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(600);

  // ── Facturas module ──────────────────────────────────────────────────────
  await dashboardPage.navigateToModule('facturas');
  await dashboardPage.waitForPageLoad();
  await page.waitForTimeout(1500);

  // Verify nav is still visible — no crash
  await expect(page.locator('nav')).toBeVisible();

  // Verify no fatal error banners
  const facturasError = page
    .locator('.bg-rose-50:has-text("Error"), .text-red-600:has-text("Error")')
    .first();
  const hasFacturasError = await facturasError.isVisible().catch(() => false);
  expect(hasFacturasError).toBe(false);

  // Scroll through facturas module
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(800);

  // Verify Spanish content and no NaN/undefined
  const facturasText = await page.locator('main').innerText().catch(() => '');
  expect(facturasText).not.toContain('NaN');
  expect(facturasText).not.toContain('undefined');
  expect(facturasText).not.toContain('Infinity');

  // Verify Spanish filter tabs or section labels are present
  const hasSpanishLabels =
    facturasText.includes('Pendiente') ||
    facturasText.includes('Pagado') ||
    facturasText.includes('Todos') ||
    facturasText.includes('Factura');
  expect(hasSpanishLabels).toBe(true);

  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(600);
});