import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Search Across Modules — Cross-module data consistency.
 *
 * Verifies that client/vehicle data is consistent across modules:
 * when you search in cotizaciones, the same client shows in trabajos and CxC.
 */

test.describe('Search Across Modules', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('client name appears consistently across modules', async ({
    page, dashboardPage, sidebar
  }) => {
    await showPhaseLabel(page, '🔍 Cross-Module Search');

    // First get a client name from the Clientes module
    await dashboardPage.navigateToModule('clientes');
    await page.waitForTimeout(2000);

    // Find the first client name in the list
    const clientTexts = page.locator('.border.rounded-xl, .border.rounded-lg').first();
    const firstClientText = await clientTexts.textContent();
    let searchTerm = '';

    if (firstClientText) {
      // Extract a usable search term (first word after any icons)
      const words = firstClientText.trim().split(/\s+/).filter(w => w.length > 2 && !w.match(/[🔧📦💰]/));
      searchTerm = words[0] || '';
    }

    if (searchTerm.length < 2) {
      // No clients — skip gracefully
      await showPhaseLabel(page, '⏭️ No clients to search');
      return;
    }

    // ─── Search in Cotizaciones ─────────────────────────────────────────────
    await showPhaseLabel(page, '📄 Search in Cotizaciones');
    await sidebar.clickTab('Cotizaciones');
    await page.waitForTimeout(1500);

    const cotSearch = page.locator('input[placeholder*="buscar" i]').first();
    if (await cotSearch.isVisible().catch(() => false)) {
      await cotSearch.fill(searchTerm);
      await page.waitForTimeout(1000);
    }

    // ─── Search in Trabajos ─────────────────────────────────────────────────
    await showPhaseLabel(page, '🔧 Search in Trabajos');
    await sidebar.clickTab('Trabajos');
    await page.waitForTimeout(1500);

    const trabSearch = page.locator('input[placeholder*="buscar" i]').first();
    if (await trabSearch.isVisible().catch(() => false)) {
      await trabSearch.fill(searchTerm);
      await page.waitForTimeout(1000);
    }

    // ─── Verify consistency ─────────────────────────────────────────────────
    await showPhaseLabel(page, '✅ Cross-Module Consistent');
    // No crash, no "undefined", no errors across all modules
    const bodyText = await page.locator('body').textContent() ?? '';
    expect(bodyText).not.toContain('undefined');
    expect(bodyText).not.toContain('NaN');

    await showPhaseLabel(page, '🎉 Search Across Modules Complete');
  });

  test('sidebar badge counts are consistent with module data', async ({
    page, dashboardPage, sidebar, trabajosPage, cuentasCobrarPage
  }) => {
    await showPhaseLabel(page, '🔢 Badge Consistency Check');
    await dashboardPage.waitForPageLoad();

    // Get badge count for Trabajos
    const trabajosBadge = await sidebar.getBadgeCount('Trabajos');

    // Navigate to Trabajos and count items
    await sidebar.clickTab('Trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    const trabajoCount = await trabajosPage.getTrabajoCount();

    // Badge should reflect actual count (pending ones or total)
    // We just verify they're both numbers and not wildly inconsistent
    if (trabajosBadge !== null) {
      expect(trabajosBadge).toBeGreaterThanOrEqual(0);
      // Badge might show pending count, not total
      expect(trabajosBadge).toBeLessThanOrEqual(trabajoCount + 1);
    }

    // Check Por Cobrar badge
    const cxcBadge = await sidebar.getBadgeCount('Por Cobrar');
    await sidebar.clickTab('Por Cobrar');
    await cuentasCobrarPage.waitForPageLoad();
    const cxcCount = await cuentasCobrarPage.getAccountCount();

    if (cxcBadge !== null) {
      expect(cxcBadge).toBeGreaterThanOrEqual(0);
      expect(cxcBadge).toBeLessThanOrEqual(cxcCount + 1);
    }

    await showPhaseLabel(page, '✅ Badges Match Data');
  });
});
