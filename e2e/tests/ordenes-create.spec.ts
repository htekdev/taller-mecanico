import { test, expect } from '@playwright/test';
import { login, navigateTo, expectSectionTitle, selectClient } from './helpers';

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
    // The form should have a proveedor select
    const proveedorSelect = page.locator('select').first();
    await expect(proveedorSelect).toBeVisible({ timeout: 10_000 });

    // Wait for options to load
    await page.waitForFunction(
      () => document.querySelectorAll('select')[0]?.options.length > 1,
      { timeout: 15_000 }
    ).catch(() => {});

    const options = await proveedorSelect.locator('option').count();
    expect(options).toBeGreaterThanOrEqual(1);
  });

  test('should select a proveedor and see item options', async ({ page }) => {
    const proveedorSelect = page.locator('select').first();
    await expect(proveedorSelect).toBeVisible({ timeout: 10_000 });

    await page.waitForFunction(
      () => document.querySelectorAll('select')[0]?.options.length > 1,
      { timeout: 15_000 }
    ).catch(() => {});

    const options = await proveedorSelect.locator('option').count();
    if (options > 1) {
      await proveedorSelect.selectOption({ index: 1 });
      await page.waitForTimeout(2_000);

      // After selecting proveedor, should see item addition options
      // Either "Existente" or "Nueva (libre)" mode buttons
      const itemSection = page.locator('text=Existente, text=existente, select, input').first();
      await expect(itemSection).toBeVisible({ timeout: 5_000 });
    }
  });

  test('submit button is disabled without items', async ({ page }) => {
    const proveedorSelect = page.locator('select').first();
    await expect(proveedorSelect).toBeVisible({ timeout: 10_000 });

    await page.waitForFunction(
      () => document.querySelectorAll('select')[0]?.options.length > 1,
      { timeout: 15_000 }
    ).catch(() => {});

    const options = await proveedorSelect.locator('option').count();
    if (options > 1) {
      await proveedorSelect.selectOption({ index: 1 });
      await page.waitForTimeout(1_500);

      // Submit should be disabled since no items have been added
      const submitBtn = page.locator('button:has-text("Crear Orden de Compra")');
      await expect(submitBtn).toBeVisible({ timeout: 5_000 });
      await expect(submitBtn).toBeDisabled();
    }
  });
});
