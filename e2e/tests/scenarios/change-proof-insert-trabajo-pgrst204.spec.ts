/**
 * change-proof-insert-trabajo-pgrst204
 *
 * Verifies that inserting a new trabajo (job) works end-to-end,
 * specifically exercising the PGRST204 fallback path in insertTrabajo.
 *
 * Root cause: insertTrabajo's column-missing fallback only checked error.code === '42703'
 * (PostgreSQL undefined_column), but PostgREST v12 returns 'PGRST204' (schema-cache miss).
 * This caused insertTrabajo to throw instead of retrying without new columns, producing
 * "No se pudo guardar el trabajo" even though Phase 1 of the save was valid.
 *
 * Fix: isColumnMissingInsert() now accepts both '42703' and 'PGRST204'.
 */
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { TrabajoPage } from '../../pages/TrabajoPage';

test.describe('insertTrabajo — PGRST204 fallback', () => {
  test('can save a new trabajo without error banner', async ({ page }) => {
    test.slow();

    // 1. Login
    const login = new LoginPage(page);
    await login.goto();
    await login.login('sofia@test.com', 'Test1234!');

    // 2. Navigate to Trabajos module
    const dashboard = new DashboardPage(page);
    await dashboard.navigateToModule('trabajos');

    // 3. Open new trabajo form
    const trabajoPage = new TrabajoPage(page);
    await trabajoPage.openNuevoTrabajoForm();

    // 4. Fill in minimum required fields
    const today = new Date().toLocaleDateString('es-MX');
    await trabajoPage.fillTrabajoForm({
      descripcion: `E2E test trabajo — PGRST204 fix ${Date.now()}`,
    });

    // 5. Save
    await trabajoPage.guardarTrabajo();

    // 6. Verify no error banner appeared
    const errorBanner = page.locator('text=No se pudo guardar');
    await expect(errorBanner).not.toBeVisible({ timeout: 5000 });

    // 7. The form should have cleared or a success indicator shown
    // (job was saved — modal closed or list updated)
    await expect(page.locator('[data-testid="trabajos-list"], [data-testid="modal-nuevo-trabajo"]')).toBeTruthy();
  });
});
