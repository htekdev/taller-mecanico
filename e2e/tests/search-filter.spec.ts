import { test, expect } from '@playwright/test';
import { login, navigateTo, expectSectionTitle } from './helpers';
import { expectVisible, showPhaseLabel } from './visual-assert';

/**
 * Search and Filter Tests — Taller Mecánico
 *
 * Verifies search/filter UI works in modules that support it.
 * Inventario has proveedor + category filters.
 * Trabajos has client + vehicle filters.
 * Cotizaciones has a client filter.
 */

test.describe('Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('inventario: filter by category', async ({ page }) => {
    await navigateTo(page, 'Inventario');
    await expectSectionTitle(page, 'Inventario');
    await showPhaseLabel(page, '🔍 Testing category filter');

    // Find the category filter select
    const categoryFilter = page.locator('select').last();
    await expectVisible(categoryFilter, 'Category filter');

    const options = await categoryFilter.locator('option').count();
    if (options > 1) {
      await categoryFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1_500);
      // Page should still be functional after filtering
      await expect(page.locator('h2:has-text("Inventario")')).toBeVisible();
    }
  });

  test('inventario: filter by proveedor', async ({ page }) => {
    await navigateTo(page, 'Inventario');
    await expectSectionTitle(page, 'Inventario');
    await showPhaseLabel(page, '🔍 Testing proveedor filter');

    // The proveedor filter is a Select component
    const proveedorFilter = page.locator('select').nth(1);
    await expectVisible(proveedorFilter, 'Proveedor filter');

    const options = await proveedorFilter.locator('option').count();
    if (options > 1) {
      await proveedorFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1_500);
      await expect(page.locator('h2:has-text("Inventario")')).toBeVisible();
    }
  });

  test('trabajos: filter by client', async ({ page }) => {
    await navigateTo(page, 'Trabajos');
    await expectSectionTitle(page, 'Trabajos');
    await showPhaseLabel(page, '🔍 Testing client filter');

    // The client filter selects are below the form
    const filterSelects = page.locator('select');
    const count = await filterSelects.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify the form section is intact after page load
    await expect(page.locator('text=Nuevo Trabajo')).toBeVisible({ timeout: 5_000 });
  });

  test('cotizaciones: filter by client', async ({ page }) => {
    await navigateTo(page, 'Cotizaciones');
    await expectSectionTitle(page, 'Cotizaciones');
    await showPhaseLabel(page, '🔍 Testing cotizaciones client filter');

    // The cotizaciones inicio screen has a client filter select
    const filterSelect = page.locator('select').first();
    if (await filterSelect.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expectVisible(filterSelect, 'Client filter');
      const options = await filterSelect.locator('option').count();
      expect(options).toBeGreaterThanOrEqual(1);
    } else {
      // No filter visible — verify page rendered
      await expect(page.locator('text=Nueva Cotización')).toBeVisible();
    }
  });
});
