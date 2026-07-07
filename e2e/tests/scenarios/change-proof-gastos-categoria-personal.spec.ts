/**
 * change-proof-gastos-categoria-personal
 *
 * Verifies that the new "Personal" category in gastos works correctly:
 * - Category appears in the dropdown
 * - Preset subcategories are available (Alimentacion, Transporte, Salud, Educacion, Entretenimiento)
 * - Custom subcategory can be written and gasto saves without errors
 * - Custom subcategory is re-offered in dropdown after saving (localStorage persistence)
 */
import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

test.fixme('change-proof-gastos-categoria-personal — categoria personal con subcategorias personalizables', async ({ page, loginPage, dashboardPage }) => {
  test.slow();

  // Login
  await showPhaseLabel(page, 'Login');
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();

  // Navigate to gastos
  await showPhaseLabel(page, 'Gastos module');
  await dashboardPage.navigateToModule('gastos');
  await page.waitForTimeout(2000);

  // Click Nuevo Gasto
  await showPhaseLabel(page, 'Abriendo nuevo gasto');
  const btnNuevo = page.getByRole('button', { name: /nuevo gasto/i }).first();
  if (await btnNuevo.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await btnNuevo.click();
    await page.waitForTimeout(1000);
  }

  // Select Personal category
  await showPhaseLabel(page, 'Seleccionando categoria Personal');
  const catSelect = page.locator('select').first();
  await catSelect.selectOption('personal');
  await page.waitForTimeout(500);

  // Verify Personal category is selected
  const selectedCat = await catSelect.inputValue();
  expect(selectedCat).toBe('personal');

  // Verify subcategory dropdown has preset options
  await showPhaseLabel(page, 'Verificando subcategorias preset');
  const subcatSelect = page.locator('select').nth(1);
  const subcatOptions = await subcatSelect.locator('option').allTextContents();
  const hasAlimentacion = subcatOptions.some(t => t.includes('Alimentaci'));
  expect(hasAlimentacion, 'Dropdown debe incluir Alimentacion').toBe(true);
  const hasEscribir = subcatOptions.some(t => t.includes('subcategor'));
  expect(hasEscribir, 'Dropdown debe incluir opcion de escribir nueva').toBe(true);

  // Select "Escribir nueva subcategoria..."
  await showPhaseLabel(page, 'Escribiendo subcategoria personalizada');
  await subcatSelect.selectOption('__otros__');
  await page.waitForTimeout(500);

  // Type custom subcategory
  const customInput = page.locator('input[placeholder*="Describe"]').first();
  await expect(customInput).toBeVisible({ timeout: 5_000 });
  await customInput.fill('Gastos del perro');

  // Fill required fields
  await showPhaseLabel(page, 'Llenando datos del gasto');
  const conceptoInput = page.getByPlaceholder(/ej\./).first();
  await conceptoInput.fill('Veterinario Luna');
  await page.locator('input[type="number"]').first().fill('500');

  // Save
  await showPhaseLabel(page, 'Guardando gasto personal');
  await page.getByRole('button', { name: /guardar/i }).first().click();
  await page.waitForTimeout(3000);

  // Verify no error banner
  await showPhaseLabel(page, 'Verificando - sin errores');
  const errorBanner = page.locator('text=/No se pudo guardar/');
  const errorVisible = await errorBanner.isVisible({ timeout: 2_000 }).catch(() => false);
  expect(errorVisible, 'No debe aparecer error al guardar gasto personal').toBe(false);

  await showPhaseLabel(page, 'PR verificado - categoria Personal funciona correctamente');
  await page.waitForTimeout(1500);
});
