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
    await this.emailInput.waitFor({ state: 'visible', timeout: 15_000 });
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

    // Check if we're already logged in (redirected to dashboard or setup)
    const navButton = this.page.locator('nav button').first();
    const emailField = this.emailInput;
    const setupPage = this.page.locator('text=/Crear.*Taller|Crear nuevo taller|Setup/i').first();

    // Race: login form OR dashboard OR setup page
    const firstVisible = await Promise.race([
      emailField.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'login' as const),
      navButton.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'dashboard' as const),
      setupPage.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'setup' as const),
    ]).catch(() => 'timeout' as const);

    if (firstVisible === 'dashboard') {
      return; // Already logged in with taller
    }

    if (firstVisible === 'setup') {
      // User logged in but no taller — create one
      await this.handleSetupPage();
      return;
    }

    if (firstVisible === 'timeout') {
      await this.page.goto('/');
      await this.page.waitForLoadState('domcontentloaded');
      await navButton.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
      return;
    }

    // On login page — fill and submit
    await this.login(email, password);

    // After login, might go to dashboard OR setup
    const postLogin = await Promise.race([
      navButton.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'dashboard' as const),
      setupPage.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'setup' as const),
    ]).catch(() => 'timeout' as const);

    if (postLogin === 'setup') {
      await this.handleSetupPage();
    }
  }

  /** Handle the /setup page — create a taller or select existing one. */
  private async handleSetupPage() {
    await this.page.waitForTimeout(2000); // Let invite check complete

    // If there are existing talleres to select, click the first one
    const tallerButton = this.page.locator('button:has(span:has-text("🔧"))').first();
    if (await tallerButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tallerButton.click();
      await this.page.locator('nav button').first().waitFor({ state: 'visible', timeout: 15_000 });
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
        await this.page.locator('nav button').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
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
