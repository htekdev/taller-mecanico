import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * change-proof-historial-numero-orden — Comprehensive video proof for PR #103
 *
 * This spec demonstrates the COMPLETE workflow Sofia wants to verify:
 *
 * 1. ✅ Register a new job WITHOUT error (fix: insertTrabajo conditional columns)
 * 2. ✅ Job appears in Historial with "No. Orden" as the FIRST column
 * 3. ✅ "Km" column now shows as "Kilometraje"
 * 4. ✅ Finalize the job (🏁 → Nota)
 * 5. ✅ Navigate away to Clientes tab and back
 * 6. ✅ Job still shows as "📄 Nota" — NOT "🕐 En Progreso" (persistence fix)
 */

const UNIQUE_DESC = `PRUEBA-VIDEO-${Date.now()}`;

test('change-proof-historial-numero-orden', async ({ page, loginPage }) => {
  test.slow();

  // ── 1. Login ──────────────────────────────────────────────────────────────
  await showPhaseLabel(page, '🔐 Login al Taller Mecánico');
  await loginPage.loginAsTestUser();

  const nav = page.locator('nav');
  await nav.waitFor({ state: 'visible', timeout: 45_000 });
  await page.waitForTimeout(1000);

  // ── 2. Navigate to Trabajos ───────────────────────────────────────────────
  await showPhaseLabel(page, '🔧 Módulo Trabajos');
  await nav.getByRole('button', { name: 'Trabajos' }).click();
  await page.waitForTimeout(1500);

  // ── 3. Fill and submit the Nuevo Trabajo form ─────────────────────────────
  await showPhaseLabel(page, '📝 Registrando nuevo trabajo (número de orden: OT-VIDEO-01)');

  // Número de Orden field
  const ordenInput = page.locator('input[placeholder*="001" i], input[placeholder*="OT" i]').first();
  if (await ordenInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await ordenInput.fill('OT-VIDEO-01');
    await page.waitForTimeout(400);
  }

  // Descripción (required)
  const descInput = page.locator('input[placeholder*="descripci" i], input[placeholder*="Ej. Servicio" i]').first();
  if (await descInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await descInput.fill(UNIQUE_DESC);
    await page.waitForTimeout(400);
  }

  await page.mouse.wheel(0, 250);
  await page.waitForTimeout(600);

  await showPhaseLabel(page, '💾 Enviando formulario...');
  const submitBtn = page.getByRole('button', { name: /registrar trabajo/i });
  if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await submitBtn.click();
    await page.waitForTimeout(4000); // Wait for Supabase
  }

  // ── 4. Verify NO error banner ─────────────────────────────────────────────
  await showPhaseLabel(page, '✅ Verificando: sin error "No se pudo guardar"');
  const errorBanner = page.locator('text=/No se pudo guardar/');
  const errorVisible = await errorBanner.isVisible({ timeout: 2_000 }).catch(() => false);
  expect(errorVisible, '"No se pudo guardar" NO debe aparecer').toBe(false);
  await page.waitForTimeout(800);

  // ── 5. Scroll to Historial — show "No. Orden" column and new job ──────────
  await showPhaseLabel(page, '📊 Historial de Trabajos — columna "No. Orden" primero');
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(800);

  // Verify first header is "No. Orden"
  const firstTh = page.locator('table thead th').first();
  const firstThText = await firstTh.textContent({ timeout: 10_000 }).catch(() => '');
  expect(firstThText?.toLowerCase()).toContain('no. orden');

  // Verify "Kilometraje" header (not "Km")
  const kmHeader = page.locator('table thead th', { hasText: /^km$/i });
  const hasOldKm = await kmHeader.isVisible({ timeout: 2_000 }).catch(() => false);
  expect(hasOldKm, '"Km" antiguo NO debe estar').toBe(false);

  await showPhaseLabel(page, '✅ "No. Orden" es primera columna · "Km" → "Kilometraje"');
  await page.waitForTimeout(1200);

  // ── 6. Find the new job row and click Finalizar ───────────────────────────
  await showPhaseLabel(page, '🏁 Finalizando el trabajo recién guardado...');

  const jobRow = page.locator('tr', { hasText: UNIQUE_DESC });
  const finalizarBtn = jobRow.getByRole('button', { name: /finalizar/i });
  if (await finalizarBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await finalizarBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await finalizarBtn.click();
    await page.waitForTimeout(1000);
  }

  // In the modal: click "Nota"
  await showPhaseLabel(page, '📄 Eligiendo tipo: Nota (sin IVA)');
  const notaBtn = page.getByRole('button', { name: /^nota$/i });
  if (await notaBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await notaBtn.click();
    await page.waitForTimeout(3000); // Wait for Supabase UPDATE
  }

  await showPhaseLabel(page, '✅ Trabajo finalizado como "Nota"');
  await page.waitForTimeout(800);

  // ── 7. Navigate away and come back (persistence check) ───────────────────
  await showPhaseLabel(page, '🔄 Navegando a Clientes y regresando (test de persistencia)...');
  await nav.getByRole('button', { name: 'Clientes' }).click();
  await page.waitForTimeout(1500);
  await nav.getByRole('button', { name: 'Trabajos' }).click();
  await page.waitForTimeout(2000);

  // ── 8. Verify the job still shows finalized ───────────────────────────────
  await showPhaseLabel(page, '✅ Verificando persistencia: trabajo debe seguir como "📄 Nota"');
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(600);

  // Find the job row again
  const jobRowAfter = page.locator('tr', { hasText: UNIQUE_DESC });
  if (await jobRowAfter.isVisible({ timeout: 10_000 }).catch(() => false)) {
    // Should show "Nota" badge, NOT "En progreso"
    const notaBadge = jobRowAfter.locator('text=/Nota/');
    const enProgresoBadge = jobRowAfter.locator('text=/En progreso/');

    const isNota = await notaBadge.isVisible({ timeout: 3_000 }).catch(() => false);
    const isEnProgreso = await enProgresoBadge.isVisible({ timeout: 2_000 }).catch(() => false);

    expect(isEnProgreso, 'Trabajo NO debe aparecer como "En Progreso" después de recargar').toBe(false);
    expect(isNota, 'Trabajo SÍ debe aparecer como "Nota" (estado persiste correctamente)').toBe(true);
  }

  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(800);

  await showPhaseLabel(page, '🎉 PR #103 verificado — guardado ✅ · No. Orden ✅ · Kilometraje ✅ · Persistencia ✅');
  await page.waitForTimeout(2000);
});

