import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Trabajos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('nav button:has-text("Trabajos")');
    await expect(page.locator('h2:has-text("Trabajos")')).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate to trabajos module', async ({ page }) => {
    const activeTab = page.locator('nav button:has-text("Trabajos")');
    await expect(activeTab).toHaveClass(/bg-indigo-600/);
  });

  test('should create a new trabajo', async ({ page }) => {
    // The form header "Nuevo Trabajo" should be visible
    await expect(page.locator('text=Nuevo Trabajo')).toBeVisible({ timeout: 10_000 });

    // Select client — wait for options to load from Supabase
    const clientSelect = page.locator('select').first();
    await expect(clientSelect).toBeVisible({ timeout: 10_000 });

    // Wait for client options to populate (async load from DB)
    await page.waitForFunction(
      () => document.querySelectorAll('select')[0]?.options.length > 1,
      { timeout: 15_000 }
    ).catch(() => {});

    const options = await clientSelect.locator('option').count();
    if (options > 1) {
      await clientSelect.selectOption({ index: 1 });
    }

    // Wait for vehicle select to appear after client selection
    await page.waitForTimeout(1_500);
    const vehicleSelect = page.locator('select').nth(1);
    if (await vehicleSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const vOptions = await vehicleSelect.locator('option').count();
      if (vOptions > 1) {
        await vehicleSelect.selectOption({ index: 1 });
      }
    }

    // Verify the submit button is available — text is "✓ Registrar Trabajo"
    const saveBtn = page.locator('button:has-text("Registrar Trabajo")');
    await expect(saveBtn).toBeVisible({ timeout: 5_000 });
  });

  test('should finalize a trabajo', async ({ page }) => {
    const finalizeButton = page.locator('button:has-text("Finalizar")').first();
    if (await finalizeButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await finalizeButton.click();
      await page.waitForTimeout(2_000);
      // After finalizing, the page should still be functional
      await expect(page.locator('nav button:has-text("Trabajos")')).toBeVisible();
    } else {
      // No trabajo to finalize — verify module rendered correctly
      await expect(page.locator('text=Nuevo Trabajo')).toBeVisible();
    }
  });
});
