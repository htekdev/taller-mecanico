import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * Change-proof: refacturarTrabajo + agregarRefaccionDesdeCotizacion PO section
 *
 * PR covers:
 * 1. refacturarTrabajo: db.resetFacturacionTrabajo now wrapped in try/catch+setErrorBanner
 * 2. agregarRefaccionDesdeCotizacion: PO creation section wrapped in try/catch (best-effort)
 *
 * These tests verify the affected modules load and render without errors.
 */

test.describe('change-proof: refacturar + PO section protection', () => {
  test.describe.configure({ retries: 1 });

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('trabajos module loads — refacturar handler accessible', async ({
    page, dashboardPage,
  }) => {
    test.slow();
    await showPhaseLabel(page, '🔧 Phase 1: Trabajos module load');
    await dashboardPage.navigateToModule('trabajos');
    await dashboardPage.waitForPageLoad();

    // Module renders without crash
    const nav = dashboardPage.nav;
    await expect(nav).toBeVisible({ timeout: 30_000 });

    // No critical error banner visible
    const errorBanner = page
      .locator('.bg-rose-50, [class*="error-banner"]')
      .filter({ hasText: /error.*conexión|error.*cargando/i })
      .first();
    const hasCriticalError = await errorBanner.isVisible().catch(() => false);
    expect(hasCriticalError).toBe(false);

    await showPhaseLabel(page, '✅ Trabajos module OK');
  });

  test('facturas module loads — generarFactura path accessible', async ({
    page, dashboardPage,
  }) => {
    test.slow();
    await showPhaseLabel(page, '📄 Phase 1: Facturas module load');
    await dashboardPage.navigateToModule('facturas');
    await dashboardPage.waitForPageLoad();

    const nav = dashboardPage.nav;
    await expect(nav).toBeVisible({ timeout: 30_000 });

    const errorBanner = page
      .locator('.bg-rose-50, [class*="error-banner"]')
      .filter({ hasText: /error.*conexión|error.*cargando/i })
      .first();
    const hasCriticalError = await errorBanner.isVisible().catch(() => false);
    expect(hasCriticalError).toBe(false);

    await showPhaseLabel(page, '✅ Facturas module OK');
  });

  test('ordenes module loads — PO creation path accessible', async ({
    page, dashboardPage,
  }) => {
    test.slow();
    await showPhaseLabel(page, '📦 Phase 1: Ordenes module load');
    await dashboardPage.navigateToModule('ordenes');
    await dashboardPage.waitForPageLoad();

    const nav = dashboardPage.nav;
    await expect(nav).toBeVisible({ timeout: 30_000 });

    const errorBanner = page
      .locator('.bg-rose-50, [class*="error-banner"]')
      .filter({ hasText: /error.*conexión|error.*cargando/i })
      .first();
    const hasCriticalError = await errorBanner.isVisible().catch(() => false);
    expect(hasCriticalError).toBe(false);

    await showPhaseLabel(page, '✅ Ordenes module OK');
  });
});
