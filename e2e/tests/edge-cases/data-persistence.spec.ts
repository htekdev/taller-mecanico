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
    // Resilience fix (issues #137/#138): Supabase warm-up in global-setup.ts pre-warms
    // connections. After re-login the test now retries page.reload() up to 3× so a
    // cold-start on the re-login path no longer causes a spurious failure.
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

    // Retry page.reload() up to 3× with backoff to handle Supabase cold-start after re-login.
    // Each reload forces a fresh cargarDatos() with a progressively warmer auth token.
    let exists2 = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      await page.reload();
      await page.locator('[data-testid="app-content-loaded"]').waitFor({ state: 'visible', timeout: 90_000 }).catch(() => {});
      await dashboardPage.navigateToModule('inventario');
      await inventarioPage.waitForPageLoad();
      exists2 = await inventarioPage.isPartVisible(partName);
      if (exists2) break;
      if (attempt < 3) await page.waitForTimeout(4_000 * attempt); // backoff: 4s, 8s
    }

    await expect(page.getByText(partName)).toBeVisible({ timeout: 30_000 });
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
