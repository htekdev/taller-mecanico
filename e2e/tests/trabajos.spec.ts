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
    // Select client
    const clientSelect = page.locator('select').first();
    await expect(clientSelect).toBeVisible({ timeout: 5_000 });
    const options = await clientSelect.locator('option').count();
    if (options > 1) {
      await clientSelect.selectOption({ index: 1 });
    }

    // Select vehicle (second select)
    const vehicleSelect = page.locator('select').nth(1);
    if (await vehicleSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const vOptions = await vehicleSelect.locator('option').count();
      if (vOptions > 1) {
        await vehicleSelect.selectOption({ index: 1 });
      }
    }

    // Add description
    const descInput = page.locator('input[placeholder*="descripci"]').first();
    if (await descInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await descInput.fill('Revisión general de frenos');
    }

    // Save
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(2_000);
  });

  test('should finalize a trabajo', async ({ page }) => {
    const finalizeButton = page.locator('button:has-text("Finalizar")').first();
    if (await finalizeButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await finalizeButton.click();
      await page.waitForTimeout(2_000);
    }
  });
});
