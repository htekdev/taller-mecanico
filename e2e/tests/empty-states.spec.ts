import { test, expect } from '@playwright/test';
import { login, navigateTo, expectSectionTitle } from './helpers';

/**
 * Empty State Tests — Taller Mecánico
 *
 * Verifies that each module displays correctly when there is no data,
 * showing appropriate messages or empty forms rather than crashing.
 */

test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('cotizaciones shows section title and plantilla cards when empty', async ({ page }) => {
    await navigateTo(page, 'Cotizaciones');
    await expectSectionTitle(page, 'Cotizaciones');

    // The inicio screen should show "Nueva Cotización" heading and plantilla cards
    await expect(page.locator('text=Nueva Cotización')).toBeVisible({ timeout: 5_000 });
    // At least one plantilla card should be visible
    await expect(page.locator('button:has-text("General")').first()).toBeVisible({ timeout: 5_000 });
  });

  test('trabajos shows form even with no existing jobs', async ({ page }) => {
    await navigateTo(page, 'Trabajos');
    await expectSectionTitle(page, 'Trabajos');

    // The "Nuevo Trabajo" form heading should always be visible
    await expect(page.locator('text=Nuevo Trabajo')).toBeVisible({ timeout: 10_000 });

    // Client select should be present (even if options are loading)
    const clientSelect = page.locator('select').first();
    await expect(clientSelect).toBeVisible({ timeout: 10_000 });
  });

  test('inventario shows form and table/empty when no parts', async ({ page }) => {
    await navigateTo(page, 'Inventario');
    await expectSectionTitle(page, 'Inventario');

    // The add-to-inventory form should be visible
    const submitBtn = page.locator('button:has-text("Agregar al Inventario")');
    await expect(submitBtn).toBeVisible({ timeout: 5_000 });
  });

  test('proveedores loads without error', async ({ page }) => {
    await navigateTo(page, 'Proveedores');
    // Module should render — either a section title or content
    const content = page.locator('h2, select, input, table').first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('gastos loads without error', async ({ page }) => {
    await navigateTo(page, 'Gastos');
    const content = page.locator('h2, select, input, button').first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('resumen loads without error', async ({ page }) => {
    await navigateTo(page, 'Resumen');
    const content = page.locator('h2, .rounded-2xl, canvas').first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('historial loads without error', async ({ page }) => {
    await navigateTo(page, 'Historial');
    const content = page.locator('h2, table, .rounded-xl').first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('configuración loads without error', async ({ page }) => {
    await navigateTo(page, 'Configuración');
    const content = page.locator('h2, input, button, select').first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });
});
