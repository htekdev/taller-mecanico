import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * change-proof-cotizaciones-departamentos-sync
 *
 * Bug (PR #109): departamentos in Cotizaciones were initialized with a lazy
 * `useState(() => loadDepartamentos())` that reads localStorage. Under SSR,
 * `window` is undefined → initial state = DEFAULT_DEPTOS on server, but
 * localStorage values on client → hydration mismatch causing React to discard
 * the client state and leave an empty dropdown.
 *
 * Fix: use `useState<string[]>(DEFAULT_DEPTOS)` (static initializer, SSR-safe),
 * then re-read localStorage in a `useEffect` on mount.
 *
 * Walk-through:
 * 1. Login
 * 2. Navigate to Cotizaciones tab
 * 3. Click "Ayuntamiento de Mérida" template (only this template shows departamento select)
 * 4. Wait for the form to render
 * 5. Verify the departamento <select> has at least 1 real option (not just the placeholder)
 * 6. Verify "Obras públicas" is a selectable option (DEFAULT_DEPTOS[0])
 */

test('change-proof-cotizaciones-departamentos-sync', async ({
  page,
  loginPage,
  dashboardPage,
}) => {
  test.slow(); // Auth on cold preview can be slow

  // ── Login ──────────────────────────────────────────────────────────────────
  await showPhaseLabel(page, '🔐 Login');
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();

  // ── Navigate to Cotizaciones ───────────────────────────────────────────────
  await showPhaseLabel(page, '📋 Abriendo módulo Cotizaciones');
  await dashboardPage.navigateToModule('cotizaciones');
  await page.waitForTimeout(1500); // wait for Supabase load

  // ── Select Ayuntamiento de Mérida template ─────────────────────────────────
  await showPhaseLabel(page, '🏛️ Seleccionando plantilla Ayuntamiento');

  const ayuntamientoBtn = page.locator('button:has-text("Ayuntamiento de Mérida")').first();
  await ayuntamientoBtn.waitFor({ state: 'visible', timeout: 15_000 });
  await ayuntamientoBtn.click();
  await page.waitForTimeout(800); // transition to form

  // ── Verify departamento select is visible with options ─────────────────────
  await showPhaseLabel(page, '✅ Verificando dropdown de departamentos');

  // The departamento select is only rendered when plantilla === 'ayuntamiento'
  const deptoSelect = page.locator('select').filter({
    has: page.locator('option:has-text("Seleccionar departamento")'),
  }).first();

  const selectVisible = await deptoSelect.isVisible({ timeout: 10_000 }).catch(() => false);
  expect(selectVisible, 'Dropdown de departamento debe estar visible en plantilla Ayuntamiento').toBe(true);

  // Count real options (excluding the placeholder "— Seleccionar departamento —")
  const optionCount = await deptoSelect.locator('option:not([disabled])').count();
  expect(optionCount, 'Debe haber al menos 1 departamento disponible').toBeGreaterThan(0);

  // Verify DEFAULT_DEPTOS[0] is present — "Obras públicas mantenimiento vial"
  await showPhaseLabel(page, '🔍 Verificando opción "Obras públicas mantenimiento vial"');
  const obrasOption = deptoSelect.locator('option:has-text("Obras públicas")');
  const obrasCount = await obrasOption.count();
  expect(obrasCount, '"Obras públicas mantenimiento vial" debe estar en el dropdown').toBeGreaterThan(0);

  await showPhaseLabel(page, '🎉 PR #109 verificado — departamentos se cargan correctamente en Cotizaciones');
  await page.waitForTimeout(1500);
});
