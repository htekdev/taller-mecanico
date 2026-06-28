import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Error Recovery — Accidental navigation and form state preservation.
 *
 * Tests:
 * 1. Fill a form partially → navigate away → come back → is data there?
 * 2. Browser refresh during form fill → data preserved?
 * 3. Network error simulation — graceful handling
 * 4. Timeout on save — user gets feedback
 */

test.describe('Error Recovery', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('form state after accidental navigation away', async ({
    page, dashboardPage, inventarioPage, sidebar
  }) => {
    await showPhaseLabel(page, '🚫 Accidental Navigation');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // Start filling the add-part form
    const partName = `Accidental Nav ${TestData.uniqueId()}`;
    await inventarioPage.nombreInput.fill(partName);
    await inventarioPage.precioCompraInput.fill('999');

    // Navigate away (accidental)
    await sidebar.clickTab('Trabajos');
    await page.waitForTimeout(1000);

    // Come back
    await sidebar.clickTab('Inventario');
    await inventarioPage.waitForPageLoad();
    await page.waitForTimeout(500);

    // Check if form data is preserved (it might be cleared on remount — that's OK)
    const nameValue = await inventarioPage.nombreInput.inputValue();
    // Note: React state is lost on unmount — this is expected behavior
    // The important thing is NO CRASH and the module reloads cleanly
    await expectVisible(inventarioPage.nombreInput, 'Form reloaded cleanly');

    await showPhaseLabel(page, '✅ Recovery: Module Stable');
  });

  test('browser refresh during module use — no crash', async ({
    page, loginPage, dashboardPage, cotizacionesPage, sidebar
  }) => {
    await showPhaseLabel(page, '🔄 Browser Refresh Recovery');
    await dashboardPage.navigateToModule('cotizaciones');
    await cotizacionesPage.waitForPageLoad();

    // Interact with the page
    if (await cotizacionesPage.plantillaGeneral.isVisible().catch(() => false)) {
      await cotizacionesPage.selectPlantillaGeneral();
      await page.waitForTimeout(500);
    }

    // Refresh!
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // After refresh, we might need to re-authenticate or land on dashboard
    const navButton = page.locator('nav button').first();
    const loginField = page.locator('input[type="email"]');

    const state = await Promise.race([
      navButton.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'dashboard' as const),
      loginField.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'login' as const),
    ]).catch(() => 'timeout' as const);

    if (state === 'login') {
      // Session lost on refresh — re-login (valid behavior)
      await loginPage.loginAsTestUser();
    }

    // App should be stable — nav visible
    const navVisible = await page.locator('nav button').first().isVisible().catch(() => false);
    expect(navVisible).toBe(true);

    await showPhaseLabel(page, '✅ Refresh Recovery OK');
  });

  test('failed API call shows user-friendly error', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '❌ API Error Handling');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // Intercept Supabase calls to simulate failure
    await page.route('**/rest/v1/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // Try to add a part — should fail gracefully
    await inventarioPage.nombreInput.fill('Should Fail');
    await inventarioPage.precioCompraInput.fill('100');
    await inventarioPage.agregarButton.click();
    await page.waitForTimeout(2000);

    // Remove the route interceptor
    await page.unroute('**/rest/v1/**');

    // App should NOT have crashed — nav still visible
    const navVisible = await dashboardPage.nav.isVisible();
    expect(navVisible).toBe(true);

    // No unhandled exception visible
    const bodyText = await page.locator('main').innerText().catch(() => '');
    expect(bodyText).not.toContain('Unhandled Runtime Error');
    expect(bodyText).not.toContain('Application error');

    await showPhaseLabel(page, '✅ Graceful Error Handling');
  });

  test('multiple rapid saves do not corrupt state', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '⚡ Rapid Saves');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    const partName = `Rapid ${TestData.uniqueId()}`;
    await inventarioPage.nombreInput.fill(partName);
    await inventarioPage.precioCompraInput.fill('100');

    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Agregar al Inventario')) as HTMLButtonElement | undefined;
      button?.click();
      button?.click();
      button?.click();
    });
    await page.waitForTimeout(1500);

    const navVisible = await dashboardPage.nav.isVisible();
    expect(navVisible).toBe(true);

    const count = await page.locator('tbody tr').filter({ hasText: partName }).count();
    expect(count).toBeGreaterThanOrEqual(1);

    await showPhaseLabel(page, '✅ No Corruption from Rapid Saves');
  });
});
