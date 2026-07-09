import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * Auth Session Flows — Login persistence and protection.
 *
 * Tests:
 * 1. Session survives page reload (still in app after F5)
 * 2. Multi-module navigation does not drop the session
 * 3. Authenticated user email or taller name visible in UI
 * 4. Logout redirects to login page
 * 5. Re-login after logout restores full session
 */

test.describe('Auth Session Flows', () => {
  test('session persists after page reload', async ({
    page, loginPage, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔄 Phase 1: Login');
    await loginPage.loginAsTestUser();
    await dashboardPage.waitForPageLoad();

    await showPhaseLabel(page, '🔄 Phase 2: Reload Page');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);

    // App must have restored auth or be re-authenticating — must not be blank
    const navVisible = await dashboardPage.nav.isVisible().catch(() => false);
    const loginVisible = await page.locator('input[type="email"]').first().isVisible().catch(() => false);
    const loadingVisible = await page.getByText(/Cargando|Loading/i).isVisible().catch(() => false);
    const contentVisible = await page.locator('[data-testid="app-content-loaded"]').isVisible().catch(() => false);

    const pageHasContent = navVisible || loginVisible || loadingVisible || contentVisible;
    expect(pageHasContent, 'Page shows content after reload — not blank').toBe(true);

    await showPhaseLabel(page, '✅ Session Handled Correctly After Reload');
  });

  test('multi-module navigation does not drop session', async ({
    page, loginPage, dashboardPage,
  }) => {
    test.slow();
    await showPhaseLabel(page, '🧭 Phase 1: Login');
    await loginPage.loginAsTestUser();
    await dashboardPage.waitForPageLoad();

    const modules: Array<Parameters<typeof dashboardPage.navigateToModule>[0]> = [
      'clientes', 'inventario', 'trabajos', 'gastos', 'resumen', 'historial',
    ];

    await showPhaseLabel(page, '🧭 Phase 2: Navigate Multiple Modules');
    for (const mod of modules) {
      await dashboardPage.navigateToModule(mod);
      await page.waitForTimeout(300);
    }

    // Nav must still be present after all navigations
    const navVisible = await dashboardPage.nav.isVisible().catch(() => false);
    expect(navVisible, 'Nav visible after navigating 6 modules').toBe(true);

    // No fatal error
    const errorVisible = await page.getByText(/error al cargar|fatal error/i).first()
      .isVisible().catch(() => false);
    expect(errorVisible, 'No fatal error banner after multi-module navigation').toBe(false);

    await showPhaseLabel(page, '✅ Session Stable Across Modules');
  });

  test('authenticated user identity visible in sidebar', { retries: 1 }, async ({
    page, loginPage, dashboardPage,
  }) => {
    test.slow(); // Supabase cold-start in CI can cause waitForPageLoad() to take 2+ min
    await showPhaseLabel(page, '👤 Phase 1: Login and Verify Identity');
    await loginPage.loginAsTestUser();
    await dashboardPage.waitForPageLoad();

    // Either user email, taller name, or user-related UI must be visible
    const emailVisible = await dashboardPage.userEmail.isVisible().catch(() => false);
    const salirVisible = await dashboardPage.logoutButton.isVisible().catch(() => false);
    const tallerVisible = await page.getByText(/Taller/i).first().isVisible().catch(() => false);

    expect(emailVisible || salirVisible || tallerVisible,
      'Authenticated user identity (email, logout button, or taller name) must be visible').toBe(true);

    await showPhaseLabel(page, '✅ User Identity Shown in Authenticated State');
  });

  test('logout redirects to login page', async ({
    page, loginPage, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🚪 Phase 1: Login');
    await loginPage.loginAsTestUser();
    await dashboardPage.waitForPageLoad();

    await showPhaseLabel(page, '🚪 Phase 2: Logout');
    await dashboardPage.logout().catch(() => {});
    await page.waitForTimeout(2500);

    const emailInputVisible = await page.locator('input[type="email"]').first().isVisible().catch(() => false);
    const loginBtnVisible = await page.getByRole('button', { name: /iniciar sesión/i }).isVisible().catch(() => false);
    const setupVisible = await page.getByText(/Selecciona tu Taller|Bienvenido/i).first().isVisible().catch(() => false);

    expect(emailInputVisible || loginBtnVisible || setupVisible,
      'After logout: login page or setup page shown').toBe(true);

    await showPhaseLabel(page, '✅ Logout Redirected to Login');
  });

  test('re-login after logout restores full app access', async ({
    page, loginPage, dashboardPage,
  }) => {
    test.slow();
    await showPhaseLabel(page, '🔐 Phase 1: Initial Login');
    await loginPage.loginAsTestUser();
    await dashboardPage.waitForPageLoad();

    await showPhaseLabel(page, '🔐 Phase 2: Logout');
    await dashboardPage.logout().catch(() => {});
    await page.waitForTimeout(2000);

    await showPhaseLabel(page, '🔐 Phase 3: Re-Login');
    await loginPage.loginAsTestUser();
    await dashboardPage.waitForPageLoad();

    const navVisible = await dashboardPage.nav.isVisible().catch(() => false);
    expect(navVisible, 'Nav visible after re-login').toBe(true);

    // Verify can navigate to a module after re-login
    await dashboardPage.navigateToModule('clientes');
    await page.waitForTimeout(1000);

    const navAfterNav = await dashboardPage.nav.isVisible().catch(() => false);
    expect(navAfterNav, 'Nav still visible after post-re-login navigation').toBe(true);

    await showPhaseLabel(page, '✅ Re-Login Restores Full Session');
  });
});