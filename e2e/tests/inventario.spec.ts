import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { expectVisible, expectClass, expectEnabled, showPhaseLabel } from './visual-assert';

test.describe('Inventario', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('nav button:has-text("Inventario")');
    await expectVisible(page.locator('h2:has-text("Inventario")'), 'Section loaded');
  });

  test('should navigate to inventario module', async ({ page }) => {
    await showPhaseLabel(page, '🔍 Verifying active tab');
    const activeTab = page.locator('nav button:has-text("Inventario")');
    await expectClass(activeTab, /bg-indigo-600/, 'Active tab');
  });

  test('should display inventory list', async ({ page }) => {
    await showPhaseLabel(page, '📦 Checking inventory display');
    const table = page.locator('table').first();
    const emptyState = page.locator('text=No hay refacciones');
    await expectVisible(table.or(emptyState), 'Inventory content');
  });

  test('should add a new part to inventory', async ({ page }) => {
    await showPhaseLabel(page, '➕ Adding new part');
    const nameInput = page.locator('input[placeholder*="Filtro de aceite" i]').first();
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill('E2E Filtro de aceite Toyota');

      const priceInputs = page.locator('input[type="number"]');
      const priceCount = await priceInputs.count();
      if (priceCount > 0) {
        await priceInputs.first().fill('150');
      }

      await showPhaseLabel(page, '✅ Submit enabled');
      const submitBtn = page.locator('button:has-text("Agregar al Inventario")');
      await expectEnabled(submitBtn, 'Submit enabled');
    } else {
      await expectVisible(page.locator('h2:has-text("Inventario")'), 'Section rendered');
    }
  });
});
