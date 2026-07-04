import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * change-proof-numero-orden-kilometraje
 *
 * Regression proof for PR #105:
 *   Bug 1: numero_orden was silently dropped from insertTrabajo/updateTrabajo payloads.
 *   Bug 2: kilometraje column missing in production → 42703 crash on job save.
 *
 * This spec proves the fix by:
 *   1. Creating a job WITH numero_orden and kilometraje filled
 *   2. Verifying NO error banner appears (previously: 42703 crash → "No se pudo guardar")
 *   3. Verifying the Historial section updates (job saved → list refreshes)
 *
 * The unit tests in __tests__/lib/db.test.ts cover payload construction and
 * 42703 fallback logic. This E2E spec proves the UI flow completes without error.
 */

test('change-proof-numero-orden-kilometraje', async ({ page, loginPage, dashboardPage, trabajosPage }) => {
  test.slow();
  const descriptionText = 'Trabajo de prueba numero_orden + kilometraje';
  const numeroOrdenValue = 'OT-PR105-TEST';
  const kilometrajeValue = '55000';

  await showPhaseLabel(page, '🔐 Login');
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();

  await showPhaseLabel(page, '🔧 Abriendo módulo Trabajos');
  await dashboardPage.navigateToModule('trabajos');
  await trabajosPage.waitForPageLoad();
  await page.waitForTimeout(1000);

  await showPhaseLabel(page, '👤 Seleccionando cliente y vehículo');
  await trabajosPage.selectClient(1);
  await trabajosPage.selectVehicle(1);

  await showPhaseLabel(page, '📝 Llenando descripción');
  const descInput = page.locator([
    'input[placeholder*="Ej." i]',
    'input[placeholder*="Servicio completo" i]',
    'textarea[placeholder*="descripci" i]',
  ].join(', ')).first();

  await expect(descInput).toBeVisible({ timeout: 10_000 });
  await descInput.fill(descriptionText);

  await showPhaseLabel(page, '🔢 Llenando número de orden');
  const numeroOrdenInput = page
    .getByLabel(/Número de Orden/i)
    .or(page.getByPlaceholder(/numero.*orden|OT-/i))
    .first();
  await expect(numeroOrdenInput).toBeVisible({ timeout: 10_000 });
  await numeroOrdenInput.fill(numeroOrdenValue);

  await showPhaseLabel(page, '🛣️ Llenando kilometraje');
  const kilometrajeInput = page.getByPlaceholder('Ej. 85000').first();
  await expect(kilometrajeInput).toBeVisible({ timeout: 10_000 });
  await kilometrajeInput.fill(kilometrajeValue);

  await showPhaseLabel(page, '💾 Guardando trabajo con numero_orden + kilometraje');
  const errorBanner = page.locator('text=/No se pudo guardar el trabajo/i');
  const savedRow = page.locator('tr', { hasText: descriptionText }).first();
  await trabajosPage.save();
  await Promise.race([
    savedRow.waitFor({ state: 'visible', timeout: 15_000 }),
    errorBanner.waitFor({ state: 'visible', timeout: 15_000 }),
  ]);

  await showPhaseLabel(page, '✅ Verificando: sin error de guardado');
  const errorVisible = await errorBanner.isVisible({ timeout: 2_000 }).catch(() => false);

  expect(
    errorVisible,
    '❌ Error "No se pudo guardar el trabajo" debe estar AUSENTE — la corrección 42703 debe funcionar'
  ).toBe(false);

  await expect(savedRow).toBeVisible({ timeout: 10_000 });
  await expect(savedRow.getByText(/55,?000 km/i)).toBeVisible({ timeout: 10_000 });

  const historial = page.locator('text=/Historial de Trabajos/i');
  await expectVisible(historial, '✅ Historial de Trabajos visible — save completado sin crash');

  await showPhaseLabel(page, '🔄 Verificando persistencia tras recarga');
  await page.reload();
  await trabajosPage.waitForPageLoad();

  const persistedRow = page.locator('tr', { hasText: descriptionText }).first();
  await expect(persistedRow).toBeVisible({ timeout: 10_000 });
  await expect(persistedRow.getByText(/55,?000 km/i)).toBeVisible({ timeout: 10_000 });
  await persistedRow.getByRole('button', { name: /editar/i }).click();

  const persistedNumeroOrdenInput = page
    .getByLabel(/Número de Orden/i)
    .or(page.getByPlaceholder(/numero.*orden|OT-/i))
    .first();
  const persistedKilometrajeInput = page.getByPlaceholder('Ej. 85000').first();
  await expect(persistedNumeroOrdenInput).toHaveValue(numeroOrdenValue);
  await expect(persistedKilometrajeInput).toHaveValue(kilometrajeValue);

  await showPhaseLabel(page, '🎉 PR #105 verificado — numero_orden + kilometraje se guardan sin error 42703');
});
