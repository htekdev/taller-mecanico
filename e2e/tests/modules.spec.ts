import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Órdenes de Compra', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('nav button:has-text("Órdenes de Compra")');
    await page.waitForTimeout(2_000);
  });

  test('should navigate to órdenes de compra module', async ({ page }) => {
    const activeTab = page.locator('nav button:has-text("Órdenes de Compra")');
    await expect(activeTab).toHaveClass(/bg-indigo-600/);
  });

  test('should display orders list', async ({ page }) => {
    // The module renders a SectionTitle and either order cards or the form
    const sectionTitle = page.locator('h2:has-text("Órdenes de Compra")');
    await expect(sectionTitle).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Proveedores', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('nav button:has-text("Proveedores")');
    await page.waitForTimeout(2_000);
  });

  test('should navigate to proveedores module', async ({ page }) => {
    const activeTab = page.locator('nav button:has-text("Proveedores")');
    await expect(activeTab).toHaveClass(/bg-indigo-600/);
  });

  test('should display proveedores list', async ({ page }) => {
    const table = page.locator('table').first();
    const emptyState = page.locator('text=No hay proveedores');
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Cuentas por Cobrar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('nav button:has-text("Por Cobrar")');
    await page.waitForTimeout(2_000);
  });

  test('should navigate to cuentas por cobrar module', async ({ page }) => {
    const activeTab = page.locator('nav button:has-text("Por Cobrar")');
    await expect(activeTab).toHaveClass(/bg-indigo-600/);
  });

  test('should display accounts receivable list', async ({ page }) => {
    // The module shows a SectionTitle "Cuentas por Cobrar"
    const sectionTitle = page.locator('h2:has-text("Cuentas por Cobrar")');
    await expect(sectionTitle).toBeVisible({ timeout: 10_000 });
  });
});
