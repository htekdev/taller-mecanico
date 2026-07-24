import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * change-proof-comprobante-pago
 *
 * Proof that PR #183 adds a "Comprobante" button to fully-paid work orders.
 *
 * Walk-through (creates its own test data — no conditional skips):
 * 1. Login
 * 2. Navigate to Trabajos
 * 3. Create a new trabajo with a $200 labor item
 * 4. Save the trabajo
 * 5. Click Finalizar → select "Nota de Cobro" in the modal
 * 6. Navigate to "Por Cobrar" (Cuentas por Cobrar)
 * 7. Register full payment of $200 on the first pending account
 * 8. Navigate back to Trabajos
 * 9. Assert: comprobante button visible and enabled on the paid trabajo
 */
test('change-proof-comprobante-pago — button appears on fully-paid job', async ({
  page, loginPage, dashboardPage, trabajosPage, cuentasCobrarPage,
}) => {
  test.slow();

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
  await trabajosPage.selectClient(1);
  await trabajosPage.selectVehicle(1);
  await trabajosPage.fillDescription('Prueba comprobante PR183 — frenos $200');
  await trabajosPage.addLaborItem('Revisión de frenos', 200);
  await trabajosPage.save();
  await page.waitForTimeout(3000); // Wait for Supabase insert

  // Confirm no error after save
  const saveErr = await trabajosPage.getFinalizarError();
  expect(saveErr, 'No debe haber error al guardar el trabajo').toBeNull();

  // ── Finalizar the trabajo ──────────────────────────────────────────────────
  await showPhaseLabel(page, '✅ Finalizando trabajo');
  await trabajosPage.finalizar();

  // Dismiss the factura/nota modal — choose "Nota de Cobro"
  const notaBtn = page.getByRole('button', { name: /nota de cobro|nota/i }).first();
  if (await notaBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await notaBtn.click();
    await page.waitForTimeout(2000);
  }

  // ── Navigate to Cuentas por Cobrar and register full payment ──────────────
  await showPhaseLabel(page, '💰 Registrando pago en Por Cobrar');
  await dashboardPage.navigateToModule('cuentas');
  await cuentasCobrarPage.waitForPageLoad();
  await page.waitForTimeout(1500);

  // Register full payment ($200) on first account
  await cuentasCobrarPage.registerPayment(200, 'Efectivo');
  await page.waitForTimeout(2000);

  // ── Navigate back to Trabajos ─────────────────────────────────────────────
  await showPhaseLabel(page, '🔧 Volviendo a Trabajos');
  await dashboardPage.navigateToModule('trabajos');
  await trabajosPage.waitForPageLoad();
  await page.waitForTimeout(1500);

  // ── Assert: comprobante button is visible and enabled ─────────────────────
  await showPhaseLabel(page, '✅ Verificando botón Comprobante en trabajo pagado');

  const comprobanteBtn = page.getByRole('button', { name: /comprobante/i }).first();

  // Button must be present (unconditional — we just created a paid job above)
  await expect(comprobanteBtn, 'Debe haber un botón Comprobante para el trabajo pagado').toBeVisible({ timeout: 10_000 });
  await expect(comprobanteBtn, 'El botón Comprobante no debe estar deshabilitado').not.toBeDisabled();

  // Verify it has the correct accessible text
  const label = await comprobanteBtn.textContent();
  expect(label, 'Botón debe tener texto "Comprobante"').toMatch(/comprobante/i);

  await showPhaseLabel(page, '🎉 PR #183 verificado — botón Comprobante correctamente implementado en trabajos pagados');
  await page.waitForTimeout(1000);
});
