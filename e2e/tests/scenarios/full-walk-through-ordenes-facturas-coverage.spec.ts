import { test, expect } from '../../fixtures';

/**
 * Walk-through proof for PR #143:
 * test: coverage sprint — db unit tests & E2E change-proof for ordenes/facturas (#142 companion)
 *
 * Demonstrates: ordenes_compra and facturas modules load cleanly,
 * display Spanish content, and show no NaN/undefined values after PR #142
 * added error handling to 13 db.ts functions.
 *
 * Uses getByText() pattern for Spanish content checks (avoids innerText container issues
 * where ordenes/facturas content may not be inside <main> or [data-testid="app-content-loaded"]).
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

  await expect(page.locator('nav')).toBeVisible();

  // Tailwind error banner — stable Taller Mecánico pattern; data-testid tracked in Issue #138


  const ordenesError = page
    .locator('.bg-rose-50:has-text("Error"), .text-red-600:has-text("Error")')
    .first();
  expect(await ordenesError.isVisible().catch(() => false)).toBe(false);

  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(800);

  // Verify no NaN/undefined (body-level check — reliable across all containers)
  const ordenesBodyText = await page.locator('body').innerText().catch(() => '');
  expect(ordenesBodyText).not.toContain('NaN');
  expect(ordenesBodyText).not.toContain('[object Object]');
  expect(ordenesBodyText).not.toMatch(/\$undefined|\$null/);

  // Verify Spanish content using getByText — avoids container mismatch issues
  const ordenesSpanishTerms = [/Órdenes de Compra/i, /Orden de Compra/i, /Nueva Orden/i, /Proveedor/i, /No hay órdenes/i];
  let ordenesHasSpanish = false;
  for (const pattern of ordenesSpanishTerms) {
    if (await page.getByText(pattern).first().isVisible().catch(() => false)) {
      ordenesHasSpanish = true; break;
    }
  }
  expect(ordenesHasSpanish, 'Ordenes module must show Spanish content').toBe(true);

  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(600);

  // ── Facturas module ──────────────────────────────────────────────────────
  await dashboardPage.navigateToModule('facturas');
  await dashboardPage.waitForPageLoad();
  await page.waitForTimeout(1500);

  await expect(page.locator('nav')).toBeVisible();

  // Tailwind error banner — stable Taller Mecánico pattern; data-testid tracked in Issue #138


  const facturasError = page
    .locator('.bg-rose-50:has-text("Error"), .text-red-600:has-text("Error")')
    .first();
  expect(await facturasError.isVisible().catch(() => false)).toBe(false);

  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(800);

  const facturasBodyText = await page.locator('body').innerText().catch(() => '');
  expect(facturasBodyText).not.toContain('NaN');
  expect(facturasBodyText).not.toContain('[object Object]');
  expect(facturasBodyText).not.toMatch(/\$undefined|\$null/);

  // Verify Spanish filter labels via getByText
  const facturasSpanishTerms = [/Facturas/i, /Factura/i, /Pendiente/i, /Pagado/i, /Nueva Factura/i, /No hay facturas/i];
  let facturasHasSpanish = false;
  for (const pattern of facturasSpanishTerms) {
    if (await page.getByText(pattern).first().isVisible().catch(() => false)) {
      facturasHasSpanish = true; break;
    }
  }
  expect(facturasHasSpanish, 'Facturas module must show Spanish content').toBe(true);

  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(600);
});