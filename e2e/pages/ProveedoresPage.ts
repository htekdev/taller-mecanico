import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * ProveedoresPage — Manages the suppliers (Proveedores) module.
 *
 * Covers: viewing suppliers, adding new suppliers.
 */
export class ProveedoresPage extends BasePage {
  readonly sectionTitle: Locator;
  readonly nombreInput: Locator;
  readonly contactoInput: Locator;
  readonly telefonoInput: Locator;
  readonly emailInput: Locator;
  readonly agregarButton: Locator;
  readonly proveedoresList: Locator;

  constructor(page: Page) {
    super(page);
    this.sectionTitle = page.locator('h2:has-text("Proveedores")');
    this.nombreInput = page.locator('input[placeholder*="Refacciones" i], input[placeholder*="nombre" i]').first();
    this.contactoInput = page.locator('input[placeholder*="vendedor" i], input[placeholder*="contacto" i]').first();
    this.telefonoInput = page.locator('input[type="tel"]').first();
    this.emailInput = page.locator('input[type="email"], input[placeholder*="correo" i]').first();
    this.agregarButton = page.getByRole('button', { name: /agregar proveedor/i });
    this.proveedoresList = page.locator('.space-y-2, .divide-y, .grid').first();
  }

  async waitForPageLoad() {
    await this.sectionTitle.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Add a new proveedor. */
  async addProveedor(data: { nombre: string; contacto?: string; telefono?: string; email?: string }) {
    await this.fillInput(this.nombreInput, data.nombre);
    if (data.contacto && await this.contactoInput.isVisible().catch(() => false)) {
      await this.fillInput(this.contactoInput, data.contacto);
    }
    if (data.telefono && await this.telefonoInput.isVisible().catch(() => false)) {
      await this.fillInput(this.telefonoInput, data.telefono);
    }
    if (data.email && await this.emailInput.isVisible().catch(() => false)) {
      await this.fillInput(this.emailInput, data.email);
    }
    if (await this.agregarButton.isVisible().catch(() => false)) {
      const isDisabled = await this.agregarButton.isDisabled().catch(() => false);
      if (!isDisabled) {
        await this.agregarButton.click();
        await this.page.waitForTimeout(2000);
      }
    }
  }

  /** Get count of proveedores in the list. */
  async getProveedorCount(): Promise<number> {
    const rows = this.page.locator('tbody tr');
    const rowCount = await rows.count().catch(() => 0);
    if (rowCount > 0) return rowCount;

    const options = await this.page.locator('select').last().locator('option').count().catch(() => 0);
    return Math.max(0, options - 1);
  }

  /** Check if a proveedor is visible. */
  async isProveedorVisible(name: string): Promise<boolean> {
    const row = this.page.locator('tbody tr').filter({ hasText: name }).first();
    if (await row.isVisible().catch(() => false)) return true;

    const option = this.page.locator('option').filter({ hasText: name }).first();
    return option.isVisible().catch(() => false);
  }
}
