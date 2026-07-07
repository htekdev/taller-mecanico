import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * Change-proof spec: ordenes_compra & facturas error handling
 * PR: fix(prod-readiness): surface silent update failures in ordenes_compra & facturas (#142)
 *
 * Validates that both modules load cleanly and display no NaN/undefined values
 * after adding throw-on-error to 13 db.ts functions (updateOrden, updateFacturaFecha,
 * updateFacturaNumero, updateFacturaConceptos, updateTrabajoTotales,
 * cancelarFactura, reactivarFactura, cancelarNota, reactivarNota, and friends).
 *
 * Tests:
 * 1. ordenes_compra module loads without crash
 * 2. ordenes_compra shows Spanish content
 * 3. ordenes_compra monetary values contain no NaN/undefined
 * 4. facturas module loads without crash
 * 5. facturas monetary values contain no NaN/undefined
 * 6. facturas filter tabs render in Spanish
 */

test.describe('change-proof-ordenes-facturas-silent-failures', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('ordenes_compra module loads without crash', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '📦 Navegando a Órdenes de Compra');
    await dashboardPage.navigateToModule('ordenes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // Nav still visible — app did not crash
    await expectVisible(dashboardPage.nav, 'Nav visible after ordenes load');

    // No fatal error banner visible
    const errorBanner = page
      .locator('.bg-rose-50:has-text("Error"), .text-red-600:has-text("Error")')
      .first();
    const hasCriticalError = await errorBanner.isVisible().catch(() => false);
    expect(hasCriticalError).toBe(false);

    await showPhaseLabel(page, '✅ Órdenes cargó OK');
  });

  test('ordenes_compra shows Spanish content', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🏷️ Revisando etiquetas en Órdenes');
    await dashboardPage.navigateToModule('ordenes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    const mainText = await page.locator('main').innerText().catch(() => '');

    // Module should contain Spanish-language content (not a blank or error-only page)
    expect(mainText.length).toBeGreaterThan(10);

    // Should contain at least one Spanish term from the ordenes module
    const hasSpanishContent =
      mainText.includes('Orden') ||
      mainText.includes('Compra') ||
      mainText.includes('Proveedor') ||
      mainText.includes('Estado') ||
      mainText.includes('Total');
    expect(hasSpanishContent).toBe(true);

    await showPhaseLabel(page, '✅ Contenido español OK');
  });

  test('ordenes_compra monetary values contain no NaN or undefined', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '💰 Verificando valores monetarios en Órdenes');
    await dashboardPage.navigateToModule('ordenes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(2000);

    const mainText = await page.locator('main').innerText().catch(() => '');
    expect(mainText).not.toContain('NaN');
    expect(mainText).not.toContain('undefined');
    expect(mainText).not.toContain('Infinity');

    await showPhaseLabel(page, '✅ Valores OK sin NaN');
  });

  test('facturas module loads without crash', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🧾 Navegando a Facturas');
    await dashboardPage.navigateToModule('facturas');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // Nav still visible — app did not crash
    await expectVisible(dashboardPage.nav, 'Nav visible after facturas load');

    // No fatal error banner visible
    const errorBanner = page
      .locator('.bg-rose-50:has-text("Error"), .text-red-600:has-text("Error")')
      .first();
    const hasCriticalError = await errorBanner.isVisible().catch(() => false);
    expect(hasCriticalError).toBe(false);

    await showPhaseLabel(page, '✅ Facturas cargó OK');
  });

  test('facturas monetary values contain no NaN or undefined', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '💰 Verificando valores en Facturas');
    await dashboardPage.navigateToModule('facturas');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(2000);

    const mainText = await page.locator('main').innerText().catch(() => '');
    expect(mainText).not.toContain('NaN');
    expect(mainText).not.toContain('undefined');
    expect(mainText).not.toContain('Infinity');

    await showPhaseLabel(page, '✅ Facturas Values OK sin NaN');
  });

  test('facturas filter tabs and section labels render in Spanish', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔍 Verificando filtros de Facturas en español');
    await dashboardPage.navigateToModule('facturas');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1500);

    const mainText = await page.locator('main').innerText().catch(() => '');

    // Filter tabs: Todos / Pendiente / Parcial / Pagado — at least one should be present
    const hasSpanishFilterTerms =
      mainText.includes('Pendiente') ||
      mainText.includes('Pagado') ||
      mainText.includes('Todos') ||
      mainText.includes('Factura');
    expect(hasSpanishFilterTerms).toBe(true);

    // No English-only error text that would indicate the module failed to load
    expect(mainText).not.toContain('Error loading');
    expect(mainText).not.toContain('Something went wrong');

    await showPhaseLabel(page, '✅ Filtros en español OK');
  });
});