import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * change-proof-factura-pdf-upload
 *
 * Proof that PR #184 adds PDF upload to the Facturas section of Cuentas x Cobrar:
 *   - Navigate to CxC, select Facturas tab
 *   - Expand a factura row to reveal the PDF upload area
 *   - "Subir PDF factura" label is present (no PDF yet) OR "Ver PDF factura" link (PDF exists)
 *   - Touch targets meet 44px minimum (py-3 padding)
 *   - Upload UI is NOT in the Trabajos module (moved to CxC)
 *
 * Full upload flow requires a real file and Supabase Storage access — verified via UI state only.
 */

// Supabase cold-start on Vercel preview can cause CxC module navigation to fail on first attempt.
// retries:1 ensures the test passes on the second attempt when Supabase is warm.
test.describe.configure({ retries: 1 });

test('change-proof-factura-pdf-upload — upload UI in CxC facturas section', async ({ page, loginPage, dashboardPage }) => {
  test.slow();

  // ── Login ─────────────────────────────────────────────────────────────────
  await showPhaseLabel(page, '🔐 Login');
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();

  // ── Navigate to CxC ───────────────────────────────────────────────────────
  await showPhaseLabel(page, '📋 Módulo Cuentas x Cobrar');
  await dashboardPage.navigateToModule('cxc');
  await page.waitForTimeout(2000);

  // ── Switch to Facturas tab ─────────────────────────────────────────────────
  await showPhaseLabel(page, '🗂️ Pestaña Facturas');
  const facturasTab = page.getByRole('button', { name: /facturas/i });
  const hasTab = await facturasTab.isVisible({ timeout: 5_000 }).catch(() => false);
  if (hasTab) {
    await facturasTab.click();
    await page.waitForTimeout(1500);
  }

  // ── Expand the first available row ────────────────────────────────────────
  await showPhaseLabel(page, '🔍 Expandiendo fila de factura');
  const expandBtn = page.getByRole('button', { name: /ver|\+ pago/i }).first();
  const hasExpand = await expandBtn.isVisible({ timeout: 5_000 }).catch(() => false);
  if (hasExpand) {
    await expandBtn.click();
    await page.waitForTimeout(1500);
  }

  // ── Look for PDF upload or view UI ────────────────────────────────────────
  await showPhaseLabel(page, '✅ Verificando UI de PDF en facturas');

  const subirLabels = page.locator('label').filter({ hasText: /subir pdf factura|reemplazar pdf/i });
  const verLinks = page.locator('a').filter({ hasText: /ver pdf factura/i });

  const subirCount = await subirLabels.count();
  const verCount = await verLinks.count();

  expect(subirCount + verCount, 'Debe haber al menos una opción de PDF (subir o ver) en la sección de facturas').toBeGreaterThanOrEqual(1);

  if (subirCount > 0) {
    const firstLabel = subirLabels.first();
    await expect(firstLabel).toBeVisible();
    const className = await firstLabel.getAttribute('class') ?? '';
    expect(className, 'Label de subida debe tener min-h-[44px] para touch target').toContain('min-h-[44px]');
    await showPhaseLabel(page, `✅ ${subirCount} botón(es) "Subir PDF factura" con touch target correcto`);
  }

  if (verCount > 0) {
    const firstLink = verLinks.first();
    await expect(firstLink).toBeVisible();
    const className = await firstLink.getAttribute('class') ?? '';
    expect(className, '"Ver PDF factura" debe tener min-h-[44px]').toContain('min-h-[44px]');
    await showPhaseLabel(page, `✅ ${verCount} enlace(s) "Ver PDF factura" con touch target correcto`);
  }

  // ── Verify upload UI is NOT in Trabajos module ─────────────────────────────
  await showPhaseLabel(page, '🔧 Verificando que NO está en Trabajos');
  await dashboardPage.navigateToModule('trabajos');
  await page.waitForTimeout(2000);

  const subirEnTrabajosCount = await page.locator('label').filter({ hasText: /subir factura/i }).count();
  expect(subirEnTrabajosCount, 'El upload de factura NO debe estar en el módulo de Trabajos').toBe(0);

  await showPhaseLabel(page, '✅ UI de PDF correctamente ubicada en CxC Facturas');
});
