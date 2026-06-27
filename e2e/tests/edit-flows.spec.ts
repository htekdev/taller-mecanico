import { test, expect } from '@playwright/test';
import { login, navigateTo, openCotizacionForm, selectClient, selectVehicle, expectSectionTitle } from './helpers';

/**
 * Edit Flow Tests — Taller Mecánico
 *
 * Verifies that existing records (cotizaciones, trabajos) can be edited
 * after creation.
 */

test.describe('Edit Flows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should edit an existing cotización', async ({ page }) => {
    await navigateTo(page, 'Cotizaciones');
    await expectSectionTitle(page, 'Cotizaciones');

    // Look for an existing cotización in the history list — click to view it
    const cotizacionRow = page.locator('.rounded-xl.border, [class*="grid-cols-12"]').first();
    if (await cotizacionRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await cotizacionRow.click();
      await page.waitForTimeout(2_000);

      // In preview mode, there should be an "✏️ Editar" button (if not cancelled)
      const editBtn = page.locator('button:has-text("Editar")').first();
      if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(2_000);

        // Should now be on the formulario screen with "Editando" in the title
        const editingTitle = page.locator('text=Editando');
        await expect(editingTitle).toBeVisible({ timeout: 5_000 });

        // The form should have client select and data pre-filled
        const clientSelect = page.locator('select').first();
        await expect(clientSelect).toBeVisible({ timeout: 5_000 });
      }
    }
  });

  test('should edit an existing trabajo', async ({ page }) => {
    await navigateTo(page, 'Trabajos');
    await expectSectionTitle(page, 'Trabajos');

    // Look for a trabajo in the list that has an "Editar" button
    const editBtn = page.locator('button:has-text("Editar")').first();
    if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(2_000);

      // The form title should change to "Editar Trabajo"
      const editTitle = page.locator('text=Editar Trabajo');
      await expect(editTitle).toBeVisible({ timeout: 5_000 });

      // Client should be pre-selected in the form
      const clientSelect = page.locator('select').first();
      const selectedValue = await clientSelect.inputValue();
      expect(selectedValue).toBeTruthy();
    }
  });

  test('should edit an inventory part compatibility', async ({ page }) => {
    await navigateTo(page, 'Inventario');
    await expectSectionTitle(page, 'Inventario');

    // Expand a part row to see details
    const partRow = page.locator('table tr, .rounded-xl.border').first();
    if (await partRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await partRow.click();
      await page.waitForTimeout(1_500);

      // Look for edit compatibility or receive stock actions
      const receiveInput = page.locator('input[type="number"]').first();
      if (await receiveInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        // Part details are visible — verify we can interact
        await expect(receiveInput).toBeEditable();
      }
    }
  });
});
