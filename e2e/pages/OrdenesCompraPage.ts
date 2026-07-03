import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * OrdenesCompraPage — Manages purchase orders (Órdenes de Compra).
 *
 * Covers: creating orders, selecting proveedor, adding items from inventory
 * or free-form, editing received orders, marking as received, IVA toggle.
 */
export class OrdenesCompraPage extends BasePage {
  readonly sectionTitle: Locator;
  readonly crearOrdenButton: Locator;

  // ─── Form ──────────────────────────────────────────────────────────────────
  readonly proveedorSelect: Locator;
  readonly descripcionInput: Locator;
  readonly numeroOrdenInput: Locator;
  readonly conIVACheckbox: Locator;
  readonly addItemButton: Locator;
  readonly refaccionSelect: Locator;
  readonly cantidadInput: Locator;
  readonly precioInput: Locator;
  readonly saveButton: Locator;

  // ─── List ──────────────────────────────────────────────────────────────────
  readonly ordenesList: Locator;
  readonly filterSelect: Locator;

  // ─── Actions ───────────────────────────────────────────────────────────────
  readonly recibirButton: Locator;
  readonly editarButton: Locator;
  readonly eliminarButton: Locator;

  constructor(page: Page) {
    super(page);
    const createForm = page.locator('form').first();

    this.sectionTitle = page.locator('h2:has-text("Órdenes de Compra")');
    this.crearOrdenButton = createForm.getByRole('button', { name: /crear orden/i });

    this.proveedorSelect = createForm.locator('select').first();
    this.descripcionInput = createForm.locator('input[placeholder*="Reposición mensual filtros" i]').first();
    this.numeroOrdenInput = createForm.locator('input[placeholder*="OC-2026" i]').first();
    this.conIVACheckbox = page.locator('button[role="switch"], button').filter({ hasText: /IVA/i }).first();
    this.addItemButton = createForm.getByRole('button', { name: /^\+ Agregar$/i }).first();
    this.refaccionSelect = createForm.locator('select').nth(1);
    this.cantidadInput = createForm.locator('input[placeholder="1"]').first();
    this.precioInput = createForm.locator('input[placeholder="0.00"]').first();
    this.saveButton = createForm.getByRole('button', { name: /crear orden|registrar pieza y crear orden/i }).first();

    this.ordenesList = page.locator('.space-y-3, .divide-y').first();
    this.filterSelect = page.locator('select:has(option:has-text("Todos los proveedores"))').first();

    this.recibirButton = page.getByRole('button', { name: /recibir|marcar recibida/i }).first();
    this.editarButton = page.getByRole('button', { name: /corregir orden|editar/i }).first();
    this.eliminarButton = page.getByRole('button', { name: /eliminar/i }).first();
  }

  async waitForPageLoad() {
    // Wait for cargando overlay to disappear first (can take up to 90s on cold Vercel preview)
    const loadingOverlay = this.page.locator('text=Cargando datos del taller');
    await loadingOverlay.waitFor({ state: 'hidden', timeout: 90_000 })
      .catch((err) => { console.warn('[Page] Loading overlay did not hide within 90s — proceeding anyway:', err?.message); });
    await this.sectionTitle.waitFor({ state: 'visible', timeout: 45_000 });
  }

  /** Select a proveedor for the new order. */
  async selectProveedor(index = 1) {
    if (await this.proveedorSelect.isVisible().catch(() => false)) {
      const count = await this.getOptionCount(this.proveedorSelect);
      if (count > 1) {
        await this.selectByIndex(this.proveedorSelect, Math.min(index, count - 1));
      }
    }
  }

  /** Fill the order description. */
  async fillDescription(text: string) {
    if (await this.descripcionInput.isVisible().catch(() => false)) {
      await this.fillInput(this.descripcionInput, text);
    }
  }

  /** Add an item from existing inventory. */
  async addItemFromInventory(refIndex = 1, cantidad = 1, precio = 100) {
    if (await this.refaccionSelect.isVisible().catch(() => false)) {
      const count = await this.getOptionCount(this.refaccionSelect);
      if (count > 1) {
        await this.selectByIndex(this.refaccionSelect, Math.min(refIndex, count - 1));
        await this.page.waitForTimeout(200);
      }
    }

    if (await this.cantidadInput.isVisible().catch(() => false)) {
      await this.fillInput(this.cantidadInput, String(cantidad));
    }
    if (await this.precioInput.isVisible().catch(() => false)) {
      await this.fillInput(this.precioInput, String(precio));
    }

    if (await this.addItemButton.isVisible().catch(() => false)) {
      const isDisabled = await this.addItemButton.isDisabled().catch(() => false);
      if (!isDisabled) {
        await this.addItemButton.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  /** Toggle IVA checkbox. */
  async toggleIVA() {
    if (await this.conIVACheckbox.isVisible().catch(() => false)) {
      await this.conIVACheckbox.click();
    }
  }

  /** Save the order. */
  async save() {
    const isDisabled = await this.saveButton.isDisabled().catch(() => false);
    if (!isDisabled) {
      await this.saveButton.click();
      await this.page.waitForTimeout(2000);
    }
  }

  /** Mark an order as received. */
  async markAsReceived() {
    await this.recibirButton.click();
    await this.page.waitForTimeout(2000);
  }

  /** Click edit on the first order. */
  async clickEdit() {
    if (await this.editarButton.isVisible().catch(() => false)) {
      await this.editarButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /** Get the count of orders in the list. */
  async getOrderCount(): Promise<number> {
    const items = this.page.getByRole('button', { name: /ver piezas|ocultar piezas/i });
    return items.count();
  }

  /** Get the status badge of the first order. */
  async getFirstOrderStatus(): Promise<string> {
    const badge = this.page.locator('.rounded-full, .badge').first();
    return this.getText(badge);
  }

  /** Check if proveedor is visible in the order list. */
  async isProveedorVisible(name: string): Promise<boolean> {
    return this.page.locator(`text=${name}`).first().isVisible().catch(() => false);
  }
}
