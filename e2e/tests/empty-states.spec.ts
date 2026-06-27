import { test, expect } from '@playwright/test';
import { login, navigateTo, expectSectionTitle } from './helpers';
import { expectVisible, showPhaseLabel } from './visual-assert';

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
    await showPhaseLabel(page, '📋 Empty state: Cotizaciones');
    await expectSectionTitle(page, 'Cotizaciones');

    await expectVisible(page.locator('text=Nueva Cotización'), 'Nueva heading');
    await expectVisible(page.locator('button:has-text("General")').first(), 'Plantilla card');
  });

  test('trabajos shows form even with no existing jobs', async ({ page }) => {
    await navigateTo(page, 'Trabajos');
    await showPhaseLabel(page, '📋 Empty state: Trabajos');
    await expectSectionTitle(page, 'Trabajos');

    await expectVisible(page.locator('text=Nuevo Trabajo'), 'Form header');
    const clientSelect = page.locator('select').first();
    await expectVisible(clientSelect, 'Client select');
  });

  test('inventario shows form and table/empty when no parts', async ({ page }) => {
    await navigateTo(page, 'Inventario');
    await showPhaseLabel(page, '📋 Empty state: Inventario');
    await expectSectionTitle(page, 'Inventario');

    const submitBtn = page.locator('button:has-text("Agregar al Inventario")');
    await expectVisible(submitBtn, 'Add part button');
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
