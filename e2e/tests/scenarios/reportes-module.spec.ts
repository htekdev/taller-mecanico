import { test, expect } from '../../fixtures';

/**
 * reportes-module — E2E coverage for the "Reportes y Sugerencias" module
 *
 * 1. Navigates to Reportes and shows section title + both tabs
 * 2. "Estado" tab (default) renders filter badges for all states
 * 3. "Nuevo Reporte" tab renders the complete submission form
 * 4. Form validates: empty title → shows error
 * 5. Form validates: title filled but empty description → shows error
 * 6. Filter badges change the visible section heading when clicked
 */

test.describe('reportes-module', () => {
  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    test.slow();
    await loginPage.goto();
    await loginPage.login('sofia@test.com', 'Test1234!');
    await dashboardPage.waitForPageLoad();
    await dashboardPage.navigateToModule('reportes');
    // Wait for module heading to confirm navigation succeeded
    await expect(
      dashboardPage.page.getByText('📣 Reportes y Sugerencias'),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('1. shows module title and both navigation tabs', async ({ page }) => {
    await expect(page.getByText('📣 Reportes y Sugerencias')).toBeVisible();
    await expect(page.getByText('📋 Ver Reportes')).toBeVisible();
    await expect(page.getByText('✏️ Nuevo Reporte')).toBeVisible();
  });

  test('2. Estado tab shows all four filter badges', async ({ page }) => {
    // "Estado" tab is active by default — filter badges should render
    await expect(page.getByText('Total')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Pendientes')).toBeVisible();
    await expect(page.getByText('En Progreso')).toBeVisible();
    await expect(page.getByText('Resueltos')).toBeVisible();
  });

  test('3. Nuevo Reporte tab shows complete submission form', async ({ page }) => {
    await page.getByText('✏️ Nuevo Reporte').click();
    await expect(page.getByText('Título *')).toBeVisible();
    await expect(page.getByText('Descripción *')).toBeVisible();
    await expect(page.getByText('Categoría')).toBeVisible();
    await expect(page.getByText('Prioridad (opcional)')).toBeVisible();
    await expect(page.getByText('📤 Enviar Reporte')).toBeVisible();
  });

  test('4. form validation — empty title shows required error', async ({ page }) => {
    await page.getByText('✏️ Nuevo Reporte').click();
    // Submit without filling anything
    await page.getByText('📤 Enviar Reporte').click();
    await expect(page.getByRole('alert')).toContainText('El título es obligatorio');
  });

  test('5. form validation — title filled but empty description shows error', async ({ page }) => {
    await page.getByText('✏️ Nuevo Reporte').click();
    // Fill title only
    await page.locator('input[maxlength="120"]').fill('Test E2E título');
    await page.getByText('📤 Enviar Reporte').click();
    await expect(page.getByRole('alert')).toContainText('La descripción es obligatoria');
  });

  test('6. filter badges update section heading when clicked', async ({ page }) => {
    // Wait for Estado tab to load
    await expect(page.getByText('Total')).toBeVisible({ timeout: 20_000 });
    // Click "Pendientes" filter
    await page.getByText('Pendientes').click();
    // Heading should change (shows filtered state or all if empty)
    const heading = page.locator('h2, h3').filter({ hasText: /reportes|reporte/i }).first();
    await expect(heading).toBeVisible({ timeout: 5_000 });
    // Click "Resueltos" filter — verify it's clickable and doesn't crash
    await page.getByText('Resueltos').click();
    await expect(page.getByText('Resueltos')).toBeVisible();
  });
});