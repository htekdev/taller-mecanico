import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { expectVisible, showPhaseLabel } from './visual-assert';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await showPhaseLabel(page, '🔍 Verifying login page elements');
    await expectVisible(page.locator('button:has-text("Iniciar Sesión")'), 'Login tab');
    await expectVisible(page.locator('input[type="email"]'), 'Email input');
    await expectVisible(page.locator('input[type="password"]'), 'Password input');
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await showPhaseLabel(page, '🔐 Testing invalid credentials');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expectVisible(page.locator('.bg-rose-50.text-rose-700'), 'Error message');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await showPhaseLabel(page, '✅ Testing successful login');
    await login(page);
    await expectVisible(page.locator('nav button:has-text("Clientes")'), 'Dashboard nav');
  });

  test('should logout and return to login', async ({ page }) => {
    await login(page);
    await showPhaseLabel(page, '🚪 Testing logout flow');
    await page.click('button:has-text("Salir")');
    await expectVisible(
      page.locator('button:has-text("Entrar al Sistema"), button:has-text("Iniciar Sesión")').first(),
      'Login button after logout'
    );
  });
});
