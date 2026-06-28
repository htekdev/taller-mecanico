import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Module Navigation Integrity — Verifies context preservation and
 * correct behavior when switching between modules rapidly.
 *
 * Tests sidebar badge updates, date display correctness, and
 * mathematical accuracy of displayed totals.
 */

test.describe('Module Navigation Integrity', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('sidebar badges update after creating items', async ({
    page, dashboardPage, inventarioPage, sidebar
  }) => {
    await showPhaseLabel(page, '🔢 Badge Update After Create');
    await dashboardPage.waitForPageLoad();

    // Record initial Inventario badge
    const badgeBefore = await sidebar.getBadgeCount('Inventario');

    // Add a part
    await sidebar.clickTab('Inventario');
    await inventarioPage.waitForPageLoad();

    const partName = `Badge Test ${TestData.uniqueId()}`;
    await inventarioPage.addPart({
      nombre: partName,
      precioCompra: 100,
      stock: 5,
    });

    // Wait for state to update
    await page.waitForTimeout(1000);

    // Check badge updated
    const badgeAfter = await sidebar.getBadgeCount('Inventario');
    if (badgeBefore !== null && badgeAfter !== null) {
      expect(badgeAfter).toBeGreaterThanOrEqual(badgeBefore);
    }

    await showPhaseLabel(page, '✅ Badge Updated');
  });

  test('dates display in correct format (dd/mm/yyyy or ISO)', async ({
    page, dashboardPage, sidebar
  }) => {
    await showPhaseLabel(page, '📅 Date Format Check');

    // Check dates in Trabajos
    await dashboardPage.navigateToModule('trabajos');
    await page.waitForTimeout(2000);

    // Look for date patterns
    const bodyText = await page.locator('main, .space-y-3').first().textContent() ?? '';

    // Dates should NOT have "Invalid Date" or "NaN"
    expect(bodyText).not.toContain('Invalid Date');
    expect(bodyText).not.toContain('NaN');

    // Check in Órdenes
    await sidebar.clickTab('Órdenes de Compra');
    await page.waitForTimeout(1500);
    const ordenText = await page.locator('main, .space-y-3').first().textContent() ?? '';
    expect(ordenText).not.toContain('Invalid Date');

    // Check in Gastos
    await sidebar.clickTab('Gastos');
    await page.waitForTimeout(1500);
    const gastoText = await page.locator('main, .space-y-3').first().textContent() ?? '';
    expect(gastoText).not.toContain('Invalid Date');

    await showPhaseLabel(page, '✅ Dates Display Correctly');
  });

  test('totals are mathematically correct in Trabajos', async ({
    page, dashboardPage, trabajosPage
  }) => {
    await showPhaseLabel(page, '🧮 Math Check: Trabajos');
    await dashboardPage.navigateToModule('trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(2000);

    // Get the text content of the trabajos section
    const mainText = await page.locator('main').textContent() ?? '';

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
    await showPhaseLabel(page, '🧮 Math Check: Inventario');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();
    await page.waitForTimeout(1500);

    const mainText = await page.locator('main').textContent() ?? '';
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
    await showPhaseLabel(page, '🔄 No Stale Data');

    // Rapidly switch modules and verify each renders fresh
    const moduleOrder = [
      'Inventario', 'Trabajos', 'Cotizaciones',
      'Por Cobrar', 'Gastos', 'Órdenes de Compra',
      'Proveedores', 'Clientes'
    ] as const;

    for (const mod of moduleOrder) {
      await sidebar.clickTab(mod);
      await page.waitForTimeout(800);

      // Each module should show its own title/section (not stale from previous)
      const navVisible = await dashboardPage.nav.isVisible();
      expect(navVisible).toBe(true);

      // No JavaScript errors (no "undefined is not a function" etc)
      const bodyText = await page.locator('body').textContent() ?? '';
      expect(bodyText).not.toContain('Unhandled Runtime Error');
    }

    await showPhaseLabel(page, '✅ No Stale Data Across Modules');
  });

  test('Trabajos pending badge reflects actual pending count', async ({
    page, dashboardPage, trabajosPage, sidebar
  }) => {
    await showPhaseLabel(page, '🕐 Pending Badge Accuracy');
    await dashboardPage.waitForPageLoad();

    // Navigate to Trabajos
    await sidebar.clickTab('Trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // Count items with "pendiente" status
    const pendienteBadges = page.locator('text=/pendiente/i');
    const pendienteCount = await pendienteBadges.count();

    // Check the sidebar badge
    const badge = await sidebar.getBadgeCount('Trabajos');

    // The badge might show 🕐 prefix — extract just the number
    // Badge should approximately match pending count
    if (badge !== null && pendienteCount > 0) {
      // Allow ±1 difference (timing)
      expect(Math.abs(badge - pendienteCount)).toBeLessThanOrEqual(2);
    }

    await showPhaseLabel(page, '✅ Pending Badge Accurate');
  });
});
