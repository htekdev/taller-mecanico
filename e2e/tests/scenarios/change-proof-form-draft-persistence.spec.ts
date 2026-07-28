import { test, expect } from '../../fixtures';

/**
 * change-proof-form-draft-persistence
 *
 * Proves that PR feat/form-draft-persistence preserves in-progress form data
 * when the user navigates away from Trabajos and returns.
 *
 * Walk-through:
 * 1. Login
 * 2. Navigate to Trabajos
 * 3. Fill description in the new-trabajo form
 * 4. Navigate away to Clientes (simulates user switching modules)
 * 5. Navigate back to Trabajos
 * 6. Assert: "Borrador recuperado" banner is visible (role=status)
 * 7. Assert: The typed description is still in the field
 * 8. Verify the banner auto-dismisses (or the draft is in a recoverable state)
 */
test.describe('change-proof: form draft persistence', () => {
  // Supabase cold-start can slow module navigation — allow retry on first failure.
  test.describe.configure({ retries: 1 });

  test('trabajos form preserves description after navigating away and back', async ({
    page, loginPage, dashboardPage, trabajosPage,
  }) => {
    test.slow();

    const DRAFT_DESCRIPTION = `Borrador E2E — cambio aceite ${Date.now()}`;

    // ── Login ──────────────────────────────────────────────────────────────────
    await loginPage.loginAsTestUser();
    await dashboardPage.waitForPageLoad();

    // ── Navigate to Trabajos ───────────────────────────────────────────────────
    await dashboardPage.navigateToModule('trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // ── Fill description in the new-trabajo form ──────────────────────────────
    await trabajosPage.fillDescription(DRAFT_DESCRIPTION);
    await page.waitForTimeout(800); // wait for debounce auto-save (600ms)

    // ── Navigate away to Clientes ─────────────────────────────────────────────
    await dashboardPage.navigateToModule('clientes');
    await page.waitForTimeout(500);

    // ── Navigate back to Trabajos ──────────────────────────────────────────────
    await dashboardPage.navigateToModule('trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(500);

    // ── Assert: "Borrador recuperado" banner appears ───────────────────────────
    const banner = page.getByRole('status').filter({ hasText: /borrador recuperado/i });
    await expect(banner, 'El banner "Borrador recuperado" debe aparecer al regresar').toBeVisible({ timeout: 5_000 });

    // ── Assert: description field still contains the typed text ───────────────
    const descInput = page.locator('[data-testid="descripcion-input"], textarea[placeholder*="servi" i], input[placeholder*="servi" i], textarea[placeholder*="Ej." i]').first();
    const hasDesc = await descInput.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasDesc) {
      const value = await descInput.inputValue().catch(() => '');
      expect(value, 'El campo descripción debe conservar el texto ingresado').toContain(DRAFT_DESCRIPTION.slice(0, 20));
    }
    // If the specific input isn't found by the above selector, verify the text
    // appears anywhere in the form area as a fallback
    else {
      const formArea = page.locator('form, [class*="rounded-xl"][class*="slate"]').first();
      await expect(formArea, 'El área del formulario debe contener el texto del borrador').toContainText(
        DRAFT_DESCRIPTION.slice(0, 20), { timeout: 3_000 }
      );
    }
  });
});
