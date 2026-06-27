import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'sofia@test.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'Test1234!';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('button:has-text("Iniciar Sesión")')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('.bg-rose-50.text-rose-700')).toBeVisible({ timeout: 10_000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    // After login, should see the dashboard nav tabs
    await expect(page.locator('nav button:has-text("Clientes")')).toBeVisible({ timeout: 15_000 });
  });

  test('should logout and return to login', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Salir")');
    // After logout, should see the login form with "Iniciar Sesión" or "Entrar al Sistema"
    await expect(page.locator('button:has-text("Entrar al Sistema"), button:has-text("Iniciar Sesión")').first()).toBeVisible({ timeout: 15_000 });
  });
});

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page.locator('nav button:has-text("Clientes")')).toBeVisible({ timeout: 15_000 });
}
