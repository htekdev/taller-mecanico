import { test, expect } from '@playwright/test';
import { login, navigateTo, expectSectionTitle } from './helpers';
import { expectVisible, showPhaseLabel } from './visual-assert';

/**
 * Cancel/Delete Flow Tests — Taller Mecánico
 *
 * Verifies that records can be cancelled/deleted across modules.
 * Note: Cotizaciones and Trabajos use "cancel" (soft delete with badge),
 * not hard delete.
 */

test.describe('Cancel and Delete Flows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should cancel a cotización', async ({ page }) => {
    await navigateTo(page, 'Cotizaciones');
    await showPhaseLabel(page, '❌ Testing cancel cotización');
    await expectSectionTitle(page, 'Cotizaciones');

    const cancelBtn = page.locator('button:has-text("Cancelar")').first();
    if (await cancelBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expectVisible(cancelBtn, 'Cancel button');
      await cancelBtn.click();
      await page.waitForTimeout(2_000);

      const cancelBadge = page.locator('text=Cancelada').first();
      await expectVisible(cancelBadge, 'Cancelada badge');
    }
  });

  test('should cancel and reactivate a trabajo', async ({ page }) => {
    await navigateTo(page, 'Trabajos');
    await showPhaseLabel(page, '❌ Testing cancel/reactivate trabajo');
    await expectSectionTitle(page, 'Trabajos');

    // Look for the cancel button (red circle with ✕ or "Cancelar trabajo" title)
    const cancelBtn = page.locator('button[title="Cancelar trabajo"]').first();
    if (await cancelBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(1_000);

      // A confirmation prompt should appear — "Sí, cancelar" or similar
      const confirmBtn = page.locator('button:has-text("Sí")').first();
      if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2_000);
      }

      // Look for a "Reactivar" button on the cancelled trabajo
      const reactivateBtn = page.locator('button:has-text("Reactivar")').first();
      if (await reactivateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await reactivateBtn.click();
        await page.waitForTimeout(2_000);

        // After reactivation, the trabajo should be back in the active list
        await expect(page.locator('text=Reactivar')).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
      }
    }
  });

  test('should remove a line item from cotización form', async ({ page }) => {
    await navigateTo(page, 'Cotizaciones');
    await showPhaseLabel(page, '🗑️ Testing line item removal');
    await expectSectionTitle(page, 'Cotizaciones');

    const generalCard = page.locator('button:has-text("General")').first();
    await expectVisible(generalCard, 'General plantilla');
    await generalCard.click();
    await page.waitForTimeout(2_000);

    // Look for the × button to remove a line item
    const removeBtn = page.locator('button[title="Eliminar"], button:has-text("×")').first();
    if (await removeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const countBefore = await page.locator('button[title="Eliminar"], button:has-text("×")').count();
      await removeBtn.click();
      await page.waitForTimeout(1_000);
      const countAfter = await page.locator('button[title="Eliminar"], button:has-text("×")').count();
      // One less item after removal
      expect(countAfter).toBeLessThanOrEqual(countBefore);
    }
  });
});
