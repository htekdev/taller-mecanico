import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * change-proof-migration-idempotency
 *
 * Proof that PR #114 (migration idempotency fixes) doesn't break anything.
 *
 * The PR makes two migrations idempotent:
 *   1. 001_fix_invite_rls.sql — DROP POLICY IF EXISTS before CREATE POLICY
 *   2. 20260626020000_create_cotizaciones_table.sql — idempotent index creation
 *
 * This spec verifies:
 *   1. Login still works (auth/RLS not broken by invite policy fix)
 *   2. Cotizaciones module loads without error (cotizaciones table intact)
 *   3. Main app modules load without crash (no schema regression)
 */

test('change-proof-migration-idempotency', async ({
  page,
  loginPage,
  dashboardPage,
}) => {
  test.slow();

  // ── Login — verifies auth + RLS invite policy still works ──────────────────
  await showPhaseLabel(page, '🔐 Login (verifica política RLS no rota)');
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();

  // ── Verify no crash on dashboard load ─────────────────────────────────────
  await showPhaseLabel(page, '🏠 Dashboard cargado sin error');
  const crashError = page.getByText(/error al cargar|algo salió mal|fatal error/i);
  const hasCrash = await crashError.isVisible({ timeout: 5_000 }).catch(() => false);
  expect(hasCrash, 'Dashboard no debe tener error fatal').toBe(false);

  // ── Navigate to Cotizaciones (proves cotizaciones table is intact) ──────────
  await showPhaseLabel(page, '📋 Cotizaciones — tabla intacta tras migración idempotente');
  await dashboardPage.navigateToModule('cotizaciones');
  await page.waitForTimeout(2000); // allow Supabase fetch

  const cotiError = page.getByText(/error al cargar|algo salió mal/i);
  const hasCotiError = await cotiError.isVisible({ timeout: 3_000 }).catch(() => false);
  expect(hasCotiError, 'Cotizaciones no debe tener error de carga').toBe(false);

  // Cotizaciones module should show template selection or history
  const cotiModule = page.locator('text=/Cotizaciones|Ayuntamiento|General/i').first();
  const cotiVisible = await cotiModule.isVisible({ timeout: 10_000 }).catch(() => false);
  expect(cotiVisible, 'Módulo Cotizaciones debe cargar correctamente').toBe(true);

  // ── Navigate to Trabajos (proves working modules unaffected) ───────────────
  await showPhaseLabel(page, '🔧 Trabajos — módulo funcional tras migración');
  await dashboardPage.navigateToModule('trabajos');
  await page.waitForTimeout(1500);

  const trabajosError = page.getByText(/error al cargar|algo salió mal/i);
  const hasTrabajosError = await trabajosError.isVisible({ timeout: 3_000 }).catch(() => false);
  expect(hasTrabajosError, 'Trabajos no debe tener error tras la migración').toBe(false);

  await showPhaseLabel(page, '🎉 PR #114 verificado — migraciones idempotentes no rompen nada');
  await page.waitForTimeout(1500);
});
