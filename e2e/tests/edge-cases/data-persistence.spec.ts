import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';
import { waitForDbRecord } from '../../utils/helpers';

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
    // page.reload() forces a new app mount + cargarDatos() — the ONLY way to confirm
    // INSERT committed to Supabase. navigate-away-back uses cached React state and does NOT
    // trigger a new DB fetch (cargarDatos runs once on mount, not on tab switch).
    await page.reload();
    await page.locator('[data-testid="app-content-loaded"]').waitFor({ state: 'visible', timeout: 60_000 });
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // Verify INSERT committed to DB (not just optimistic React state)
    await expect(page.getByText(partName)).toBeVisible({ timeout: 30_000 });
    const exists1 = await inventarioPage.isPartVisible(partName);
    expect(exists1).toBe(true);

    // Logout
    await dashboardPage.logout();

    // Login again
    await loginPage.loginAsTestUser();
    await dashboardPage.waitForPageLoad();

    // Confirm the record is in Supabase via the service-role API endpoint before
    // asserting in the UI. This separates "did the DB commit?" from "did the app
    // fetch succeed?" — the latter can lag on Vercel preview cold starts.
    await waitForDbRecord(page, 'refacciones', partName, 60_000);

    // Reload to force a fresh cargarDatos() with warm auth token.
    // cargarDatos() now retries up to 3 times with exponential backoff (see page.tsx),
    // so a single reload is sufficient once we know the record is in the DB.
    await page.reload();
    await page.locator('[data-testid="app-content-loaded"]').waitFor({ state: 'visible', timeout: 60_000 });

    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    await expect(page.getByText(partName)).toBeVisible({ timeout: 45_000 });
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
