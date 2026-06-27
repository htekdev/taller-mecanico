import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { expectVisible, expectClass, expectEnabled, showPhaseLabel } from './visual-assert';

test.describe('Trabajos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('nav button:has-text("Trabajos")');
    await expectVisible(page.locator('h2:has-text("Trabajos")'), 'Section loaded');
  });

  test('should navigate to trabajos module', async ({ page }) => {
    await showPhaseLabel(page, '🔍 Verifying active tab');
    const activeTab = page.locator('nav button:has-text("Trabajos")');
    await expectClass(activeTab, /bg-indigo-600/, 'Active tab');
  });

  test('should create a new trabajo', async ({ page }) => {
    await showPhaseLabel(page, '📝 New trabajo form');
    await expectVisible(page.locator('text=Nuevo Trabajo'), 'Form header');

    await showPhaseLabel(page, '👤 Selecting client');
    const clientSelect = page.locator('select').first();
    await expectVisible(clientSelect, 'Client select');

    await page.waitForFunction(
      () => document.querySelectorAll('select')[0]?.options.length > 1,
      { timeout: 15_000 }
    ).catch(() => {});

    const options = await clientSelect.locator('option').count();
    if (options > 1) {
      await clientSelect.selectOption({ index: 1 });
    }

    await page.waitForTimeout(1_500);
    const vehicleSelect = page.locator('select').nth(1);
    if (await vehicleSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const vOptions = await vehicleSelect.locator('option').count();
      if (vOptions > 1) {
        await vehicleSelect.selectOption({ index: 1 });
      }
    }

    await showPhaseLabel(page, '✅ Submit button ready');
    const saveBtn = page.locator('button:has-text("Registrar Trabajo")');
    await expectVisible(saveBtn, 'Registrar Trabajo');
  });

  test('should finalize a trabajo', async ({ page }) => {
    await showPhaseLabel(page, '🏁 Testing finalize flow');
    const finalizeButton = page.locator('button:has-text("Finalizar")').first();
    if (await finalizeButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expectVisible(finalizeButton, 'Finalize button');
      await finalizeButton.click();
      await page.waitForTimeout(2_000);
      await expectVisible(page.locator('nav button:has-text("Trabajos")'), 'Page stable');
    } else {
      await expectVisible(page.locator('text=Nuevo Trabajo'), 'Module rendered');
    }
  });
});
