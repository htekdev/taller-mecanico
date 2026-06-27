import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { expectVisible, expectClass, showPhaseLabel } from './visual-assert';

test.describe('Órdenes de Compra', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('nav button:has-text("Órdenes de Compra")');
    await page.waitForTimeout(2_000);
  });

  test('should navigate to órdenes de compra module', async ({ page }) => {
    await showPhaseLabel(page, '🔍 Verifying active tab');
    const activeTab = page.locator('nav button:has-text("Órdenes de Compra")');
    await expectClass(activeTab, /bg-indigo-600/, 'Active tab');
  });

  test('should display orders list', async ({ page }) => {
    await showPhaseLabel(page, '📋 Checking orders display');
    const sectionTitle = page.locator('h2:has-text("Órdenes de Compra")');
    await expectVisible(sectionTitle, 'Section title');
  });
});

test.describe('Proveedores', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('nav button:has-text("Proveedores")');
    await page.waitForTimeout(2_000);
  });

  test('should navigate to proveedores module', async ({ page }) => {
    await showPhaseLabel(page, '🔍 Verifying active tab');
    const activeTab = page.locator('nav button:has-text("Proveedores")');
    await expectClass(activeTab, /bg-indigo-600/, 'Active tab');
  });

  test('should display proveedores list', async ({ page }) => {
    await showPhaseLabel(page, '📋 Checking proveedores display');
    const table = page.locator('table').first();
    const emptyState = page.locator('text=No hay proveedores');
    await expectVisible(table.or(emptyState), 'Proveedores content');
  });
});

test.describe('Cuentas por Cobrar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('nav button:has-text("Por Cobrar")');
    await page.waitForTimeout(2_000);
  });

  test('should navigate to cuentas por cobrar module', async ({ page }) => {
    await showPhaseLabel(page, '🔍 Verifying active tab');
    const activeTab = page.locator('nav button:has-text("Por Cobrar")');
    await expectClass(activeTab, /bg-indigo-600/, 'Active tab');
  });

  test('should display accounts receivable list', async ({ page }) => {
    await showPhaseLabel(page, '💰 Checking cuentas por cobrar');
    const sectionTitle = page.locator('h2:has-text("Cuentas por Cobrar")');
    await expectVisible(sectionTitle, 'Section title');
  });
});
