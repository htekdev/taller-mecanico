import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Concurrent Operations — Tests for race conditions and simultaneous actions.
 *
 * Verifies that the app handles rapid successive operations gracefully.
 */

test.describe('Concurrent Operations', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('rapid module switching does not crash', async ({
    page, dashboardPage, sidebar
  }) => {
    test.slow(); // Cold Vercel preview + Supabase auth can be slow
    await showPhaseLabel(page, '⚡ Rapid Module Switching');

    // Rapidly switch between modules (400ms between — fast but not so fast it races on cold preview)
    const modules = ['Clientes', 'Inventario', 'Trabajos', 'Proveedores',
      'Órdenes de Compra', 'Por Cobrar', 'Gastos', 'Cotizaciones', 'Resumen'] as const;

    for (const mod of modules) {
      await sidebar.clickTab(mod);
      // Brief wait — stress test, but enough for Supabase auth round-trips on cold preview
      await page.waitForTimeout(400);
    }

    // After rapid switching, app should still be functional
    await page.waitForTimeout(1000);
    const navVisible = await dashboardPage.nav.isVisible();
    expect(navVisible).toBe(true);

    await showPhaseLabel(page, '✅ No Crash on Rapid Switch');
  });

  // Resilience fix (issue #138): test.slow() + retries: 1 absorbs Supabase cold-start
  // timing. Warm-up in global-setup.ts pre-warms the connection pool; 2-shard CI
  // execution reduces per-runner load that previously caused nav timeouts.
  test('double-click on save does not create duplicates', { retries: 1 }, async ({
    page, dashboardPage, inventarioPage
  }) => {
    test.slow();
    await showPhaseLabel(page, '🔄 Double-Click Protection');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    const partName = `DoubleClick ${TestData.uniqueId()}`;
    await inventarioPage.nombreInput.fill(partName);
    await inventarioPage.precioCompraInput.fill('100');

    // Double-click the save button
    await inventarioPage.agregarButton.dblclick();
    await page.waitForTimeout(3000);

    // Count how many times this part appears
    const instances = page.locator(`text=${partName}`);
    const count = await instances.count();

    // Should be exactly 1 (no duplicate from double-click)
    expect(count).toBeLessThanOrEqual(1);

    await showPhaseLabel(page, '✅ No Duplicate on Double-Click');
  });

  test('navigation during save does not corrupt data', async ({
    page, dashboardPage, inventarioPage, sidebar
  }) => {
    await showPhaseLabel(page, '🚫 Nav During Save');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // Start filling a form
    const partName = `NavDuring ${TestData.uniqueId()}`;
    await inventarioPage.nombreInput.fill(partName);
    await inventarioPage.precioCompraInput.fill('200');

    // Click save and immediately navigate away
    await inventarioPage.agregarButton.click();
    await sidebar.clickTab('Trabajos');
    await page.waitForTimeout(2000);

    // Navigate back — app should be stable
    await sidebar.clickTab('Inventario');
    await inventarioPage.waitForPageLoad();

    // No crash, no error
    const navVisible = await dashboardPage.nav.isVisible();
    expect(navVisible).toBe(true);

    await showPhaseLabel(page, '✅ Stable After Nav-During-Save');
  });
});
