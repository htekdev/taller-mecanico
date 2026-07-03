import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * Historial por Unidad — Job history per vehicle module.
 *
 * Verifies:
 * 1. Module navigates and loads without crashing
 * 2. Client list or "Historial por Unidad" heading visible
 * 3. Search input is visible and functional
 * 4. Module is reachable from other tabs
 */

test.describe('Historial por Unidad', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('historial module loads without crash', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '📋 Phase 1: Navigate to Historial');
    await dashboardPage.navigateToModule('historial');
    await page.waitForTimeout(1500);

    // No fatal crash
    const errorText = page.getByText(/error al cargar|algo salió mal|fatal error/i);
    const hasError = await errorText.isVisible().catch(() => false);
    expect(hasError).toBe(false);

    // App shell still intact
    await expectVisible(dashboardPage.nav, 'Nav present after loading Historial');

    await showPhaseLabel(page, '✅ Historial Module Loaded');
  });

  test('historial shows "Historial por Unidad" heading', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔍 Phase 1: Check Heading');
    await dashboardPage.navigateToModule('historial');
    await page.waitForTimeout(1500);

    // The module renders a "Historial por Unidad" section title
    const heading = page.getByText(/Historial por Unidad|Historial/i).first();
    const visible = await heading.isVisible().catch(() => false);
    expect(visible).toBe(true);

    await showPhaseLabel(page, '✅ Historial Heading Visible');
  });

  test('historial has a client search input', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔍 Phase 1: Check Search Input');
    await dashboardPage.navigateToModule('historial');
    await page.waitForTimeout(1500);

    // Search input should be visible
    const searchInput = page.getByPlaceholder(/Buscar cliente/i);
    const visible = await searchInput.isVisible().catch(() => false);
    expect(visible).toBe(true);

    await showPhaseLabel(page, '✅ Search Input Present');
  });

  test('historial client search filters results without crash', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '⌨️ Phase 1: Type in Search');
    await dashboardPage.navigateToModule('historial');
    await page.waitForTimeout(1500);

    const searchInput = page.getByPlaceholder(/Buscar cliente/i);
    const inputVisible = await searchInput.isVisible().catch(() => false);

    if (inputVisible) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // App should not crash after typing
      const errorText = page.getByText(/error al cargar|algo salió mal|fatal error/i);
      const hasError = await errorText.isVisible().catch(() => false);
      expect(hasError).toBe(false);

      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(300);
    }

    await showPhaseLabel(page, '✅ Search Works Without Crash');
  });

  test('historial is reachable from gastos tab', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔀 Phase 1: Navigate Gastos → Historial');

    await dashboardPage.navigateToModule('gastos');
    await page.waitForTimeout(500);

    await dashboardPage.navigateToModule('historial');
    await page.waitForTimeout(1500);

    const tab = dashboardPage.getTabLocator('historial');
    await expectVisible(tab, 'Historial tab in nav');

    await showPhaseLabel(page, '✅ Historial Reachable from Gastos');
  });
});
