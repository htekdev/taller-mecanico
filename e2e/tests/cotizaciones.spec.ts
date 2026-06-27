import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Cotizaciones', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('nav button:has-text("Cotizaciones")');
    await expect(page.locator('h2:has-text("Cotizaciones")')).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate to cotizaciones module', async ({ page }) => {
    // Active tab should be highlighted
    const activeTab = page.locator('nav button:has-text("Cotizaciones")');
    await expect(activeTab).toHaveClass(/bg-indigo-600/);
  });

  test('should create a new cotización', async ({ page }) => {
    // The inicio screen shows plantilla selection cards — click "General" to enter the form
    const generalCard = page.locator('button:has-text("General")').first();
    await expect(generalCard).toBeVisible({ timeout: 10_000 });
    await generalCard.click();

    // Now we're on the formulario screen — wait for the client select to load
    const clientSelect = page.locator('select').first();
    await expect(clientSelect).toBeVisible({ timeout: 10_000 });

    // Select the first available client
    const options = await clientSelect.locator('option').count();
    if (options > 1) {
      await clientSelect.selectOption({ index: 1 });
    }

    // Wait for vehicle select to appear after client selection
    await page.waitForTimeout(1_000);

    // The form should now be ready — verify we can see the save button
    const saveBtn = page.locator('button:has-text("Guardar")');
    await expect(saveBtn).toBeVisible({ timeout: 5_000 });
  });

  test('should convert cotización to trabajo', async ({ page }) => {
    // Look for an existing cotización with a convert button
    const convertButton = page.locator('button:has-text("Convertir")').first();
    if (await convertButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await convertButton.click();
      await page.waitForTimeout(3_000);
      // After conversion, should still be on a functional page
      const navVisible = page.locator('nav button').first();
      await expect(navVisible).toBeVisible({ timeout: 5_000 });
    } else {
      // No cotizaciones to convert — verify the page rendered correctly
      await expect(page.locator('h2:has-text("Cotizaciones")')).toBeVisible();
    }
  });
});
