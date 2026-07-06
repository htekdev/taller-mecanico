import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * DashboardPage — Main application shell after login.
 *
 * Handles sidebar/tab navigation, user info display, logout,
 * and module switching.
 */

export type ModuleKey =
  | 'clientes' | 'inventario' | 'trabajos' | 'proveedores'
  | 'ordenes' | 'facturas' | 'cuentas' | 'pagos'
  | 'resumen' | 'gastos' | 'historial' | 'cotizaciones' | 'configuracion'
  | 'reportes';

export const MODULE_LABELS: Record<ModuleKey, string> = {
  clientes: 'Clientes',
  inventario: 'Inventario',
  trabajos: 'Trabajos',
  proveedores: 'Proveedores',
  ordenes: 'Ordenes de Compra',
  facturas: 'Facturas',
  cuentas: 'Por Cobrar',
  pagos: 'Por Pagar',
  resumen: 'Resumen',
  gastos: 'Gastos',
  historial: 'Historial',
  cotizaciones: 'Cotizaciones',
  configuracion: 'Configuracion',
  reportes: 'Reportes',
};

export class DashboardPage extends BasePage {
  // ─── Locators ──────────────────────────────────────────────────────────────
  readonly nav: Locator;
  readonly logoutButton: Locator;
  readonly userEmail: Locator;
  readonly headerTitle: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = page.locator('nav');
    this.logoutButton = page.getByRole('button', { name: /salir/i });
    this.userEmail = page.locator('.text-slate-500.text-xs');
    this.headerTitle = page.locator('h1:has-text("Taller Mecanico")');
    this.loadingIndicator = page.getByText('Cargando datos...');
  }

  async waitForPageLoad() {
    // Wait for nav to appear (indicates dashboard loaded with taller)
    await this.nav.waitFor({ state: 'visible', timeout: 45_000 }).catch(async () => {
      // If nav doesn't appear, we might be on setup page
      // Try navigating to root
      await this.page.goto('/');
      await this.page.waitForLoadState('domcontentloaded');
      await this.nav.waitFor({ state: 'visible', timeout: 45_000 }).catch(() => {});
    });
    // Wait for cargarDatos() to complete — app-content-loaded only renders when cargando=false.
    // This is a POSITIVE signal (element must appear), avoiding the race condition where
    // waitFor({ state: 'hidden' }) resolves instantly if the overlay hasn't mounted yet.
    // On Vercel preview with 8 parallel Supabase queries this can take 2+ minutes.
    await this.page.locator('[data-testid="app-content-loaded"]')
      .waitFor({ state: 'visible', timeout: 150_000 }).catch(() => {});
  }

  /** Navigate to the dashboard directly (assumes logged in). */
  async goto() {
    await this.navigate('/');
    await this.waitForPageLoad();
  }

  /** Navigate to a specific module tab. */
  async navigateToModule(module: ModuleKey) {
    // Only wait for cold-start if app hasn't loaded yet — avoids exceeding 90s test budget
    // on subsequent navigations within the same test (isVisible check is instant)
    const alreadyLoaded = await this.page.locator('[data-testid="app-content-loaded"]')
      .isVisible().catch(() => false);
    if (!alreadyLoaded) {
      await this.page.locator('[data-testid="app-content-loaded"]')
        .waitFor({ state: 'visible', timeout: 45_000 }).catch(() => {});
    }
    const label = MODULE_LABELS[module];
    const tab = this.nav.getByRole('button', { name: label });
    await tab.click();
    // Wait for the tab to become active
    await tab.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    // Small delay for module content to render
    // Wait for module content to load (Supabase data fetch may be slow on cold start)
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  /** Get the active tab's module key. */
  async getActiveModule(): Promise<string | null> {
    const activeTab = this.nav.locator('button.bg-indigo-600');
    const text = await activeTab.textContent();
    if (!text) return null;
    // Find which module matches the text
    for (const [key, label] of Object.entries(MODULE_LABELS)) {
      if (text.includes(label)) return key;
    }
    return null;
  }

  /** Get the badge count for a specific module tab. */
  async getModuleBadge(module: ModuleKey): Promise<string | null> {
    const label = MODULE_LABELS[module];
    const tab = this.nav.getByRole('button', { name: label });
    const badge = tab.locator('span.text-xs.font-bold');
    if (await badge.isVisible().catch(() => false)) {
      return badge.textContent();
    }
    return null;
  }

  /** Logout the current user. */
  async logout() {
    await this.logoutButton.click();
    // Wait for redirect to login page — use .first() to handle pages that may
    // have multiple email inputs (e.g. PR #110 feedback form adds a second one)
    await this.page.locator('input[type="email"]').first().waitFor({ state: 'visible', timeout: 20_000 });
  }

  /** Get the currently displayed user email. */
  async getUserEmail(): Promise<string> {
    return this.getText(this.userEmail);
  }

  /** Check if data is still loading. */
  async isLoading(): Promise<boolean> {
    return this.isVisible(this.loadingIndicator);
  }

  /** Get the tab locator for a given module. */
  getTabLocator(module: ModuleKey): Locator {
    return this.nav.getByRole('button', { name: MODULE_LABELS[module] });
  }
}