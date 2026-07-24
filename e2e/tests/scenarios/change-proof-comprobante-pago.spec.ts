import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * change-proof-comprobante-pago
 *
 * Proof that PR #183 adds a "Comprobante" button to fully-paid work orders.
 *
 * Walk-through (creates own data, all assertions scoped to specific job):
 * 1. Login
 * 2. Navigate to Trabajos
 * 3. Create a new trabajo "Prueba comprobante PR183 — frenos $200"
 * 4. Save
 * 5. Finalizar → "Nota de Cobro"
 * 6. Navigate to Por Cobrar
 * 7. Find the row matching the unique description, register $200 payment
 * 8. Navigate back to Trabajos
 * 9. Find the row matching the unique description
 * 10. Assert: comprobante button visible + enabled (unconditional, scoped to THIS job)
 */
test('change-proof-comprobante-pago — button appears on fully-paid job', async ({
  page, loginPage, dashboardPage, trabajosPage, cuentasCobrarPage,
}) => {
  test.slow();

  const JOB_DESCRIPTION = 'Prueba comprobante PR183 — frenos $200';

  // ── Login ──────────────────────────────────────────────────────────────────
  await showPhaseLabel(page, '🔐 Login');
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();

  // ── Navigate to Trabajos ───────────────────────────────────────────────────
  await showPhaseLabel(page, '🔧 Módulo Trabajos');
  await dashboardPage.navigateToModule('trabajos');
  await trabajosPage.waitForPageLoad();
  await page.waitForTimeout(1500);

  // ── Create a trabajo with a labor item ────────────────────────────────────
  await showPhaseLabel(page, '📝 Creando trabajo de prueba');
  // Try multiple client indices until we find one with vehicles
  let vehicleFound = false;
  for (let ci = 1; ci <= 8; ci++) {
    await trabajosPage.selectClient(ci);
    // Check if vehicle dropdown has options (> 1 means there's at least one vehicle)
    await page.waitForTimeout(800);
    const vehicleSelect = page.locator('[data-testid="vehiculo-select"]');
    const optCount = await vehicleSelect.locator('option').count();
    if (optCount > 1) {
      await trabajosPage.selectVehicle(1);
      vehicleFound = true;
      break;
    }
  }
  expect(vehicleFound, 'Se debe encontrar un cliente con vehiculo registrado').toBe(true);
  await trabajosPage.fillDescription(JOB_DESCRIPTION);
  await trabajosPage.addLaborItem('Revisión de frenos', 200);
  await trabajosPage.save();
  await page.waitForTimeout(3000);

  // Confirm no error after save
  const saveErr = await trabajosPage.getFinalizarError();
  expect(saveErr, 'No debe haber error al guardar el trabajo').toBeNull();

  // ── Finalizar ─────────────────────────────────────────────────────────────
  await showPhaseLabel(page, '✅ Finalizando trabajo');
  await trabajosPage.finalizar();

  const notaBtn = page.getByRole('button', { name: /nota de cobro|nota/i }).first();
  if (await notaBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await notaBtn.click();
    await page.waitForTimeout(2000);
  }

  // ── Navigate to CxC and register payment on THIS job's row ───────────────
  await showPhaseLabel(page, '💰 Registrando pago en Por Cobrar');
  await dashboardPage.navigateToModule('cuentas');
  await cuentasCobrarPage.waitForPageLoad();
  await page.waitForTimeout(1500);

  // Scope to the specific CxC row for this job (by unique description)
  const cuentaRow = page
    .locator('[class*="border"][class*="rounded"], .border.rounded-xl')
    .filter({ hasText: /Prueba comprobante PR183/i })
    .first();
  await expect(cuentaRow, 'Debe aparecer la cuenta del trabajo recién creado').toBeVisible({ timeout: 10_000 });

  // Register payment from within the row
  await cuentaRow.getByRole('button', { name: /registrar pago|abonar/i }).click();
  await page.waitForTimeout(500);

  const pagoMontoInput = page.locator('input[type="number"][placeholder*="monto" i], input[type="number"]').first();
  if (await pagoMontoInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await pagoMontoInput.fill('200');
  }
  const pagoMetodoSelect = page.locator('select:has(option:has-text("Efectivo"))').first();
  if (await pagoMetodoSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await pagoMetodoSelect.selectOption({ label: 'Efectivo' });
  }
  const confirmBtn = page.getByRole('button', { name: /confirmar|guardar pago/i }).first();
  await confirmBtn.click();
  await page.waitForTimeout(2000);


  // ── Assert: comprobante button visible in CxC (THE NEW FEATURE) ────────────
  await showPhaseLabel(page, '🧾 Verificando botón Comprobante en CxC — VistaCuentas');
  // Row is already visible from payment step — still on CxC tab
  const cxcPaidRow = page
    .locator('[class*="border"][class*="rounded"], .border.rounded-xl')
    .filter({ hasText: /Prueba comprobante PR183/i })
    .first();
  await expect(cxcPaidRow, 'Fila pagada debe ser visible en CxC tras pago completo').toBeVisible({ timeout: 10_000 });
  const cxcComprobanteBtn = cxcPaidRow.getByRole('button', { name: /comprobante/i });
  await expect(cxcComprobanteBtn, 'Botón Comprobante debe aparecer en CxC para trabajo pagado').toBeVisible({ timeout: 10_000 });
  await expect(cxcComprobanteBtn, 'Botón no debe estar deshabilitado en CxC').not.toBeDisabled();
  await showPhaseLabel(page, '✅ Comprobante disponible en CxC (VistaCuentas)');

  // ── Navigate back to Trabajos ─────────────────────────────────────────────
  await showPhaseLabel(page, '🔧 Volviendo a Trabajos');
  await dashboardPage.navigateToModule('trabajos');
  await trabajosPage.waitForPageLoad();
  await page.waitForTimeout(1500);

  // ── Assert: comprobante button visible on THIS job's row ──────────────────
  await showPhaseLabel(page, '✅ Verificando botón Comprobante — scoped to PR183 job row');

  // Find the specific trabajo row by its unique description
  const trabajoRow = page
    .locator('[class*="border"][class*="rounded"], .border.rounded-xl')
    .filter({ hasText: /Prueba comprobante PR183/i })
    .first();
  await expect(trabajoRow, 'Debe verse la fila del trabajo pagado').toBeVisible({ timeout: 10_000 });

  // The comprobante button must be WITHIN this row (not any pre-existing paid job)
  const comprobanteBtn = trabajoRow.getByRole('button', { name: /comprobante/i });
  await expect(comprobanteBtn, 'Debe haber botón Comprobante en el trabajo recién pagado').toBeVisible({ timeout: 10_000 });
  await expect(comprobanteBtn, 'El botón no debe estar deshabilitado').not.toBeDisabled();

  const label = await comprobanteBtn.textContent();
  expect(label, 'Texto del botón debe incluir "comprobante"').toMatch(/comprobante/i);

  await showPhaseLabel(page, '🎉 PR #183 verificado — Comprobante disponible en trabajos pagados');
  await page.waitForTimeout(1000);
});
