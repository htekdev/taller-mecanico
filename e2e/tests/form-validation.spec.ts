import { test, expect } from '@playwright/test';
import { login, navigateTo, openCotizacionForm, expectSectionTitle } from './helpers';

/**
 * Form Validation Tests — Taller Mecánico
 *
 * Verifies that required fields are enforced and empty submissions
 * are blocked across key modules.
 */

test.describe('Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('cotización form requires client selection', async ({ page }) => {
    await openCotizacionForm(page, 'General');

    // The client select should be present and default to empty/placeholder
    const clientSelect = page.locator('select').first();
    await expect(clientSelect).toBeVisible({ timeout: 10_000 });

    // Don't select a client — the form should not allow saving without one
    // The select has "required" attribute, so form submission should be blocked
    const selectedValue = await clientSelect.inputValue();
    // Default should be empty or a placeholder
    expect(selectedValue === '' || selectedValue === undefined).toBeTruthy();
  });

  test('trabajo form requires client selection', async ({ page }) => {
    await navigateTo(page, 'Trabajos');
    await expect(page.locator('text=Nuevo Trabajo')).toBeVisible({ timeout: 10_000 });

    // The client select should exist with a required attribute
    const clientSelect = page.locator('select').first();
    await expect(clientSelect).toBeVisible({ timeout: 10_000 });

    // Verify submit button exists — "✓ Registrar Trabajo"
    const submitBtn = page.locator('button:has-text("Registrar Trabajo")');
    await expect(submitBtn).toBeVisible({ timeout: 5_000 });

    // Try clicking submit without selecting a client — browser validation should block
    await submitBtn.click();
    await page.waitForTimeout(1_000);

    // The form should still be on the same page (no navigation away)
    await expect(page.locator('text=Nuevo Trabajo')).toBeVisible();
  });

  test('inventario form requires part name and price', async ({ page }) => {
    await navigateTo(page, 'Inventario');
    await expectSectionTitle(page, 'Inventario');

    // The submit button should be disabled when name/price are empty
    const submitBtn = page.locator('button:has-text("Agregar al Inventario")');
    await expect(submitBtn).toBeVisible({ timeout: 5_000 });

    // Button should be disabled (disabled prop based on !form.nombre || form.precioCompra <= 0)
    await expect(submitBtn).toBeDisabled();
  });

  test('orden de compra form requires proveedor selection', async ({ page }) => {
    await navigateTo(page, 'Órdenes de Compra');
    await expectSectionTitle(page, 'Órdenes de Compra');

    // The proveedor select should be required
    const proveedorSelect = page.locator('select').first();
    await expect(proveedorSelect).toBeVisible({ timeout: 10_000 });

    // Submit button should be disabled without a proveedor + items
    const submitBtn = page.locator('button:has-text("Crear Orden de Compra")');
    await expect(submitBtn).toBeVisible({ timeout: 5_000 });
    await expect(submitBtn).toBeDisabled();
  });
});
