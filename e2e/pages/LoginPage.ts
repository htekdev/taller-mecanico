import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * LoginPage — Handles authentication flows.
 *
 * Covers: login, signup, error states, and redirect behavior.
 */
export class LoginPage extends BasePage {
  // ─── Locators ──────────────────────────────────────────────────────────────
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly loginTab: Locator;
  readonly registroTab: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[type="email"]').first();
    this.passwordInput = page.locator('input[type="password"]').first();
    this.submitButton = page.locator('button[type="submit"]').first();
    this.loginTab = page.getByRole('button', { name: 'Iniciar Sesión' });
    this.registroTab = page.getByRole('button', { name: 'Crear Cuenta' });
    this.errorMessage = page.locator('.bg-rose-50');
    this.successMessage = page.locator('.bg-emerald-50');
  }

  async waitForPageLoad() {
    await this.emailInput.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /** Navigate to the login page. */
  async goto() {
    await this.navigate('/login');
    await this.waitForPageLoad();
  }

  /** Fill login credentials. */
  async fillCredentials(email: string, password: string) {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
  }

  /** Submit the login form. */
  async submit() {
    await this.submitButton.click();
  }

  /** Complete login flow — fill and submit. */
  async login(email: string, password: string) {
    await this.fillCredentials(email, password);
    await this.submit();
  }

  /** Login with default test credentials and wait for dashboard. */
  async loginAsTestUser() {
    const email = process.env.E2E_TEST_EMAIL || 'sofia@test.com';
    const password = process.env.E2E_TEST_PASSWORD || 'Test1234!';

    await this.page.goto('/login');
    await this.page.waitForLoadState('domcontentloaded');

    const navButton = this.page.locator('nav button').first();
    const setupPage = this.page.locator('text=/Crear.*Taller|Crear nuevo taller|Setup/i').first();

    // Use sequential isVisible checks to avoid orphaned waitFor operations.
    // Concurrent Promise.race(waitFor) calls leave background Playwright polling
    // running after the race resolves — these orphaned operations can fail when the
    // page later navigates to a state with multiple matching elements (strict mode).
    const isDashboard = await navButton.isVisible({ timeout: 3_000 }).catch(() => false);
    if (isDashboard) return; // Already logged in with taller

    const isSetup = await setupPage.isVisible({ timeout: 2_000 }).catch(() => false);
    if (isSetup) {
      await this.handleSetupPage();
      return;
    }

    // Expect login form — wait for it
    await this.emailInput.waitFor({ state: 'visible', timeout: 30_000 });

    // Fill and submit
    await this.login(email, password);

    // After login: poll sequentially for dashboard or setup (no concurrent waitFor)
    let attempts = 0;
    while (attempts < 40) {
      const onDashboard = await navButton.isVisible({ timeout: 500 }).catch(() => false);
      if (onDashboard) return;
      const onSetup = await setupPage.isVisible({ timeout: 500 }).catch(() => false);
      if (onSetup) {
        await this.handleSetupPage();
        return;
      }
      attempts++;
      await this.page.waitForTimeout(500);
    }
  }

  /** Handle the /setup page — create a taller or select existing one. */
  private async handleSetupPage() {
    await this.page.waitForTimeout(2000); // Let invite check complete

    // If there are existing talleres to select, click the first one
    const tallerButton = this.page.locator('button:has(span:has-text("🔧"))').first();
    if (await tallerButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tallerButton.click();
      await this.page.locator('nav button').first().waitFor({ state: 'visible', timeout: 30_000 });
      return;
    }

    // Otherwise create a new taller
    // Click "+ Crear nuevo taller" if needed
    const crearNuevoBtn = this.page.locator('button:has-text("Crear nuevo taller")');
    if (await crearNuevoBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await crearNuevoBtn.click();
      await this.page.waitForTimeout(500);
    }

    // Fill the nombre input and submit
    const nombreInput = this.page.locator('input[placeholder*="nombre" i], input[type="text"]').first();
    if (await nombreInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nombreInput.fill('Taller E2E Test');
      const submitBtn = this.page.getByRole('button', { name: /crear taller/i });
      if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await submitBtn.click();
        await this.page.locator('nav button').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
      }
    }
  }

  /** Switch to registration mode. */
  async switchToRegistro() {
    await this.registroTab.click();
  }

  /** Switch to login mode. */
  async switchToLogin() {
    await this.loginTab.click();
  }

  /** Get the error message text. */
  async getErrorText(): Promise<string> {
    return this.getText(this.errorMessage);
  }

  /** Get the success message text. */
  async getSuccessText(): Promise<string> {
    return this.getText(this.successMessage);
  }

  /** Check if error message is visible. */
  async hasError(): Promise<boolean> {
    return this.isVisible(this.errorMessage);
  }

  /** Check if submit button shows loading state. */
  async isLoading(): Promise<boolean> {
    const text = await this.submitButton.textContent();
    return text?.includes('Procesando') ?? false;
  }
}
