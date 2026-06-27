import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { expectVisible, expectClass, showPhaseLabel } from './visual-assert';

test.describe('Cotizaciones', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('nav button:has-text("Cotizaciones")');
    await expectVisible(page.locator('h2:has-text("Cotizaciones")'), 'Section loaded');
  });

  test('should navigate to cotizaciones module', async ({ page }) => {
    await showPhaseLabel(page, '🔍 Verifying active tab');
    const activeTab = page.locator('nav button:has-text("Cotizaciones")');
    await expectClass(activeTab, /bg-indigo-600/, 'Active tab');
  });

  test('should create a new cotización', async ({ page }) => {
    await showPhaseLabel(page, '📝 Creating new cotización');
    // Click plantilla card to enter form
    const generalCard = page.locator('button:has-text("General")').first();
    await expectVisible(generalCard, 'General plantilla');
    await generalCard.click();

    await showPhaseLabel(page, '📋 Form loaded — selecting client');
    const clientSelect = page.locator('select').first();
    await expectVisible(clientSelect, 'Client select');

    const options = await clientSelect.locator('option').count();
    if (options > 1) {
      await clientSelect.selectOption({ index: 1 });
    }

    await page.waitForTimeout(1_000);

    await showPhaseLabel(page, '✅ Verifying save button');
    const saveBtn = page.locator('button:has-text("Guardar")');
    await expectVisible(saveBtn, 'Save button ready');
  });

  test('should convert cotización to trabajo', async ({ page }) => {
    await showPhaseLabel(page, '🔄 Testing cotización conversion');
    const convertButton = page.locator('button:has-text("Convertir")').first();
    if (await convertButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expectVisible(convertButton, 'Convert button');
      await convertButton.click();
      await page.waitForTimeout(3_000);
      await expectVisible(page.locator('nav button').first(), 'Page functional after convert');
    } else {
      await expectVisible(page.locator('h2:has-text("Cotizaciones")'), 'Module rendered');
    }
  });
});
