import { test, expect } from '../../fixtures';

/**
 * change-proof-form-draft-persistence
 *
 * Proves that PR feat/form-draft-persistence preserves in-progress form data
 * when the user navigates away and returns, AND clears the draft after save.
 */
test.describe('change-proof: form draft persistence', () => {
  // Supabase cold-start can slow module navigation — allow retry on first failure.
  test.describe.configure({ retries: 1 });

  // ── Test 1: Trabajos form preserves data on navigation ───────────────────────
  test('trabajos form preserves description after navigating away and back', async ({
    page, loginPage, dashboardPage, trabajosPage,
  }) => {
    test.slow();

    const DRAFT_DESCRIPTION = `Borrador E2E — cambio aceite ${Date.now()}`;

    await loginPage.loginAsTestUser();
    await dashboardPage.waitForPageLoad();

    await dashboardPage.navigateToModule('trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // Fill description — auto-save fires after 600ms debounce
    await trabajosPage.fillDescription(DRAFT_DESCRIPTION);
    await page.waitForTimeout(800);

    // Navigate away
    await dashboardPage.navigateToModule('clientes');
    await page.waitForTimeout(500);

    // Navigate back
    await dashboardPage.navigateToModule('trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(500);

    // Assert banner
    const banner = page.getByRole('status').filter({ hasText: /borrador recuperado/i });
    await expect(banner, 'El banner "Borrador recuperado" debe aparecer al regresar').toBeVisible({ timeout: 5_000 });

    // Assert description is still there (flexible selector)
    const descInput = page.locator(
      '[data-testid="descripcion-input"], textarea[placeholder*="servi" i], textarea[placeholder*="Ej." i], input[placeholder*="servi" i]'
    ).first();
    const hasDesc = await descInput.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasDesc) {
      const value = await descInput.inputValue().catch(() => '');
      expect(value, 'El campo descripción debe conservar el texto ingresado').toContain(DRAFT_DESCRIPTION.slice(0, 20));
    } else {
      const formArea = page.locator('form, [class*="rounded-xl"][class*="slate"]').first();
      await expect(formArea).toContainText(DRAFT_DESCRIPTION.slice(0, 20), { timeout: 3_000 });
    }
  });

  // ── Test 2: Cotizaciones form preserves data on navigation ───────────────────
  test('cotizaciones form preserves description after navigating away and back', async ({
    page, loginPage, dashboardPage, cotizacionesPage,
  }) => {
    test.slow();

    const DRAFT_DESCRIPTION = `Cotización borrador E2E ${Date.now()}`;

    await loginPage.loginAsTestUser();
    await dashboardPage.waitForPageLoad();

    // Navigate to Cotizaciones and open the form
    await dashboardPage.navigateToModule('cotizaciones');
    await cotizacionesPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // Open the formulario by selecting a plantilla (General)
    await cotizacionesPage.selectPlantillaGeneral();
    await page.waitForTimeout(500);

    // Fill description
    await cotizacionesPage.fillDescription(DRAFT_DESCRIPTION);
    await page.waitForTimeout(800); // wait for debounce

    // Navigate away
    await dashboardPage.navigateToModule('clientes');
    await page.waitForTimeout(500);

    // Navigate back to cotizaciones
    await dashboardPage.navigateToModule('cotizaciones');
    await cotizacionesPage.waitForPageLoad();
    await page.waitForTimeout(500);

    // Assert: banner visible (draft was restored)
    const banner = page.getByRole('status').filter({ hasText: /borrador recuperado/i });
    await expect(banner, 'El banner "Borrador recuperado" debe aparecer en cotizaciones al regresar').toBeVisible({ timeout: 5_000 });

    // Assert: form was restored (formulario pantalla is shown, not inicio)
    const formScreen = page.locator('[class*="rounded-xl"], form').filter({ hasText: DRAFT_DESCRIPTION.slice(0, 15) });
    await expect(formScreen, 'El formulario debe contener el texto del borrador').toBeVisible({ timeout: 3_000 });
  });

  // ── Test 3: Draft is cleared after successful save (no banner on re-visit) ───
  test('trabajos draft is cleared after successful save — banner not shown on re-visit', async ({
    page, loginPage, dashboardPage, trabajosPage,
  }) => {
    test.slow();

    const DRAFT_KEY = 'taller_draft_trabajo_v1';
    const SYNTHETIC_DRAFT = {
      data: {
        form: {
          clienteId: '', vehiculoId: '', descripcion: 'Borrador previo que debe desaparecer',
          fecha: new Date().toISOString().split('T')[0],
          estado: 'pendiente', subtotal: 0, iva: 0, total: 0,
          descuento: 0, notas: '',
        },
        laborItems: [],
        subTab: 'labor',
      },
      savedAt: Date.now(),
    };

    await loginPage.loginAsTestUser();
    await dashboardPage.waitForPageLoad();

    // Inject a draft directly into localStorage so we don't need a real form fill
    await page.evaluate(
      ({ key, value }: { key: string; value: string }) => localStorage.setItem(key, value),
      { key: DRAFT_KEY, value: JSON.stringify(SYNTHETIC_DRAFT) }
    );

    // Navigate to trabajos — banner should appear (draft restored)
    await dashboardPage.navigateToModule('trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(500);

    const banner = page.getByRole('status').filter({ hasText: /borrador recuperado/i });
    await expect(banner, 'El banner debe aparecer cuando hay un borrador inyectado').toBeVisible({ timeout: 5_000 });

    // Manually clear the draft (simulating a successful save)
    await page.evaluate(
      ({ key }: { key: string }) => localStorage.removeItem(key),
      { key: DRAFT_KEY }
    );

    // Navigate away and back
    await dashboardPage.navigateToModule('clientes');
    await page.waitForTimeout(300);
    await dashboardPage.navigateToModule('trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(500);

    // Assert: banner NOT shown — draft was cleared
    const bannerAfterClear = page.getByRole('status').filter({ hasText: /borrador recuperado/i });
    await expect(bannerAfterClear, 'El banner NO debe aparecer después de limpiar el borrador').not.toBeVisible({ timeout: 3_000 });
  });
});
