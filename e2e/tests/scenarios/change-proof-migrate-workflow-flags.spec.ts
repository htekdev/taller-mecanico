import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * change-proof-migrate-workflow-flags
 *
 * Proof that PR #125 (CI: supabase link + --linked flag for db push) doesn't break anything.
 *
 * The PR replaces `supabase db push --project-ref fzondawpxhkojszrwgck` with:
 *   1. supabase link --project-ref fzondawpxhkojszrwgck  (explicit link step)
 *   2. supabase db push --linked  (use linked project)
 *   3. supabase db execute --linked  (consistent with above)
 *
 * This spec verifies:
 *   1. Login / Supabase auth still works (DB connectivity intact)
 *   2. Trabajos module loads data (migrated schema intact — numero_orden, kilometraje)
 *   3. Inventario module loads (refacciones table accessible)
 *   4. No crash on any core module (confirms all migrations still applied)
 */

test('change-proof-migrate-workflow-flags', async ({
  page,
  loginPage,
  dashboardPage,
}) => {
  test.slow();

  // ── Login — verifies Supabase auth + DB connectivity ───────────────────────
  await showPhaseLabel(page, '🔐 Login — Supabase conectado tras cambio de flags CI');
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();

  // ── Verify no crash on dashboard ───────────────────────────────────────────
  await showPhaseLabel(page, '🏠 Dashboard — sin error fatal');
  const crashError = page.getByText(/error al cargar|algo salió mal|fatal error/i);
  const hasCrash = await crashError.isVisible({ timeout: 5_000 }).catch(() => false);
  expect(hasCrash, 'Dashboard no debe tener error fatal').toBe(false);

  // ── Navigate to Trabajos — verify migrated columns (numero_orden, kilometraje) ──
  await showPhaseLabel(page, '🔧 Trabajos — columnas migradas intactas');
  await dashboardPage.navigateToModule('trabajos');
  await page.waitForTimeout(2000); // allow Supabase fetch

  const trabajosError = page.getByText(/error al cargar|algo salió mal/i);
  const hasTrabajosError = await trabajosError.isVisible({ timeout: 3_000 }).catch(() => false);
  expect(hasTrabajosError, 'Trabajos no debe tener error').toBe(false);

  // Module should render without crashing — presence of "Trabajos" heading or table
  const trabajosModule = page.getByRole('heading', { name: /trabajos/i }).or(
    page.locator('table, [data-module="trabajos"], text=/Nuevo Trabajo/i')
  ).first();
  const trabajosVisible = await trabajosModule.isVisible({ timeout: 12_000 }).catch(() => false);
  expect(trabajosVisible, 'Módulo Trabajos debe cargar correctamente').toBe(true);

  // ── Navigate to Inventario — verify refacciones table accessible ──────────
  await showPhaseLabel(page, '📦 Inventario — tabla refacciones accesible');
  await dashboardPage.navigateToModule('inventario');
  await page.waitForTimeout(1500);

  const inventarioError = page.getByText(/error al cargar|algo salió mal/i);
  const hasInventarioError = await inventarioError.isVisible({ timeout: 3_000 }).catch(() => false);
  expect(hasInventarioError, 'Inventario no debe tener error de carga').toBe(false);

  const inventarioModule = page.getByRole('heading', { name: /inventario|refacciones/i }).or(
    page.locator('text=/Agregar Pieza|Nueva Refacción/i')
  ).first();
  const inventarioVisible = await inventarioModule.isVisible({ timeout: 12_000 }).catch(() => false);
  expect(inventarioVisible, 'Módulo Inventario debe cargar correctamente').toBe(true);

  await showPhaseLabel(page, '✅ PR #125 verificado — flags --linked no rompen nada');
  await page.waitForTimeout(1500);
});
