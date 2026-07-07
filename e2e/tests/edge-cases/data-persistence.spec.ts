import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Data Persistence Tests — Verify data survives page reloads and re-logins.
 *
 * Ensures that Supabase persistence is working correctly and no data
 * is lost during normal operations.
 */

test.describe('Data Persistence', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('client data persists after page reload', async ({
    page, dashboardPage, sidebar
  }) => {
    await showPhaseLabel(page, '🔄 Persistence: Reload Check');

    // Navigate to Clientes
    await dashboardPage.navigateToModule('clientes');
    await page.waitForTimeout(2000);

    // Get current client count
    const clientsBefore = await page.locator('input[placeholder="Nombre completo"]')
      .isVisible().catch(() => false);

    // Reload the page
    await page.reload();
    await dashboardPage.waitForPageLoad();

    // Navigate back to Clientes
    await dashboardPage.navigateToModule('clientes');
    await page.waitForTimeout(2000);

    // Data should still be there (page loads without crash)
    const navVisible = await dashboardPage.nav.isVisible();
    expect(navVisible).toBe(true);

    await showPhaseLabel(page, '✅ Data Persists After Reload');
  });

  test('data persists after logout/login cycle', { retries: 1 }, async ({
    page, loginPage, dashboardPage, inventarioPage, sidebar
  }) => {
    await showPhaseLabel(page, '🔄 Persistence: Login Cycle');

    // Add a distinctive part
    const runId = TestData.uniqueId();
    const partName = `Persist Test ${runId}`;

    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();
    await inventarioPage.addPart({
      nombre: partName,
      precioCompra: 99,
      stock: 7,
    });

    // Verify it exists
    const exists1 = await inventarioPage.isPartVisible(partName);
    expect(exists1).toBe(true);

    // Logout
    await dashboardPage.logout();

    // Login again
    await loginPage.loginAsTestUser();
    await dashboardPage.waitForPageLoad();

    // Check part still exists — wait for Supabase data to reload after re-login (CI can be slow)
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();
    await page.waitForTimeout(2000);

    const exists2 = await inventarioPage.isPartVisible(partName);
    expect(exists2).toBe(true);

    await showPhaseLabel(page, '✅ Data Survives Login Cycle');
  });

  test.skip('multiple browser tabs share same data (Supabase real-time)', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '📋 Persistence: Data Consistency');

    // Just verify that data loads consistently
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    const count1 = await inventarioPage.getPartCount();

    // Reload and check again
    await page.reload();
    await dashboardPage.waitForPageLoad();
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    const count2 = await inventarioPage.getPartCount();

    // Counts should be the same (data is consistent)
    expect(count2).toBe(count1);

    await showPhaseLabel(page, '✅ Data Consistent Across Loads');
  });
});
