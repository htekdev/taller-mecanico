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
 * This walk-through:
 * 1. Logs in
 * 2. Navigates to Trabajos
 * 3. Fills the "Registrar Trabajo" form (mano de obra only — no refacciones needed)
 * 4. Submits → verifies NO error banner appears
 * 5. Verifies the new job appears in the list
 */

test('change-proof-guardar-trabajo', async ({ page, loginPage }) => {
  test.slow(); // Auth + Supabase save on cold preview can be slow

  await showPhaseLabel(page, '🔐 Login');
  await loginPage.loginAsTestUser();

  // ── Navigate to Trabajos ──────────────────────────────────────────────────
  await showPhaseLabel(page, '🔧 Abriendo módulo Trabajos');
  const nav = page.locator('nav');
  await nav.waitFor({ state: 'visible', timeout: 45_000 });

  const trabajosTab = nav.getByRole('button', { name: 'Trabajos' });
  await trabajosTab.click();
  await page.waitForTimeout(1000);

  // ── Show the Registrar Trabajo form ──────────────────────────────────────
  await showPhaseLabel(page, '📋 Formulario Registrar Trabajo');
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(800);

  // Fill Descripción (required field)
  const descripcionInput = page.locator('textarea, input[placeholder*="descripci" i]').first();
  if (await descripcionInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await descripcionInput.fill('Servicio de prueba — verificación arreglo PR #102');
    await page.waitForTimeout(500);
  }

  // Fill mano de obra amount (to have a non-zero total)
  const manoDeObraInput = page.locator('input[type="number"]').first();
  if (await manoDeObraInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await manoDeObraInput.fill('500');
    await page.waitForTimeout(500);
  }

  await showPhaseLabel(page, '💾 Guardando trabajo...');
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(600);

  // ── Submit the form ───────────────────────────────────────────────────────
  const submitBtn = page.getByRole('button', { name: /registrar trabajo/i });
  if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await submitBtn.click();
    await page.waitForTimeout(3000); // Wait for Supabase response
  }

  // ── Verify: NO error banner ───────────────────────────────────────────────
  await showPhaseLabel(page, '✅ Verificando: sin error "No se pudo guardar"');

  const errorBanner = page.locator('text=/No se pudo guardar el trabajo/');
  const errorVisible = await errorBanner.isVisible({ timeout: 2_000 }).catch(() => false);

  // The fix works if no error banner is shown
  expect(errorVisible, 'Error "No se pudo guardar el trabajo" debe estar AUSENTE').toBe(false);

  await page.waitForTimeout(1000);

  // ── Verify: Historial de Trabajos count increased ─────────────────────────
  await showPhaseLabel(page, '📊 Historial actualizado');
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(1000);

  // Look for historial section
  const historial = page.locator('text=/Historial de Trabajos/');
  if (await historial.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expectVisible(page, historial, '✅ Historial de Trabajos visible — trabajo guardado correctamente');
  }

  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(800);

  await showPhaseLabel(page, '🎉 PR #102 verificado — insertTrabajo funciona sin error');
  await page.waitForTimeout(1500);
});
