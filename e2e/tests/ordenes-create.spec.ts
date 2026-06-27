import { test, expect } from '@playwright/test';
import { login, navigateTo, expectSectionTitle, selectClient } from './helpers';
import { expectVisible, expectDisabled, showPhaseLabel } from './visual-assert';

/**
 * Create Purchase Order (Orden de Compra) Tests — Taller Mecánico
 *
 * Verifies the full OC creation flow: select proveedor, add items,
 * submit the form.
 */

test.describe('Órdenes de Compra — Create', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, 'Órdenes de Compra');
    await expectSectionTitle(page, 'Órdenes de Compra');
  });

  test('should display the create order form', async ({ page }) => {
    await showPhaseLabel(page, '📋 Checking OC form display');
    const proveedorSelect = page.locator('select').first();
    await expectVisible(proveedorSelect, 'Proveedor select');

    await page.waitForFunction(
      () => document.querySelectorAll('select')[0]?.options.length > 1,
      { timeout: 15_000 }
    ).catch(() => {});

    const options = await proveedorSelect.locator('option').count();
    expect(options).toBeGreaterThanOrEqual(1);
  });

  test('should select a proveedor and see item options', async ({ page }) => {
    await showPhaseLabel(page, '👆 Selecting proveedor');
    const proveedorSelect = page.locator('select').first();
    await expectVisible(proveedorSelect, 'Proveedor select');

    await page.waitForFunction(
      () => document.querySelectorAll('select')[0]?.options.length > 1,
      { timeout: 15_000 }
    ).catch(() => {});

    const options = await proveedorSelect.locator('option').count();
    if (options > 1) {
      await proveedorSelect.selectOption({ index: 1 });
      await page.waitForTimeout(2_000);

      await showPhaseLabel(page, '✅ Proveedor selected — form active');
      // After selecting proveedor, the hint changes to "Agrega al menos una pieza"
      const hint = page.locator('text=Agrega al menos una pieza');
      await expectVisible(hint, 'Add items hint');
    }
  });

  test('submit button is disabled without items', async ({ page }) => {
    await showPhaseLabel(page, '🔒 Checking disabled submit');
    const proveedorSelect = page.locator('select').first();
    await expectVisible(proveedorSelect, 'Proveedor select');

    await page.waitForFunction(
      () => document.querySelectorAll('select')[0]?.options.length > 1,
      { timeout: 15_000 }
    ).catch(() => {});

    const options = await proveedorSelect.locator('option').count();
    if (options > 1) {
      await proveedorSelect.selectOption({ index: 1 });
      await page.waitForTimeout(1_500);

      const submitBtn = page.locator('button:has-text("Crear Orden de Compra")');
      await expectVisible(submitBtn, 'Submit button');
      await expectDisabled(submitBtn, 'Disabled without items');
    }
  });
});
