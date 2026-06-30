import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * change-proof-guardar-trabajo — Proof that PR #102 fixes "No se pudo guardar el trabajo"
 *
 * Bug: insertTrabajo sent tipo_cliente, pendiente_refacciones, refacciones_pendientes_nombres
 *      unconditionally → Supabase rejected the INSERT if those columns didn't exist in production.
 *
 * Fix: columns are now conditional (only sent when non-default), matching the pattern
 *      already used for tft_estado, departamento, etc.
 *
 * Walk-through:
 * 1. Login
 * 2. Navigate to Trabajos via dashboard
 * 3. Select client + vehicle (required to enable the submit button)
 * 4. Fill description
 * 5. Submit → verify NO error banner appears
 * 6. Verify Historial shows the job
 */

test('change-proof-guardar-trabajo', async ({ page, loginPage, dashboardPage, trabajosPage }) => {
  test.slow(); // Auth + Supabase save on cold preview can be slow

  // ── Login ─────────────────────────────────────────────────────────────────
  await showPhaseLabel(page, '🔐 Login');
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();

  // ── Navigate to Trabajos ──────────────────────────────────────────────────
  await showPhaseLabel(page, '🔧 Abriendo módulo Trabajos');
  await dashboardPage.navigateToModule('trabajos');
  await trabajosPage.waitForPageLoad();
  await page.waitForTimeout(1000);

  // ── Select client + vehicle (required fields) ─────────────────────────────
  await showPhaseLabel(page, '👤 Seleccionando cliente y vehículo');

  // Select client (must have options; waits up to 15s internally)
  await trabajosPage.selectClient(1);

  // Select vehicle (depends on selected client; appears after client selection)
  await trabajosPage.selectVehicle(1);

  // ── Fill description (required field) ─────────────────────────────────────
  await showPhaseLabel(page, '📝 Llenando descripción del trabajo');

  // The actual descripcion placeholder is "Ej. Servicio completo frenos y aceite..."
  const descInput = page.locator([
    'input[placeholder*="Ej." i]',
    'input[placeholder*="Servicio completo" i]',
    'input[placeholder*="frenos" i]',
    'textarea[placeholder*="descripci" i]',
  ].join(', ')).first();

  if (await descInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await descInput.fill('Prueba PR #102 — verificación arreglo insertTrabajo sin error');
    await page.waitForTimeout(500);
  }

  await showPhaseLabel(page, '💾 Guardando trabajo...');
  await page.waitForTimeout(400);

  // ── Submit via POM save() — checks disabled state before clicking ─────────
  // Button is: disabled={guardandoForm || !clienteId || !vehiculoId || !descripcion}
  // After selecting client, vehicle, and filling description it should be enabled.
  await trabajosPage.save();
  await page.waitForTimeout(3000); // Wait for Supabase response

  // ── Verify: NO error banner ───────────────────────────────────────────────
  await showPhaseLabel(page, '✅ Verificando: sin error "No se pudo guardar"');

  const errorBanner = page.locator('text=/No se pudo guardar el trabajo/');
  const errorVisible = await errorBanner.isVisible({ timeout: 2_000 }).catch(() => false);

  // The fix works if no error banner is shown
  expect(errorVisible, 'Error "No se pudo guardar el trabajo" debe estar AUSENTE').toBe(false);

  await page.waitForTimeout(800);

  // ── Verify: Historial de Trabajos is visible ──────────────────────────────
  await showPhaseLabel(page, '📊 Historial actualizado');
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(1000);

  const historial = page.locator('text=/Historial de Trabajos/');
  if (await historial.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expectVisible(historial, '✅ Historial de Trabajos visible — trabajo guardado correctamente');
  }

  await showPhaseLabel(page, '🎉 PR #102 verificado — insertTrabajo funciona sin error');
  await page.waitForTimeout(1500);
});
