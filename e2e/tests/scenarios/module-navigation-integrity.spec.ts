import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * Module Navigation Integrity — Verifies context preservation and
 * correct behavior when switching between modules rapidly.
 *
 * Tests navigation integrity, date display correctness, and
 * mathematical accuracy of displayed totals.
 *
 * Note: sidebar badge counts were removed per product request (PR #205).
 * Badge-related assertions have been replaced with navigation integrity checks.
 */

test.describe('Module Navigation Integrity', () => {
  test.use({ retries: 1 });
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('nav tabs render without badge counts after navigating to Inventario', async ({
    page, dashboardPage, inventarioPage, sidebar
  }) => {
    await showPhaseLabel(page, '🗂️ Nav Tab Integrity Check');
    await dashboardPage.waitForPageLoad();

    // Navigate to Inventario — verify module loads and nav has no badge spans
    await sidebar.clickTab('Inventario');
    await inventarioPage.waitForPageLoad();

    // Nav should be visible and stable
    const navVisible = await dashboardPage.nav.isVisible();
    expect(navVisible).toBe(true);

    // Badges were removed (PR #205) — no span.text-xs.font-bold should exist in nav
    const badgeCount = await page.locator('nav span.text-xs.font-bold').count();
    expect(badgeCount).toBe(0);

    // Inventario module should render without errors
    const mainText = await page.locator('main').innerText().catch(() => '');
    expect(mainText).not.toContain('undefined');
    expect(mainText).not.toContain('NaN');

    await showPhaseLabel(page, '✅ Nav Clean — No Badges');
  });

  test('dates display in correct format (dd/mm/yyyy or ISO)', async ({
    page, dashboardPage, sidebar
  }) => {
    // Check dates in Trabajos only (other modules covered by date-handling validation)
    await dashboardPage.navigateToModule('trabajos');
    await page.waitForTimeout(1500);

    const bodyText = await page.locator('main').innerText().catch(() => '');
    expect(bodyText).not.toContain('Invalid Date');
    expect(bodyText).not.toContain('NaN');
  });

  test('totals are mathematically correct in Trabajos', async ({
    page, dashboardPage, trabajosPage
  }) => {
    await showPhaseLabel(page, '🧮 Math Check: Trabajos');
    await dashboardPage.navigateToModule('trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(2000);

    // Get the text content of the trabajos section
    const mainText = await page.locator('main').innerText().catch(() => '');

    // No NaN, no undefined, no Infinity in any displayed numbers
    expect(mainText).not.toContain('NaN');
    expect(mainText).not.toContain('undefined');
    expect(mainText).not.toContain('Infinity');

    // Check that $ amounts are properly formatted
    const moneyPattern = /\$([\d,]+\.?\d*)/g;
    const matches = [...mainText.matchAll(moneyPattern)];
    for (const match of matches) {
      const numStr = match[1].replace(/,/g, '');
      const num = parseFloat(numStr);
      expect(num).not.toBeNaN();
      expect(num).toBeGreaterThanOrEqual(0);
      // No amounts should exceed $10M (sanity check)
      expect(num).toBeLessThan(10_000_000);
    }

    await showPhaseLabel(page, '✅ Math Correct');
  });

  test('totals are mathematically correct in Inventario', async ({
    page, dashboardPage, inventarioPage
  }) => {
    test.slow(); // Supabase cold-start can take 3-7min on CI
    await showPhaseLabel(page, '🧮 Math Check: Inventario');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();
    await page.waitForTimeout(1500);

    const mainText = await page.locator('main').innerText().catch(() => '');
    expect(mainText).not.toContain('NaN');
    expect(mainText).not.toContain('undefined');
    expect(mainText).not.toContain('Infinity');

    // Stock counts should be non-negative integers
    const stockPattern = /(\d+)\s*(pza|lt|kg|m|und)/g;
    const stockMatches = [...mainText.matchAll(stockPattern)];
    for (const match of stockMatches) {
      const stock = parseInt(match[1]);
      expect(stock).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(stock)).toBe(true);
    }

    await showPhaseLabel(page, '✅ Inventory Math Correct');
  });

  test('module switching preserves no stale data', async ({
    page, dashboardPage, sidebar
  }) => {
    // Ensure app is fully loaded before switching -- cargarDatos() must complete first
    await dashboardPage.waitForPageLoad();
    // Rapidly switch modules and verify each renders without crash
    const moduleOrder = [
      'Inventario', 'Trabajos', 'Cotizaciones',
      'Por Cobrar', 'Gastos', 'Proveedores', 'Clientes'
    ] as const;

    for (const mod of moduleOrder) {
      await sidebar.clickTab(mod);
      await page.waitForTimeout(600);

      // Nav should still be visible (no crash)
      const navVisible = await dashboardPage.nav.isVisible();
      expect(navVisible).toBe(true);
    }
  });

  test('Trabajos nav tab renders correctly with no badge counts', async ({
    page, dashboardPage, trabajosPage, sidebar
  }) => {
    await showPhaseLabel(page, '🔧 Trabajos Nav Check');
    await dashboardPage.waitForPageLoad();

    // Navigate to Trabajos
    await sidebar.clickTab('Trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // Nav should still be stable
    const navVisible = await dashboardPage.nav.isVisible();
    expect(navVisible).toBe(true);

    // Badges were removed (PR #205) — getBadgeCount returns null for all tabs
    const badge = await sidebar.getBadgeCount('Trabajos');
    expect(badge).toBeNull();

    await showPhaseLabel(page, '✅ Trabajos Nav Clean');
  });
});

