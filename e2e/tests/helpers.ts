import { Page, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'sofia@test.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'Test1234!';

/**
 * Page Object Model — Taller Mecánico
 *
 * Encapsulates common navigation, login, and module helpers so tests
 * stay DRY and resilient to UI refactors.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page.locator('nav button:has-text("Clientes")')).toBeVisible({ timeout: 15_000 });
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type ModuleName =
  | 'Clientes' | 'Inventario' | 'Trabajos' | 'Proveedores'
  | 'Órdenes de Compra' | 'Facturas' | 'Por Cobrar' | 'Por Pagar'
  | 'Resumen' | 'Gastos' | 'Historial' | 'Cotizaciones' | 'Configuración';

export async function navigateTo(page: Page, module: ModuleName) {
  await page.click(`nav button:has-text("${module}")`);
  await page.waitForTimeout(1_500);
}

export async function expectActiveTab(page: Page, module: ModuleName) {
  const tab = page.locator(`nav button:has-text("${module}")`);
  await expect(tab).toHaveClass(/bg-indigo-600/);
}

export async function expectSectionTitle(page: Page, title: string) {
  await expect(page.locator(`h2:has-text("${title}")`)).toBeVisible({ timeout: 10_000 });
}

// ─── Clientes ────────────────────────────────────────────────────────────────

export async function createClient(page: Page, name: string, phone?: string) {
  await navigateTo(page, 'Clientes');
  const nameInput = page.locator('input[placeholder="Nombre completo"]');
  await expect(nameInput).toBeVisible({ timeout: 5_000 });
  await nameInput.fill(name);
  if (phone) {
    const phoneInput = page.locator('input[type="tel"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(phone);
    }
  }
  await page.click('button:has-text("Agregar Cliente")');
  await page.waitForTimeout(2_000);
}

// ─── Cotizaciones ────────────────────────────────────────────────────────────

export async function openCotizacionForm(page: Page, plantilla: 'General' | 'Ayuntamiento' | 'Red Ambiental' = 'General') {
  await navigateTo(page, 'Cotizaciones');
  await expectSectionTitle(page, 'Cotizaciones');
  const card = page.locator(`button:has-text("${plantilla}")`).first();
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.click();
  await page.waitForTimeout(2_000);
}

export async function selectClient(page: Page, index = 1) {
  const clientSelect = page.locator('select').first();
  await expect(clientSelect).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(
    () => document.querySelectorAll('select')[0]?.options.length > 1,
    { timeout: 15_000 }
  ).catch(() => {});
  const options = await clientSelect.locator('option').count();
  if (options > 1) {
    await clientSelect.selectOption({ index: Math.min(index, options - 1) });
  }
  await page.waitForTimeout(1_000);
}

export async function selectVehicle(page: Page, selectIndex = 1, optionIndex = 1) {
  const vehicleSelect = page.locator('select').nth(selectIndex);
  if (await vehicleSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const opts = await vehicleSelect.locator('option').count();
    if (opts > 1) {
      await vehicleSelect.selectOption({ index: Math.min(optionIndex, opts - 1) });
    }
  }
}

// ─── Inventario ──────────────────────────────────────────────────────────────

export async function addInventoryPart(page: Page, name: string, code?: string, price?: number) {
  await navigateTo(page, 'Inventario');
  await expectSectionTitle(page, 'Inventario');

  const nameInput = page.locator('input[placeholder*="Filtro de aceite" i]').first();
  await expect(nameInput).toBeVisible({ timeout: 5_000 });
  await nameInput.fill(name);

  if (code) {
    const codeInput = page.locator('input[placeholder*="código" i]').first();
    if (await codeInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await codeInput.fill(code);
    }
  }

  if (price) {
    // precioCompra is a number input
    const priceInputs = page.locator('input[type="number"]');
    const count = await priceInputs.count();
    if (count > 0) {
      await priceInputs.first().fill(String(price));
    }
  }

  await page.click('button:has-text("Agregar al Inventario")');
  await page.waitForTimeout(2_000);
}
