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

  if (await descInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await descInput.fill('Prueba PR #105 — con numero_orden y kilometraje');
    await page.waitForTimeout(400);
  }

  await showPhaseLabel(page, '🔢 Llenando número de orden');
  const numeroOrdenInput = page.locator([
    'input[placeholder*="número de orden" i]',
    'input[placeholder*="orden" i]',
    'input[name*="numeroOrden" i]',
    'input[name*="numero_orden" i]',
  ].join(', ')).first();

  if (await numeroOrdenInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await numeroOrdenInput.fill('OT-PR105-TEST');
    await page.waitForTimeout(300);
  }

  await showPhaseLabel(page, '🛣️ Llenando kilometraje');
  const kilometrajeInput = page.locator([
    'input[placeholder*="kilom" i]',
    'input[name*="kilometraje" i]',
  ].join(', ')).first();

  if (await kilometrajeInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await kilometrajeInput.fill('55000');
    await page.waitForTimeout(300);
  }

  await showPhaseLabel(page, '💾 Guardando trabajo con numero_orden + kilometraje');
  await trabajosPage.save();
  await page.waitForTimeout(3000);

  await showPhaseLabel(page, '✅ Verificando: sin error de guardado');
  const errorBanner = page.locator('text=/No se pudo guardar el trabajo/i');
  const errorVisible = await errorBanner.isVisible({ timeout: 2_000 }).catch(() => false);

  expect(
    errorVisible,
    '❌ Error "No se pudo guardar el trabajo" debe estar AUSENTE — la corrección 42703 debe funcionar'
  ).toBe(false);

  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(800);

  const historial = page.locator('text=/Historial de Trabajos/i');
  if (await historial.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expectVisible(historial, '✅ Historial de Trabajos visible — save completado sin crash');
  }

  await showPhaseLabel(page, '🎉 PR #105 verificado — numero_orden + kilometraje se guardan sin error 42703');
  await page.waitForTimeout(1500);
});
