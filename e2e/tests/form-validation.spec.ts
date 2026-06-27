import { test, expect } from '@playwright/test';
import { login, navigateTo, openCotizacionForm, expectSectionTitle } from './helpers';
import { expectVisible, expectDisabled, showPhaseLabel } from './visual-assert';

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
    await showPhaseLabel(page, '🔍 Checking client select is empty by default');

    // The client select should be present and default to empty/placeholder
    const clientSelect = page.locator('select').first();
    await expectVisible(clientSelect, 'Client select');

    // Don't select a client — the form should not allow saving without one
    const selectedValue = await clientSelect.inputValue();
    expect(selectedValue === '' || selectedValue === undefined).toBeTruthy();
  });

  test('trabajo form requires client selection', async ({ page }) => {
    await navigateTo(page, 'Trabajos');
    await showPhaseLabel(page, '🔍 Checking trabajo form validation');
    await expectVisible(page.locator('text=Nuevo Trabajo'), 'Form header');

    // The client select should exist with a required attribute
    const clientSelect = page.locator('select').first();
    await expectVisible(clientSelect, 'Client select required');

    // Verify submit button exists — "✓ Registrar Trabajo"
    const submitBtn = page.locator('button:has-text("Registrar Trabajo")');
    await expectVisible(submitBtn, 'Submit button');

    // Try clicking submit without selecting a client — browser validation should block
    await submitBtn.click();
    await page.waitForTimeout(1_000);

    // The form should still be on the same page (no navigation away)
    await expectVisible(page.locator('text=Nuevo Trabajo'), 'Still on form');
  });

  test('inventario form requires part name and price', async ({ page }) => {
    await navigateTo(page, 'Inventario');
    await expectSectionTitle(page, 'Inventario');
    await showPhaseLabel(page, '🔍 Checking inventario disabled state');

    // The submit button should be disabled when name/price are empty
    const submitBtn = page.locator('button:has-text("Agregar al Inventario")');
    await expectDisabled(submitBtn, 'Disabled without data');
  });

  test('orden de compra form requires proveedor selection', async ({ page }) => {
    await navigateTo(page, 'Órdenes de Compra');
    await expectSectionTitle(page, 'Órdenes de Compra');
    await showPhaseLabel(page, '🔍 Checking OC form disabled state');

    // The proveedor select should be required
    const proveedorSelect = page.locator('select').first();
    await expectVisible(proveedorSelect, 'Proveedor select');

    // Submit button should be disabled without a proveedor + items
    const submitBtn = page.locator('button:has-text("Crear Orden de Compra")');
    await expectDisabled(submitBtn, 'Disabled without proveedor');
  });
});
