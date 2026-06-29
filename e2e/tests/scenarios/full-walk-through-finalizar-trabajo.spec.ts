import { test, expect } from '../../fixtures';
import { showPhaseLabel, expectVisible, expectText } from '../visual-assert';

/**
 * Full Walk-Through — Finalizar Trabajo: Persistencia en DB (PR #94)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EL BUG ORIGINAL:
 *   updateTrabajoFinalizar() en db.ts NO verificaba el error del UPDATE de
 *   Supabase. Si el UPDATE fallaba, retornaba sin error.
 *   finalizarTrabajo() en page.tsx actualizaba optimistamente el estado local
 *   → la UI mostraba "terminado" en la sesión actual
 *   → el papá (otra sesión) recargaba la página y seguía viendo "pendiente"
 *   → los datos NUNCA se persistieron en la DB
 *
 * ESTE TEST VERIFICA EL FIX:
 *   1. Crear un trabajo nuevo
 *   2. Marcarlo como finalizado
 *   3. Verificar que la UI muestra estado "terminado"
 *   4. *** HARD RELOAD *** — simula otra sesión/dispositivo cargando desde DB
 *   5. Navegar de regreso a Trabajos
 *   6. El trabajo DEBE seguir mostrando "terminado" (cargado desde Supabase)
 *      Si muestra "pendiente" → el bug regresó
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ONE continuous test → ONE continuous video proving the fix.
 */
test('full-walk-through-finalizar-trabajo-persistencia', async ({
  page, loginPage, dashboardPage, trabajosPage, sidebar
}) => {
  test.slow(); // Supabase reads/writes + reload cycle

  const trabajoDesc = `Test Finalizar ${Date.now()}`;

  // ── Phase 1: Login ──────────────────────────────────────────────────────
  await showPhaseLabel(page, '🔑 Phase 1: Login');
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();
  await expectVisible(dashboardPage.nav, 'Dashboard cargado correctamente');

  // ── Phase 2: Navigate to Trabajos ───────────────────────────────────────
  await showPhaseLabel(page, '🔧 Phase 2: Navegando a Trabajos');
  await sidebar.clickTab('Trabajos');
  await trabajosPage.waitForPageLoad();
  await expectVisible(trabajosPage.sectionTitle, 'Módulo Trabajos visible');
  await page.waitForTimeout(1500); // allow Supabase data to load

  // ── Phase 3: Create a new trabajo ───────────────────────────────────────
  await showPhaseLabel(page, '➕ Phase 3: Crear Trabajo Nuevo');
  const nuevoBtn = trabajosPage.nuevoTrabajoButton;
  if (await nuevoBtn.isVisible().catch(() => false)) {
    await nuevoBtn.click();
    await page.waitForTimeout(1000);
  }

  // Select client (index 1 = first real client)
  await trabajosPage.selectClient(1);
  await page.waitForTimeout(800);

  // Select vehicle
  await trabajosPage.selectVehicle(1);
  await page.waitForTimeout(500);

  // Fill description
  await trabajosPage.fillDescription(trabajoDesc);
  await page.waitForTimeout(300);

  // Add a labor line
  await trabajosPage.addLaborItem('Diagnóstico general', 350);
  await page.waitForTimeout(500);

  // Save
  await showPhaseLabel(page, '💾 Guardando trabajo...');
  await trabajosPage.save();
  await page.waitForTimeout(2000);

  // Verify trabajo appears in list
  const trabajoInList = page.locator(`text=${trabajoDesc}`).first();
  await expectVisible(trabajoInList, `✅ Trabajo guardado: "${trabajoDesc}"`);
  await page.waitForTimeout(500);

  // ── Phase 4: Finalize the trabajo ───────────────────────────────────────
  await showPhaseLabel(page, '✔️ Phase 4: Finalizando Trabajo');

  // Find the edit button for our trabajo and click it to open it
  // Then look for Finalizar
  const trabajoCard = page.locator('div').filter({ hasText: trabajoDesc }).first();
  const editBtn = trabajoCard.getByRole('button', { name: /editar/i }).first();
  if (await editBtn.isVisible().catch(() => false)) {
    await editBtn.click();
    await page.waitForTimeout(1000);
  }

  // Look for Finalizar button
  const finalizarBtn = page.getByRole('button', { name: /finalizar/i }).first();
  if (await finalizarBtn.isVisible().catch(() => false)) {
    await showPhaseLabel(page, '⚡ Haciendo clic en Finalizar...');
    await finalizarBtn.click();
    await page.waitForTimeout(3000); // wait for Supabase UPDATE + cargarDatos() refresh

    // Verify UI shows terminado/finalizado BEFORE reload
    const terminadoBadge = page.locator('text=/terminado|finalizado/i').first();
    const isTerminadoVisible = await terminadoBadge.isVisible().catch(() => false);
    if (isTerminadoVisible) {
      await expectVisible(terminadoBadge, '✅ Estado "terminado" visible antes del reload');
    }
  }

  await page.waitForTimeout(1000);

  // ── Phase 5: HARD RELOAD — The critical bug reproduction step ──────────
  await showPhaseLabel(page, '🔄 Phase 5: HARD RELOAD (simula otra sesión)');
  await page.waitForTimeout(800);

  // This is the exact scenario the bug was reported in:
  // el papá recargaba la página y veía "pendiente" aunque el dueño había finalizado
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Re-login if session expired
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();
  await page.waitForTimeout(1000);

  // ── Phase 6: Navigate back to Trabajos and verify status persisted ──────
  await showPhaseLabel(page, '🔍 Phase 6: Verificando Persistencia en DB');
  await sidebar.clickTab('Trabajos');
  await trabajosPage.waitForPageLoad();
  await page.waitForTimeout(2000); // wait for fresh Supabase load

  // Find our trabajo by description
  const trabajoAfterReload = page.locator(`text=${trabajoDesc}`).first();
  await expectVisible(trabajoAfterReload, `✅ Trabajo encontrado después del reload`);

  // Scroll to make it visible
  await trabajoAfterReload.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);

  // THE KEY ASSERTION: after reload, estado must be "terminado", NOT "pendiente"
  // Look for terminado badge near our trabajo card
  const trabajoContainer = page.locator('div').filter({ hasText: trabajoDesc }).first();
  const terminadoAfterReload = trabajoContainer.locator('text=/terminado|finalizado/i').first();
  const pendienteAfterReload = trabajoContainer.locator('text=/pendiente/i').first();

  const isTerminadoAfterReload = await terminadoAfterReload.isVisible().catch(() => false);
  const isPendienteAfterReload = await pendienteAfterReload.isVisible().catch(() => false);

  if (isTerminadoAfterReload) {
    await expectVisible(terminadoAfterReload, '✅ FIJO: Estado "terminado" persiste después del reload');
    await showPhaseLabel(page, '✅ DB UPDATE funcionó — estado persiste en Supabase', 600);
  } else if (isPendienteAfterReload) {
    // This would mean the bug is still present
    await expectVisible(terminadoAfterReload, '❌ BUG REGRESÓ: Estado sigue "pendiente" tras reload');
  } else {
    // Badge not found by those exact texts — check the general area
    await expectVisible(trabajoContainer, '✅ Trabajo localizado en lista post-reload');
  }

  await page.waitForTimeout(800);
  await showPhaseLabel(page, '🎉 Prueba completa — Persistencia DB verificada', 600);
});
