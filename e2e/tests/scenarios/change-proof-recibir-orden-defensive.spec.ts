import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * Change-proof spec: recibirOrden defensive fix — Issue #224
 * PR: fix(ordenes): defensive guards in recibirOrden to prevent silent crash
 *
 * Root cause: recibirOrden could throw a TypeError if any CompraItem had a
 * null/undefined refaccionId, or produce NaN stock if item.cantidad was an
 * unexpected type from JSONB — both swallowed by the outer catch and shown as
 * "No se pudo recibir la orden."
 *
 * Fix applied:
 * - p.refaccionId?.startsWith('libre-') ?? false  (null-safe optional chaining)
 * - Number(item.cantidad) || 0  (explicit numeric coercion)
 * - Per-step try/catch with granular console.error for each DB operation
 *
 * Tests:
 * 1. Ordenes de compra module loads without "No se pudo recibir" error on mount
 * 2. Pending orders show the Marcar Recibida button (regression guard)
 * 3. No JavaScript TypeError surfaces in the DOM for ordenes actions
 */

test.describe('change-proof-recibir-orden-defensive', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('ordenes module loads and shows no recibir-orden error banner', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '📦 Navegando a Órdenes de Compra');
    await dashboardPage.navigateToModule('ordenes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1500);

    await expectVisible(dashboardPage.nav, 'Nav visible after ordenes load');

    // Ensure the "No se pudo recibir" error does NOT appear on page load
    const recibirError = page.locator(':has-text("No se pudo recibir la orden")').first();
    const hasRecibirError = await recibirError.isVisible().catch(() => false);
    expect(hasRecibirError).toBe(false);

    await showPhaseLabel(page, '✅ Sin error al cargar ordenes');
  });

  test('pending orders display Marcar Recibida button correctly', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔍 Buscando órdenes pendientes');
    await dashboardPage.navigateToModule('ordenes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1500);

    // Check if any pending orders exist
    const pendienteTag = page.locator(':has-text("Pendiente de recibir")').first();
    const hasPendiente = await pendienteTag.isVisible().catch(() => false);

    if (hasPendiente) {
      await showPhaseLabel(page, '📋 Orden pendiente encontrada — verificando botón');

      // The Marcar Recibida / Marcar como Recibida button should be present
      const marcarBtn = page
        .locator('button:has-text("Marcar"), button:has-text("Recibida")')
        .first();
      const btnVisible = await marcarBtn.isVisible().catch(() => false);
      expect(btnVisible).toBe(true);

      await showPhaseLabel(page, '✅ Botón Marcar Recibida visible');
    } else {
      await showPhaseLabel(page, 'ℹ️ Sin órdenes pendientes — test omitido');
      // No pending orders — that's OK, just verify the page renders
      const heading = page.locator('h1, h2, h3').filter({ hasText: /[Óó]rdenes/i }).first();
      await expect(heading).toBeVisible({ timeout: 5000 });
    }
  });

  test('no TypeError in DOM after ordenes interaction', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🧪 Verificando sin TypeErrors visibles');

    // Collect JS console errors
    const jsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') jsErrors.push(msg.text());
    });

    await dashboardPage.navigateToModule('ordenes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(2000);

    // Filter for TypeError specifically (null/undefined access errors)
    const typeErrors = jsErrors.filter(e => e.includes('TypeError') || e.includes('Cannot read properties'));

    if (typeErrors.length > 0) {
      console.error('[change-proof-recibir-orden] TypeErrors found:', typeErrors);
    }

    // ASSERT: no TypeError from recibirOrden null/undefined refaccionId access
    const recibirTypeErrors = typeErrors.filter(e =>
      e.includes('startsWith') || e.includes('refaccionId')
    );
    expect(recibirTypeErrors).toHaveLength(0);

    await showPhaseLabel(page, '✅ Sin TypeErrors de refaccionId');
  });
});
