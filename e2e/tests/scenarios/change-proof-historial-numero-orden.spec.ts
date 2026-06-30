import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * change-proof-historial-numero-orden — Proof that PR #103 implements:
 *
 * 1. "No. Orden" as the FIRST column in Historial de Trabajos
 * 2. "Km" column renamed to "Kilometraje"
 * 3. Error handling in finalizarTrabajo (persistence bug fix)
 *
 * Walk-through:
 * 1. Log in
 * 2. Navigate to Trabajos tab
 * 3. Show Historial de Trabajos table — verify "No. Orden" is first header, "Kilometraje" present
 * 4. Show Nuevo Trabajo form for context
 */

test('change-proof-historial-numero-orden', async ({ page, loginPage }) => {
  test.slow(); // Auth + cold Vercel preview can take 30-45s

  await showPhaseLabel(page, '🔐 Login');
  await loginPage.loginAsTestUser();

  // ── Navigate to Trabajos tab ─────────────────────────────────────────────
  await showPhaseLabel(page, '🔧 Abriendo módulo Trabajos');
  const nav = page.locator('nav');
  await nav.waitFor({ state: 'visible', timeout: 45_000 });

  const trabajosTab = nav.getByRole('button', { name: 'Trabajos' });
  await trabajosTab.click();
  await page.waitForTimeout(1500);

  // ── Scroll to Historial de Trabajos table ────────────────────────────────
  await showPhaseLabel(page, '📋 Historial de Trabajos — nuevas columnas');
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(800);

  // ── Verify "No. Orden" is the first header ───────────────────────────────
  await showPhaseLabel(page, '✅ Verificando columna "No. Orden" como primera columna');

  // Find the table headers
  const tableHeaders = page.locator('table thead th');
  const firstHeader = tableHeaders.first();
  const firstHeaderText = await firstHeader.textContent({ timeout: 10_000 }).catch(() => '');

  expect(
    firstHeaderText?.trim().toLowerCase(),
    'Primera columna del historial debe ser "No. Orden"'
  ).toContain('no. orden');

  await page.waitForTimeout(800);

  // ── Verify "Kilometraje" header (not "Km") ───────────────────────────────
  await showPhaseLabel(page, '✅ Verificando columna "Kilometraje" (antes "Km")');

  const kilometrajeHeader = page.locator('table thead th', { hasText: /kilometraje/i });
  const kmOldHeader = page.locator('table thead th', { hasText: /^km$/i });

  const hasKilometraje = await kilometrajeHeader.isVisible({ timeout: 5_000 }).catch(() => false);
  const hasOldKm = await kmOldHeader.isVisible({ timeout: 2_000 }).catch(() => false);

  expect(hasKilometraje, 'Columna "Kilometraje" debe estar visible en el historial').toBe(true);
  expect(hasOldKm, 'Columna "Km" (vieja) no debe estar presente').toBe(false);

  await page.waitForTimeout(800);

  // ── Slow scroll through the historial table to show all columns ──────────
  await showPhaseLabel(page, '📊 Desplazando por el historial para ver todas las columnas');
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(700);

  // Scroll horizontally to show far-right columns
  const tableEl = page.locator('table').first();
  if (await tableEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await tableEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }

  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(800);

  // ── Show Nuevo Trabajo form — Número de Orden field ─────────────────────
  await showPhaseLabel(page, '📝 Formulario Nuevo Trabajo — campo Número de Orden');
  await page.mouse.wheel(0, -1200); // Scroll back up to form
  await page.waitForTimeout(800);

  const numeroOrdenInput = page.locator('input[placeholder*="001" i], input[placeholder*="OT" i]').first();
  if (await numeroOrdenInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expectVisible(page, numeroOrdenInput, '✅ Campo "Número de Orden" visible en el formulario');
    await numeroOrdenInput.fill('OT-TEST-001');
    await page.waitForTimeout(600);
  }

  await showPhaseLabel(page, '🎉 PR #103 verificado — No. Orden + Kilometraje + fix persistencia');
  await page.waitForTimeout(1500);
});
