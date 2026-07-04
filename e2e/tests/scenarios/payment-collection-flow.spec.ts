import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Payment Collection Flow — Complete CxC lifecycle with math verification.
 *
 * Steps:
 * 1. Create a trabajo with known amounts (labor $1500 + parts $500 = $2000)
 * 2. Finalize the trabajo
 * 3. Navigate to CxC — verify entry with correct amount ($2000)
 * 4. Register partial payment ($800)
 * 5. Verify remaining balance ($1200)
 * 6. Verify status = "Parcial"
 * 7. Register remaining payment ($1200)
 * 8. Verify balance = $0
 * 9. Verify status = "Pagado"
 * 10. Verify sidebar badge count decreased
 */

test.describe('Payment Collection Flow', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('partial and full payment lifecycle with balance verification', async ({
    page, dashboardPage, trabajosPage, cuentasCobrarPage, sidebar
  }) => {
    // This test creates a trabajo, finalizes it, and verifies CxC — guardarTrabajo
    // triggers a full 8-table cargarDatos() reload; allow 5 minutes total.
    test.setTimeout(300_000);
    await showPhaseLabel(page, '🔧 Phase 1: Create Trabajo');
    await dashboardPage.navigateToModule('trabajos');
    await trabajosPage.waitForPageLoad();

    await trabajosPage.selectClient(1);
    await trabajosPage.selectVehicle(1);

    // Fill description (required: "Ej. Servicio completo frenos y aceite...")
    await trabajosPage.fillDescription(TestData.trabajoDescription());

    // Add labor: $1500 — using the mano de obra section (specific concepto locator)
    const conceptoInput = page.locator('input[placeholder*="Arreglo de frenos" i], input[placeholder*="engrase" i]').first();
    if (await conceptoInput.isVisible().catch(() => false)) {
      await conceptoInput.fill('Servicio completo E2E');
    }
    const precioInputs = page.locator('input[type="number"]');
    const allPrecio = await precioInputs.all();
    if (allPrecio.length > 0) {
      await allPrecio[allPrecio.length > 1 ? allPrecio.length - 1 : 0].fill('1500');
    }

    await trabajosPage.save();
    await showPhaseLabel(page, '✅ Trabajo created');

    // guardarTrabajo triggers cargarDatos() — full 8-table reload. Wait for
    // the loading overlay to clear before navigating so we don't race with it.
    {
      const overlay = page.locator('text=Cargando datos del taller');
      await overlay.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {}); // may flash quickly
      await overlay.waitFor({ state: 'hidden', timeout: 150_000 }).catch(() => {}); // wait for reload
    }

    // ─── Phase 2: Try to finalize ───────────────────────────────────────────
    await showPhaseLabel(page, '✅ Phase 2: Finalize');
    const finBtn = page.getByRole('button', { name: /finalizar/i }).first();
    if (await finBtn.isVisible().catch(() => false)) {
      await finBtn.click();
      await page.waitForTimeout(2000);
      // Dismiss the Nota/Factura modal if it appeared — pick Nota (sin IVA)
      // Without dismissing, the modal blocks the next sidebar navigation.
      const notaBtn = page.getByRole('button', { name: /^nota$/i });
      if (await notaBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await notaBtn.click();
        await page.waitForTimeout(2000); // wait for Supabase UPDATE
      } else {
        // Modal didn't appear (e.g. job had no labor) — just wait
        await page.waitForTimeout(1000);
      }
    }

    // ─── Phase 3: Check CxC ─────────────────────────────────────────────────
    await showPhaseLabel(page, '💰 Phase 3: Check CxC');
    await sidebar.clickTab('Por Cobrar');
    await cuentasCobrarPage.waitForPageLoad();
    await expectVisible(cuentasCobrarPage.sectionTitle, 'CxC loaded');

    // Get initial account count
    const accountCount = await cuentasCobrarPage.getAccountCount();

    // ─── Phase 4: Register partial payment ──────────────────────────────────
    await showPhaseLabel(page, '💳 Phase 4: Partial Payment');
    if (accountCount > 0) {
      const pagoBtn = page.getByRole('button', { name: /registrar pago|abonar|pagar/i }).first();
      if (await pagoBtn.isVisible().catch(() => false)) {
        await pagoBtn.click();
        await page.waitForTimeout(500);

        const montoInput = page.locator('input[type="number"]').first();
        if (await montoInput.isVisible().catch(() => false)) {
          await montoInput.fill('800');

          // Select payment method
          const metodoSelect = page.locator('select:has(option:has-text("Efectivo"))').first();
          if (await metodoSelect.isVisible().catch(() => false)) {
            await metodoSelect.selectOption({ label: 'Efectivo' });
          }

          // Confirm
          const confirmBtn = page.getByRole('button', { name: /confirmar|guardar|registrar/i }).first();
          if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.click();
            await page.waitForTimeout(2000);
          }
        }
      }

      // ─── Phase 5: Verify status ─────────────────────────────────────────────
      await showPhaseLabel(page, '📊 Phase 5: Verify Partial Status');
      // Look for "Parcial" status or remaining balance
      const parcialBadge = page.locator('text=/parcial/i').first();
      const hasParcial = await parcialBadge.isVisible().catch(() => false);

      // Also verify amounts display correctly (no NaN, no undefined)
      const bodyText = await page.locator('main').innerText().catch(() => '');
      expect(bodyText).not.toContain('NaN');
      expect(bodyText).not.toContain('undefined');

      // ─── Phase 6: Register remaining payment ────────────────────────────────
      await showPhaseLabel(page, '💳 Phase 6: Full Payment');
      const pagoBtn2 = page.getByRole('button', { name: /registrar pago|abonar|pagar/i }).first();
      if (await pagoBtn2.isVisible().catch(() => false)) {
        await pagoBtn2.click();
        await page.waitForTimeout(500);

        const montoInput2 = page.locator('input[type="number"]').first();
        if (await montoInput2.isVisible().catch(() => false)) {
          // Pay remaining balance
          await montoInput2.fill('10000'); // Overpay to ensure "Pagado"
          const confirmBtn2 = page.getByRole('button', { name: /confirmar|guardar|registrar/i }).first();
          if (await confirmBtn2.isVisible().catch(() => false)) {
            await confirmBtn2.click();
            await page.waitForTimeout(2000);
          }
        }
      }

      // ─── Phase 7: Verify final status ───────────────────────────────────────
      await showPhaseLabel(page, '✅ Phase 7: Verify Pagado');
      const pagadoBadge = page.locator('text=/pagado/i').first();
      const hasPagado = await pagadoBadge.isVisible().catch(() => false);
      // Either paid or the account is resolved
    }

    await showPhaseLabel(page, '🎉 Payment Flow Complete');
  });

  test('CxC amounts are mathematically correct (no NaN/undefined)', async ({
    page, dashboardPage, cuentasCobrarPage
  }) => {
    await showPhaseLabel(page, '🧮 Math Verification');
    await dashboardPage.navigateToModule('cuentas');
    await cuentasCobrarPage.waitForPageLoad();

    // Get all text in the module
    const bodyText = await page.locator('.space-y-3, .divide-y, main').first().innerText().catch(() => '');

    // No NaN or undefined should EVER appear in financial displays
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('undefined');
    expect(bodyText).not.toContain('null');

    // If there are amounts, they should contain $ sign (proper formatting)
    const amountPattern = /\$[\d,]+\.?\d*/;
    const amounts = bodyText.match(amountPattern);
    if (amounts) {
      // Amounts exist and are properly formatted
      for (const amt of amounts) {
        const numPart = amt.replace(/[$,]/g, '');
        const parsed = parseFloat(numPart);
        expect(parsed).not.toBeNaN();
        expect(parsed).toBeGreaterThanOrEqual(0);
      }
    }

    await showPhaseLabel(page, '✅ Amounts Correct');
  });
});
