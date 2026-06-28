# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: edge-cases\concurrent-operations.spec.ts >> Concurrent Operations >> navigation during save does not corrupt data
- Location: e2e\tests\edge-cases\concurrent-operations.spec.ts:64:7

# Error details

```
TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('input[type="email"]') to be visible

```

# Page snapshot

```yaml
- main [ref=e3]:
  - paragraph [ref=e4]:
    - generic [ref=e5]:
      - strong [ref=e6]: "404"
      - text: ": NOT_FOUND"
    - generic [ref=e7]:
      - text: "Code:"
      - code [ref=e8]: "`NOT_FOUND`"
    - generic [ref=e9]:
      - text: "ID:"
      - code [ref=e10]: "`cle1::slt68-1782625667687-89abd8476c95`"
  - link "Read our documentation to learn more about this error." [ref=e11] [cursor=pointer]:
    - /url: https://vercel.com/docs/errors/NOT_FOUND
    - generic [ref=e12]: Read our documentation to learn more about this error.
```

# Test source

```ts
  1  | import type { Page, Locator } from '@playwright/test';
  2  | import { BasePage } from './BasePage';
  3  | 
  4  | /**
  5  |  * LoginPage — Handles authentication flows.
  6  |  *
  7  |  * Covers: login, signup, error states, and redirect behavior.
  8  |  */
  9  | export class LoginPage extends BasePage {
  10 |   // ─── Locators ──────────────────────────────────────────────────────────────
  11 |   readonly emailInput: Locator;
  12 |   readonly passwordInput: Locator;
  13 |   readonly submitButton: Locator;
  14 |   readonly loginTab: Locator;
  15 |   readonly registroTab: Locator;
  16 |   readonly errorMessage: Locator;
  17 |   readonly successMessage: Locator;
  18 | 
  19 |   constructor(page: Page) {
  20 |     super(page);
  21 |     this.emailInput = page.locator('input[type="email"]');
  22 |     this.passwordInput = page.locator('input[type="password"]');
  23 |     this.submitButton = page.locator('button[type="submit"]');
  24 |     this.loginTab = page.getByRole('button', { name: 'Iniciar Sesión' });
  25 |     this.registroTab = page.getByRole('button', { name: 'Crear Cuenta' });
  26 |     this.errorMessage = page.locator('.bg-rose-50');
  27 |     this.successMessage = page.locator('.bg-emerald-50');
  28 |   }
  29 | 
  30 |   async waitForPageLoad() {
> 31 |     await this.emailInput.waitFor({ state: 'visible', timeout: 15_000 });
     |                           ^ TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
  32 |   }
  33 | 
  34 |   /** Navigate to the login page. */
  35 |   async goto() {
  36 |     await this.navigate('/login');
  37 |     await this.waitForPageLoad();
  38 |   }
  39 | 
  40 |   /** Fill login credentials. */
  41 |   async fillCredentials(email: string, password: string) {
  42 |     await this.fillInput(this.emailInput, email);
  43 |     await this.fillInput(this.passwordInput, password);
  44 |   }
  45 | 
  46 |   /** Submit the login form. */
  47 |   async submit() {
  48 |     await this.submitButton.click();
  49 |   }
  50 | 
  51 |   /** Complete login flow — fill and submit. */
  52 |   async login(email: string, password: string) {
  53 |     await this.fillCredentials(email, password);
  54 |     await this.submit();
  55 |   }
  56 | 
  57 |   /** Login with default test credentials and wait for dashboard. */
  58 |   async loginAsTestUser() {
  59 |     const email = process.env.E2E_TEST_EMAIL || 'sofia@test.com';
  60 |     const password = process.env.E2E_TEST_PASSWORD || 'Test1234!';
  61 |     await this.goto();
  62 |     await this.login(email, password);
  63 |     // Wait for redirect to dashboard (nav appears)
  64 |     await this.page.locator('nav button').first().waitFor({ state: 'visible', timeout: 20_000 });
  65 |   }
  66 | 
  67 |   /** Switch to registration mode. */
  68 |   async switchToRegistro() {
  69 |     await this.registroTab.click();
  70 |   }
  71 | 
  72 |   /** Switch to login mode. */
  73 |   async switchToLogin() {
  74 |     await this.loginTab.click();
  75 |   }
  76 | 
  77 |   /** Get the error message text. */
  78 |   async getErrorText(): Promise<string> {
  79 |     return this.getText(this.errorMessage);
  80 |   }
  81 | 
  82 |   /** Get the success message text. */
  83 |   async getSuccessText(): Promise<string> {
  84 |     return this.getText(this.successMessage);
  85 |   }
  86 | 
  87 |   /** Check if error message is visible. */
  88 |   async hasError(): Promise<boolean> {
  89 |     return this.isVisible(this.errorMessage);
  90 |   }
  91 | 
  92 |   /** Check if submit button shows loading state. */
  93 |   async isLoading(): Promise<boolean> {
  94 |     const text = await this.submitButton.textContent();
  95 |     return text?.includes('Procesando') ?? false;
  96 |   }
  97 | }
  98 | 
```