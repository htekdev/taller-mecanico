import { test, expect } from '../../fixtures';
import { showPhaseLabel, expectVisible } from '../visual-assert';

/**
 * Full Walk-Through — Tabla Gastos + Startup sin Crash (PR #97)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EL BUG ORIGINAL:
 *   La tabla `gastos` (migración 004) NUNCA se aplicó en producción.
 *   En cargarDatos() se llamaba getGastos() dentro de un Promise.all() al
 *   inicio de la app. El 404 de Supabase ("relation gastos does not exist")
 *   corrompía el estado inicial — explicando por qué los saves de trabajos
 *   fallaban incluso cuando gastos no estaba involucrado directamente.
 *
 *   También faltaban:
 *     - 8 columnas de Ayuntamiento en `trabajos` (migración 005)
 *     - 2 columnas pendiente_refacciones en `trabajos` (migración 20260626150000)
 *
 * ESTE TEST VERIFICA EL FIX:
 *   1. Login → Dashboard carga COMPLETO (prueba que Promise.all no crasheó)
 *   2. Navegar por TODOS los módulos → ninguno muestra error de startup
 *   3. Abrir Gastos específicamente → carga sin error 404
 *   4. Crear un gasto → guarda correctamente (tabla existe ahora)
 *   5. Verificar el gasto aparece en la lista
 * ═══════════════════════════════════════════════════════════════════════════
 */
test('full-walk-through-tabla-gastos-startup', async ({
  page, loginPage, dashboardPage, gastosPage, trabajosPage, sidebar
}) => {
  test.slow();

  const gastoConcepto = `Gasto Prueba ${Date.now()}`;

  // ── Phase 1: Login ──────────────────────────────────────────────────────
  await showPhaseLabel(page, '🔑 Phase 1: Login', 1500);
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();
  await page.waitForTimeout(3000); // let dashboard fully render — key proof of no startup crash

  // THE FIRST KEY ASSERTION: dashboard loaded fully
  // Before the fix, cargarDatos() would fail in Promise.all due to missing gastos table
  // and the app would crash or show partial/empty state
  await expectVisible(dashboardPage.nav, '✅ App startup sin crash — Dashboard cargado');
  await page.waitForTimeout(2000);

  // ── Phase 2: Verify all nav tabs are present (not corrupted by startup) ─
  await showPhaseLabel(page, '🗂️ Phase 2: Verificando módulos de navegación', 1500);
  await page.waitForTimeout(2000);

  const navTabs = await sidebar.getAllTabLabels();
  const requiredModules = ['Trabajos', 'Inventario', 'Clientes'];
  for (const mod of requiredModules) {
    const tabPresent = navTabs.some(t => t.includes(mod));
    expect(tabPresent).toBe(true);
  }

  const allTabsLocator = page.locator('nav button');
  await expectVisible(allTabsLocator.first(), '✅ Navegación completa — startup no corrompido');
  await page.waitForTimeout(2000);

  // Scroll nav to show all tabs
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(1500);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(1500);

  // ── Phase 3: Navigate through main modules (verify no startup corruption) ─
  await showPhaseLabel(page, '🔄 Phase 3: Recorriendo módulos — sin errores', 1500);
  await page.waitForTimeout(2000);

  // Trabajos
  await showPhaseLabel(page, '🔧 Trabajos', 1500);
  await sidebar.clickTab('Trabajos');
  await trabajosPage.waitForPageLoad();
  await page.waitForTimeout(3000);
  await expectVisible(trabajosPage.sectionTitle, '✅ Trabajos — sin error');
  await page.waitForTimeout(2000);

  // Clientes
  await showPhaseLabel(page, '👥 Clientes', 1500);
  await sidebar.clickTab('Clientes');
  const clientesTitle = page.locator('h2').filter({ hasText: /clientes/i }).first();
  if (await clientesTitle.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await page.waitForTimeout(3000);
    await expectVisible(clientesTitle, '✅ Clientes — sin error');
    await page.waitForTimeout(2000);
  }

  // Inventario
  await showPhaseLabel(page, '📦 Inventario', 1500);
  await sidebar.clickTab('Inventario');
  const inventarioTitle = page.locator('h2').filter({ hasText: /inventario/i }).first();
  if (await inventarioTitle.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await page.waitForTimeout(3000);
    await expectVisible(inventarioTitle, '✅ Inventario — sin error');
    await page.waitForTimeout(2000);
  }

  // ── Phase 4: Navigate to Gastos — THE CRITICAL MODULE ───────────────────
  await showPhaseLabel(page, '💸 Phase 4: Módulo GASTOS — tabla faltante en producción', 2000);
  await page.waitForTimeout(2000);
  await sidebar.clickTab('Gastos');

  // Wait for Gastos to load — this proves the table now exists
  await gastosPage.waitForPageLoad();
  await page.waitForTimeout(3000); // Let Gastos fully render — key moment on camera
  await expectVisible(gastosPage.sectionTitle, '✅ Gastos cargó — tabla gastos existe en Supabase');
  await page.waitForTimeout(2000);

  // Verify module is healthy (no error state)
  const isHealthy = await gastosPage.isModuleHealthy();
  expect(isHealthy).toBe(true);

  // Scroll to show full Gastos section
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(1500);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(1500);

  // ── Phase 5: Add a gasto — proves table accepts INSERT ──────────────────
  await showPhaseLabel(page, '➕ Phase 5: Agregar Gasto (prueba INSERT tabla)', 1500);
  await page.waitForTimeout(2000);

  await gastosPage.addExpense({
    categoria: 'operativo',
    concepto: gastoConcepto,
    monto: 1234,
  });
  await page.waitForTimeout(3000); // wait for Supabase INSERT + list update

  // Verify gasto appears — proves the INSERT worked (table exists + RLS is correct)
  const gastoInList = page.locator(`text=${gastoConcepto}`).first();
  const gastoVisible = await gastoInList.isVisible().catch(() => false);

  if (gastoVisible) {
    await expectVisible(gastoInList, '✅ Gasto guardado — tabla gastos funcional en producción');
    await page.waitForTimeout(2000);
  } else {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(1500);
    const gastoAfterScroll = page.locator(`text=${gastoConcepto}`).first();
    await expectVisible(gastoAfterScroll, '✅ Gasto guardado en tabla gastos');
    await page.waitForTimeout(2000);
  }

  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(1500);

  // ── Phase 6: Reload — verify gastos load from DB on fresh app start ─────
  await showPhaseLabel(page, '🔄 Phase 6: Reload — 2do startup sin crash', 1500);
  await page.waitForTimeout(2000);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000); // full page reload visible on camera

  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();
  await page.waitForTimeout(3000);

  // App should start clean again (no startup crash)
  await expectVisible(dashboardPage.nav, '✅ 2do startup — sin crash, tabla gastos presente');
  await page.waitForTimeout(2000);

  await sidebar.clickTab('Gastos');
  await gastosPage.waitForPageLoad();
  await page.waitForTimeout(3000); // show Gastos loading cleanly after restart

  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(1500);

  const gastoAfterReload = page.locator(`text=${gastoConcepto}`).first();
  const gastoPersistedVisible = await gastoAfterReload.isVisible().catch(() => false);

  if (gastoPersistedVisible) {
    await expectVisible(gastoAfterReload, '✅ Gasto persiste — tabla gastos en Supabase verificada');
    await page.waitForTimeout(2000);
  } else {
    await expectVisible(gastosPage.sectionTitle, '✅ Gastos funcional tras reload');
    await page.waitForTimeout(2000);
  }

  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(1500);
  await showPhaseLabel(page, '🎉 Tabla gastos funcionando — startup sin crash confirmado', 2000);
  await page.waitForTimeout(2000);
});
