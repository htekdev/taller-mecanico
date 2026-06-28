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
    this.sectionTitle = page.locator('h2:has-text("Órdenes de Compra")');
    this.crearOrdenButton = page.getByRole('button', { name: /nueva orden|crear orden/i });

    this.proveedorSelect = page.locator('select:has(option:has-text("Proveedor"))').first();
    this.descripcionInput = page.locator('input[placeholder*="descripción" i], textarea').first();
    this.numeroOrdenInput = page.locator('input[placeholder*="número" i], input[placeholder*="orden" i]').first();
    this.conIVACheckbox = page.locator('input[type="checkbox"]').first();
    this.addItemButton = page.getByRole('button', { name: /agregar refacción|agregar item|añadir/i }).first();
    this.refaccionSelect = page.locator('select:has(option:has-text("Seleccionar refacción"))').first();
    this.cantidadInput = page.locator('input[type="number"][placeholder*="cant" i]').first();
    this.precioInput = page.locator('input[type="number"][placeholder*="precio" i]').first();
    this.saveButton = page.getByRole('button', { name: /guardar|crear/i });

    this.ordenesList = page.locator('.space-y-3, .divide-y').first();
    this.filterSelect = page.locator('select:has(option:has-text("Todas"))').first();

    this.recibirButton = page.getByRole('button', { name: /recibir|marcar recibida/i }).first();
    this.editarButton = page.getByRole('button', { name: /editar/i }).first();
    this.eliminarButton = page.getByRole('button', { name: /eliminar/i }).first();
  }

  async waitForPageLoad() {
    await this.sectionTitle.waitFor({ state: 'visible', timeout: 15_000 });
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
    if (await this.addItemButton.isVisible().catch(() => false)) {
      await this.addItemButton.click();
      await this.page.waitForTimeout(500);
    }

    if (await this.refaccionSelect.isVisible().catch(() => false)) {
      const count = await this.getOptionCount(this.refaccionSelect);
      if (count > 1) {
        await this.selectByIndex(this.refaccionSelect, Math.min(refIndex, count - 1));
      }
    }

    if (await this.cantidadInput.isVisible().catch(() => false)) {
      await this.fillInput(this.cantidadInput, String(cantidad));
    }
    if (await this.precioInput.isVisible().catch(() => false)) {
      await this.fillInput(this.precioInput, String(precio));
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
    await this.saveButton.click();
    await this.page.waitForTimeout(2000);
  }

  /** Mark an order as received. */
  async markAsReceived() {
    await this.recibirButton.click();
    await this.page.waitForTimeout(2000);
  }

  /** Click edit on the first order. */
  async clickEdit() {
    await this.editarButton.click();
    await this.page.waitForTimeout(1000);
  }

  /** Get the count of orders in the list. */
  async getOrderCount(): Promise<number> {
    const items = this.page.locator('.border.rounded-xl:has(text=/OC-|Orden/), [data-testid="orden-item"]');
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
