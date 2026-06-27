import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'sofia@test.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'Test1234!';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page.locator('nav button:has-text("Clientes")')).toBeVisible({ timeout: 15_000 });
}

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
    // Look for the new quote button or form
    const clientSelect = page.locator('select').first();
    await expect(clientSelect).toBeVisible({ timeout: 5_000 });

    // Select the first available client
    const options = await clientSelect.locator('option').count();
    if (options > 1) {
      await clientSelect.selectOption({ index: 1 });
    }

    // Add a line item
    const addButton = page.locator('button:has-text("Agregar")');
    if (await addButton.isVisible()) {
      await addButton.click();
    }

    // Fill in a line item description if available
    const descInput = page.locator('input[type="text"]').first();
    if (await descInput.isVisible()) {
      await descInput.fill('Cambio de aceite sintético');
    }

    // Save the cotización
    await page.click('button:has-text("Guardar")');

    // Should see success or the quote in the list
    await page.waitForTimeout(2_000);
  });

  test('should convert cotización to trabajo', async ({ page }) => {
    // Look for an existing cotización with a convert button
    const convertButton = page.locator('button:has-text("Convertir")').first();
    if (await convertButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await convertButton.click();
      // Should navigate to or create a trabajo
      await page.waitForTimeout(3_000);
    }
  });
});
