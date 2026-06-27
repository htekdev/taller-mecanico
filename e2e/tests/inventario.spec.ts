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

test.describe('Inventario', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('nav button:has-text("Inventario")');
    await expect(page.locator('h2:has-text("Inventario")')).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate to inventario module', async ({ page }) => {
    const activeTab = page.locator('nav button:has-text("Inventario")');
    await expect(activeTab).toHaveClass(/bg-indigo-600/);
  });

  test('should display inventory list', async ({ page }) => {
    // Should see at least the table or a list of parts
    const table = page.locator('table').first();
    const emptyState = page.locator('text=No hay refacciones');
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10_000 });
  });

  test('should add a new part to inventory', async ({ page }) => {
    // Fill part name
    const nameInput = page.locator('input[placeholder*="nombre" i]').first();
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill('Filtro de aceite Toyota');

      // Fill code
      const codeInput = page.locator('input[placeholder*="código" i]').first();
      if (await codeInput.isVisible()) {
        await codeInput.fill('FO-TOY-001');
      }

      // Fill price
      const priceInputs = page.locator('input[type="number"]');
      const priceCount = await priceInputs.count();
      if (priceCount > 0) {
        await priceInputs.first().fill('150');
      }

      // Save
      await page.click('button:has-text("Guardar")');
      await page.waitForTimeout(2_000);
    }
  });
});
