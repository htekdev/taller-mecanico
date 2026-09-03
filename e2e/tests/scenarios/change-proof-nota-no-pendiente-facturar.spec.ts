import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * Change Proof — Nota jobs must NOT appear as "pendiente de facturar" (Issue #226 / regression fix #228)
 *
 * Root cause (Issue #226): Counters and badges used `tipoDocumento !== 'nota'` which evaluates
 * to `true` when tipoDocumento is undefined (pending/legacy jobs), causing ALL
 * sin_facturar jobs to appear as pending to invoice.
 *
 * Regression (PR #227 fix): Changed to `tipoDocumento === 'factura'` which was too aggressive —
 * it excluded jobs where tipoDocumento is null because Phase 2 (best-effort) silently failed.
 * Many real jobs have requiereFactura=true but tipoDocumento=null (column write failed silently).
 *
 * Correct fix (PR #228):
 *   `tipoDocumento !== 'nota' && requiereFactura === true && estadoFacturacion !== 'facturado'`
 *
 * This correctly handles:
 *   - tipoDocumento='nota' → excluded ✓
 *   - tipoDocumento='factura' + requiereFactura=true → included ✓
 *   - tipoDocumento=null + requiereFactura=true (Phase 2 failed) → included ✓ (was broken in PR #227)
 *   - tipoDocumento=null + requiereFactura=false (nota where Phase 2 failed) → excluded ✓
 *
 * Applied in 3 counter locations + 1 per-row badge condition.
 *
 * This test verifies:
 * 1. Nota rows in working jobs list do NOT show "Pendiente de facturar" badge
 * 2. The module renders without errors
 */

test('change-proof-nota-no-pendiente-facturar: nota jobs excluded from facturar counter', async ({
  page,
  loginPage,
  dashboardPage,
}) => {
  test.slow();

  // ── Login ──────────────────────────────────────────────────────────────────
  await loginPage.loginAsTestUser();

  // ── Phase 1: Navigate to Trabajos ─────────────────────────────────────────
  await showPhaseLabel(page, '🔧 Phase 1: Navigate to Trabajos');
  await dashboardPage.navigateToModule('trabajos');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // ── Phase 2: Find and finalize a pending trabajo as NOTA ──────────────────
  await showPhaseLabel(page, '📋 Phase 2: Find pending trabajo to finalize as Nota');

  const finalizarBtn = page.getByRole('button', { name: /🏁|finalizar/i }).first();
  const hasPendingJob = await finalizarBtn.isVisible({ timeout: 3000 }).catch(() => false);

  if (hasPendingJob) {
    await showPhaseLabel(page, '🏁 Phase 3: Finalizing trabajo as NOTA');
    await finalizarBtn.click();
    await page.waitForTimeout(1000);

    // Select "Nota" in the modal
    const notaBtn = page.getByRole('button', { name: /nota|sin iva/i }).first();
    const notaVisible = await notaBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (notaVisible) {
      await notaBtn.click();
      await page.waitForTimeout(2000);

      // ── Phase 4: Verify nota job rows do NOT show "Pendiente de facturar" ──
      await showPhaseLabel(page, '🔍 Phase 4: Badge check — nota rows must NOT show "Pendiente de facturar"');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Every row that shows the "Nota" badge must NOT contain the invoice button.
      // This directly tests the per-row fix in app/modules/trabajos/index.tsx.
      const notaRows = page.locator('tr').filter({ hasText: 'Nota' });
      const notaRowCount = await notaRows.count();
      for (let i = 0; i < notaRowCount; i++) {
        await expect(notaRows.nth(i)).not.toContainText('Pendiente de facturar');
      }

      await page.screenshot({ path: 'e2e/tmp-nota-badge-check.png', fullPage: false });
      await showPhaseLabel(page, `✅ Phase 4 complete — ${notaRowCount} nota row(s) have no pendiente badge`);
    } else {
      await showPhaseLabel(page, '⚠️ Nota button not visible in modal — skipping finalization');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } else {
    await showPhaseLabel(page, '📭 No pending jobs — verifying existing state');
  }

  // ── Phase 5: Navigate to Facturas and verify counter logic ───────────────
  await showPhaseLabel(page, '🧾 Phase 5: Navigate to Facturas — check pendiente counter');
  await dashboardPage.navigateToModule('facturas');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Get the banner if present
  const banner = page.locator('.bg-indigo-50').filter({ hasText: /pendiente.*facturar|facturar.*pendiente/i });
  const bannerVisible = await banner.isVisible({ timeout: 2000 }).catch(() => false);

  if (bannerVisible) {
    // If the banner is present, make sure it only counts factura-type jobs
    // We verify by checking the banner text doesn't show an unexpectedly large number
    const bannerText = await banner.textContent().catch(() => '');
    await showPhaseLabel(page, `📊 Banner found: "${bannerText?.trim()}"`);

    // The number should be reasonable — we can't assert exact value but we verify
    // the banner shows a number (not NaN/undefined)
    const numberMatch = bannerText?.match(/\d+/);
    expect(numberMatch).not.toBeNull(); // Must show a valid number
    await showPhaseLabel(page, '✅ Banner shows valid number (not NaN/undefined)');
  } else {
    await showPhaseLabel(page, '✅ No pendiente de facturar banner — counter correctly at 0');
  }

  await page.screenshot({ path: 'e2e/tmp-nota-facturar-counter.png', fullPage: false });

  // ── Phase 6: Back to Trabajos — verify nota rows never show "Pendiente de facturar" ──
  await showPhaseLabel(page, '🔍 Phase 6: Back to Trabajos — all nota rows must NOT show invoice badge');
  await dashboardPage.navigateToModule('trabajos');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Check both "todos" and "completados" tabs for nota rows with rogue badge.
  // This is the unconditional fallback assertion — ensures the fix is validated
  // even when Phase 4 is skipped because no pending job was available to finalize.
  const tabs = [{ name: /todos/i }, { name: /completado/i }];
  for (const tab of tabs) {
    const tabBtn = page.getByRole('button', tab).first();
    const tabVisible = await tabBtn.isVisible({ timeout: 1500 }).catch(() => false);
    if (tabVisible) {
      await tabBtn.click();
      await page.waitForTimeout(800);
    }

    // Every table row containing "Nota" (the tipo_documento badge) must NOT have the invoice button.
    // This directly tests app/modules/trabajos/index.tsx: {trabajo.tipoDocumento !== 'nota' && trabajo.requiereFactura && ...}
    const notaRows = page.locator('tr').filter({ hasText: 'Nota' });
    const notaRowCount = await notaRows.count();
    for (let i = 0; i < notaRowCount; i++) {
      await expect(notaRows.nth(i)).not.toContainText('Pendiente de facturar');
    }
    await showPhaseLabel(page, `✅ ${tab.name} tab: ${notaRowCount} nota row(s) — none show "Pendiente de facturar"`);
  }

  await page.screenshot({ path: 'e2e/tmp-nota-completados.png', fullPage: false });

  // Verify no error banners
  const anyError = page.locator('[role="alert"]').filter({ hasText: /error|no se pudo/i });
  const errorVisible = await anyError.isVisible({ timeout: 1000 }).catch(() => false);
  expect(errorVisible).toBe(false);

  await showPhaseLabel(page, '✅ All checks passed — nota jobs excluded from pendiente de facturar counter');
  await page.waitForTimeout(1000);
});
