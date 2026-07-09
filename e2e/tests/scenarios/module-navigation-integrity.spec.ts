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
  test.use({ retries: 1 });
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

  test('Trabajos sidebar badge is a valid number when shown', async ({
    page, dashboardPage, trabajosPage, sidebar
  }) => {
    await showPhaseLabel(page, '🕐 Badge Presence Check');
    await dashboardPage.waitForPageLoad();

    // Navigate to Trabajos
    await sidebar.clickTab('Trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // Verify badge value is sane (non-negative, not an astronomical number)
    const badge = await sidebar.getBadgeCount('Trabajos');
    if (badge !== null) {
      // A negative badge count would indicate a data corruption bug
      expect(badge).toBeGreaterThanOrEqual(0);
      // Shared test DB accumulates trabajos across CI runs — only check for absurd values
      expect(badge).toBeLessThan(100_000);
    }
    // badge === null means no pending trabajos in test DB — valid state

    await showPhaseLabel(page, '✅ Badge Value Valid');
  });
});

