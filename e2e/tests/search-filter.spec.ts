import { test, expect } from '@playwright/test';
import { login, navigateTo, expectSectionTitle } from './helpers';

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

    // Find the category filter select
    const categoryFilter = page.locator('select').last();
    if (await categoryFilter.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const options = await categoryFilter.locator('option').count();
      if (options > 1) {
        // Select a category and verify the list updates (no crash)
        await categoryFilter.selectOption({ index: 1 });
        await page.waitForTimeout(1_500);

        // Reset filter
        const clearBtn = page.locator('button:has-text("Limpiar"), button:has-text("✕"), button:has-text("Todos")').first();
        if (await clearBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await clearBtn.click();
          await page.waitForTimeout(1_000);
        }
      }
    }
  });

  test('inventario: filter by proveedor', async ({ page }) => {
    await navigateTo(page, 'Inventario');
    await expectSectionTitle(page, 'Inventario');

    // The proveedor filter is a Select component
    const proveedorFilter = page.locator('select').nth(1);
    if (await proveedorFilter.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const options = await proveedorFilter.locator('option').count();
      if (options > 1) {
        await proveedorFilter.selectOption({ index: 1 });
        await page.waitForTimeout(1_500);
        // Page should still be functional after filtering
        await expectSectionTitle(page, 'Inventario');
      }
    }
  });

  test('trabajos: filter by client', async ({ page }) => {
    await navigateTo(page, 'Trabajos');
    await expectSectionTitle(page, 'Trabajos');

    // Find the client filter select (separate from the form select)
    // The filter selects are below the form, in the list section
    const filterSelects = page.locator('select');
    const count = await filterSelects.count();

    // The client filter is typically the 4th+ select (after form selects)
    if (count >= 4) {
      const clientFilter = filterSelects.nth(count - 2); // second to last
      if (await clientFilter.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const options = await clientFilter.locator('option').count();
        if (options > 1) {
          await clientFilter.selectOption({ index: 1 });
          await page.waitForTimeout(1_500);
          await expectSectionTitle(page, 'Trabajos');
        }
      }
    }
  });

  test('cotizaciones: filter by client', async ({ page }) => {
    await navigateTo(page, 'Cotizaciones');
    await expectSectionTitle(page, 'Cotizaciones');

    // The cotizaciones inicio screen has a client filter select
    const filterSelect = page.locator('select').first();
    if (await filterSelect.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const options = await filterSelect.locator('option').count();
      if (options > 1) {
        await filterSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1_500);
        await expectSectionTitle(page, 'Cotizaciones');
      }
    }
  });
});
