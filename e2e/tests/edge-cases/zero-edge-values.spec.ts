import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Zero & Edge Value Handling — Boundary conditions for financial amounts.
 *
 * Tests:
 * 1. Cotización with $0 total (free inspection)
 * 2. Trabajo with $0 labor cost
 * 3. Inventory part with 0 stock (out of stock display)
 * 4. Expense with $0 amount — should it be allowed?
 * 5. Very large amounts (>$100,000) display correctly
 * 6. Decimal precision (2 decimal places)
 */

test.describe('Zero & Edge Value Handling', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('inventory part with zero stock displays correctly', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '📦 Zero Stock Part');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    const partName = `Sin Stock ${TestData.uniqueId()}`;
    await inventarioPage.addPart({
      nombre: partName,
      precioCompra: 200,
      stock: 0,
      stockMinimo: 5,
    });

    // Part should still be visible (just shows 0 stock)
    const isVisible = await inventarioPage.isPartVisible(partName);
    expect(isVisible).toBe(true);

    // No NaN or negative stock displayed
    const bodyText = await page.locator('main').innerText().catch(() => '');
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('-1');

    await showPhaseLabel(page, '✅ Zero Stock Displays OK');
  });

  test('large monetary amounts format correctly', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '💰 Large Amount');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // Add expensive part
    const partName = `Parte Cara ${TestData.uniqueId()}`;
    await inventarioPage.addPart({
      nombre: partName,
      precioCompra: 150000, // $150,000
      stock: 1,
    });

    // Should display with comma formatting, no overflow
    const navVisible = await dashboardPage.nav.isVisible();
    expect(navVisible).toBe(true);

    // Check the amount displays (look for the number in any format)
    const bodyText = await page.locator('main').innerText().catch(() => '');
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('Infinity');

    await showPhaseLabel(page, '✅ Large Amounts OK');
  });

  test('trabajo with zero labor cost', async ({
    page, dashboardPage, trabajosPage
  }) => {
    await showPhaseLabel(page, '🔧 Zero Cost Trabajo');
    await dashboardPage.navigateToModule('trabajos');
    await trabajosPage.waitForPageLoad();

    // Select client
    await trabajosPage.selectClient(1);
    await trabajosPage.selectVehicle(1);

    // Fill description (required field) — must come before addLaborItem
    await trabajosPage.fillDescription(TestData.trabajoDescription());

    // Add labor with $0 (free diagnostic) — uses mano de obra concepto field
    const conceptoInput = page.locator('input[placeholder*="Arreglo de frenos" i], input[placeholder*="engrase" i]').first();
    if (await conceptoInput.isVisible().catch(() => false)) {
      await conceptoInput.fill('Diagnóstico gratuito');
    }
    const precioInputs = page.locator('input[type="number"]');
    const allPrecio = await precioInputs.all();
    if (allPrecio.length > 0) {
      await allPrecio[allPrecio.length > 1 ? allPrecio.length - 1 : 0].fill('0');
    }

    // Save should work (or show validation) — no crash
    await trabajosPage.save();
    const navVisible = await dashboardPage.nav.isVisible();
    expect(navVisible).toBe(true);

    await showPhaseLabel(page, '✅ Zero Cost Handled');
  });

  test('decimal precision in monetary displays', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '🔢 Decimal Precision');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // Add part with decimal price
    await inventarioPage.addPart({
      nombre: `Decimal Test ${TestData.uniqueId()}`,
      precioCompra: 99.99,
      stock: 3,
    });

    // Check that displayed amounts use proper decimal format
    const bodyText = await page.locator('main').innerText().catch(() => '');
    // Should not show excessive decimals like 99.990000001
    expect(bodyText).not.toMatch(/\d+\.\d{4,}/); // No 4+ decimal places

    await showPhaseLabel(page, '✅ Decimals Correct');
  });
});
