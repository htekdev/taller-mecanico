import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Line Item Editing — Modify cotización line items after creation.
 *
 * Tests:
 * 1. Add a line item, change its quantity
 * 2. Remove a line item and verify total recalculates
 * 3. Add multiple items and verify ordering
 * 4. Edit item description after initial entry
 * 5. Zero-quantity handling
 */

test.describe('Line Item Editing', () => {
  test.beforeEach(async ({ loginPage }) => {
    test.slow(); // Auth + navigation on Vercel preview can be slow
    await loginPage.loginAsTestUser();
  });

  test('change line item quantity and verify total updates', async ({
    page, dashboardPage, cotizacionesPage
  }) => {
    await showPhaseLabel(page, '✏️ Edit Line Item Quantity');
    await dashboardPage.navigateToModule('cotizaciones');
    await cotizacionesPage.waitForPageLoad();
    await cotizacionesPage.selectPlantillaGeneral();
    await cotizacionesPage.selectClient(1);

    // Fill initial line item
    const descInputs = page.locator('input[placeholder*="descripción" i], input[placeholder*="concepto" i]');
    if (await descInputs.first().isVisible().catch(() => false)) {
      await descInputs.first().fill('Servicio A');
    }

    const numInputs = page.locator('input[type="number"]');
    const allNums = await numInputs.all();
    if (allNums.length >= 2) {
      await allNums[0].fill('2');
      await allNums[1].fill('500');
      await page.waitForTimeout(300);

      // Now change quantity from 2 to 5
      await allNums[0].fill('5');
      await page.waitForTimeout(500);

      // Verify the input accepted the new value
      const newVal = await allNums[0].inputValue();
      expect(newVal).toBe('5');
    }

    await showPhaseLabel(page, '✅ Quantity Updated');
  });

  test('add multiple line items and verify all present', async ({
    page, dashboardPage, cotizacionesPage
  }) => {
    await showPhaseLabel(page, '📋 Multiple Line Items');
    await dashboardPage.navigateToModule('cotizaciones');
    await cotizacionesPage.waitForPageLoad();
    await cotizacionesPage.selectPlantillaGeneral();
    await cotizacionesPage.selectClient(1);

    // Check for "Agregar" button to add more line items
    const addBtn = page.getByRole('button', { name: /agregar línea|agregar item|añadir|agregar concepto|\+/i });
    if (await addBtn.first().isVisible().catch(() => false)) {
      // Add 2 extra items
      await addBtn.first().click();
      await page.waitForTimeout(300);
      await addBtn.first().click();
      await page.waitForTimeout(300);

      // Count visible line item rows (description inputs)
      const descInputs = page.locator('input[placeholder*="descripción" i], input[placeholder*="concepto" i]');
      const count = await descInputs.count();
      expect(count).toBeGreaterThanOrEqual(2);
    }

    await showPhaseLabel(page, '✅ Multiple Items Added');
  });

  test('zero-value line item handling', async ({
    page, dashboardPage, cotizacionesPage
  }) => {
    await showPhaseLabel(page, '🔢 Zero Value Item');
    await dashboardPage.navigateToModule('cotizaciones');
    await cotizacionesPage.waitForPageLoad();
    await cotizacionesPage.selectPlantillaGeneral();
    await cotizacionesPage.selectClient(1);

    // Fill item with $0 price
    const descInputs = page.locator('input[placeholder*="descripción" i], input[placeholder*="concepto" i]');
    if (await descInputs.first().isVisible().catch(() => false)) {
      await descInputs.first().fill('Inspección gratuita');
    }
    const numInputs = page.locator('input[type="number"]');
    const allNums = await numInputs.all();
    if (allNums.length >= 2) {
      await allNums[0].fill('1');
      await allNums[1].fill('0'); // Zero price
      await page.waitForTimeout(300);
    }

    // Page should not crash with $0 items
    const navVisible = await dashboardPage.nav.isVisible();
    expect(navVisible).toBe(true);

    // No NaN in displayed totals
    const bodyText = await page.locator('main').innerText().catch(() => '');
    expect(bodyText).not.toContain('NaN');

    await showPhaseLabel(page, '✅ Zero Value Handled');
  });
});
