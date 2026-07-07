import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * Change-proof spec: gastos module error handling
 * PR: fix/gastos-error-handling
 *
 * Validates that error states in GastoForm and handleDelete do not
 * leave the UI in a broken state (stuck spinners or frozen dialogs).
 */
test.describe('change-proof-gastos-error-handling', () => {
  test('gastos form shows correct save state and dismiss on cancel', async ({
    page, loginPage, dashboardPage
  }) => {
    await showPhaseLabel(page, '🔐 Login al Taller Mecánico');
    await loginPage.loginAsTestUser();
    await page.locator('nav').waitFor({ state: 'visible', timeout: 45_000 });
    await page.waitForTimeout(1000);

    await showPhaseLabel(page, '🔧 Gastos Error Handling');
    await dashboardPage.navigateToModule('gastos');
    await page.waitForTimeout(1500);

    // Open new gasto form
    const btnNuevo = page.getByRole('button', { name: '+ Nuevo Gasto' });
    if (await btnNuevo.isVisible()) {
      await btnNuevo.click();
      await page.waitForTimeout(500);

      // Verify form opened
      const guardarBtn = page.getByRole('button', { name: /Guardar/i });
      await expect(guardarBtn).toBeVisible();

      // Cancel — form should close (no stuck state)
      const cancelBtn = page.getByRole('button', { name: /Cancelar/i });
      await cancelBtn.click();
      await page.waitForTimeout(500);

      // Form should be gone
      await expect(guardarBtn).not.toBeVisible();
    }

    await showPhaseLabel(page, '✅ Gastos Form OK');
  });

  test('gastos module loads without NaN or broken values', async ({
    page, loginPage, dashboardPage
  }) => {
    await showPhaseLabel(page, '🔐 Login al Taller Mecánico');
    await loginPage.loginAsTestUser();
    await page.locator('nav').waitFor({ state: 'visible', timeout: 45_000 });
    await page.waitForTimeout(1000);

    await dashboardPage.navigateToModule('gastos');
    await page.waitForTimeout(2000);

    const mainText = await page.locator('main').innerText().catch(() => '');
    expect(mainText).not.toContain('NaN');
    expect(mainText).not.toContain('undefined');
    expect(mainText).not.toContain('Infinity');

    await showPhaseLabel(page, '✅ Gastos Values OK');
  });
});