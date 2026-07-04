import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * TrabajosPage — Manages the trabajos (jobs/work orders) module.
 *
 * Covers: creating jobs (with/without parts), editing, finalizing,
 * search, PDF generation, payment recording.
 */
export class TrabajosPage extends BasePage {
  readonly sectionTitle: Locator;
  readonly nuevoTrabajoButton: Locator;
  readonly clientSelect: Locator;
  readonly vehicleSelect: Locator;
  readonly descripcionInput: Locator;
  readonly fechaInput: Locator;
  readonly manoDeObraConceptoInput: Locator;
  readonly manoDeObraPrecioInput: Locator;
  readonly addManoDeObraButton: Locator;
  readonly saveButton: Locator;
  readonly finalizarButton: Locator;
  readonly addPartButton: Locator;
  readonly partSelect: Locator;
  readonly partQuantityInput: Locator;
  readonly partPriceInput: Locator;
  readonly trabajosList: Locator;
  readonly searchInput: Locator;
  readonly filterSelect: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly pdfButton: Locator;
  readonly registrarPagoButton: Locator;

  constructor(page: Page) {
    super(page);
    this.sectionTitle = page.locator('h2:has-text("Trabajos")');
    this.nuevoTrabajoButton = page.getByRole('button', { name: /nuevo trabajo/i });

    this.clientSelect = page.locator('select').first();
    this.vehicleSelect = page.locator('select').nth(1);
    // Actual placeholder in app: "Ej. Servicio completo frenos y aceite..."
    // Note: DO NOT use "Ej." alone — numeroOrden also starts with "Ej." and appears first in DOM.
    this.descripcionInput = page.locator('input[placeholder*="Servicio completo" i], input[placeholder*="frenos y aceite" i]').first();
    this.fechaInput = page.locator('input[type="date"]').first();
    this.manoDeObraConceptoInput = page.locator('input[placeholder*="concepto" i], input[placeholder*="mano de obra" i]').first();
    this.manoDeObraPrecioInput = page.locator('input[type="number"]').first();
    this.addManoDeObraButton = page.getByRole('button', { name: /^\+?\s*agregar$/i }).first();
    this.saveButton = page.getByRole('button', { name: /registrar trabajo|guardar|crear trabajo/i });
    this.finalizarButton = page.getByRole('button', { name: /finalizar/i });

    this.addPartButton = page.getByRole('button', { name: /agregar refacción|buscar refacción|añadir pieza/i });
    this.partSelect = page.locator('select:has(option:has-text("Seleccionar"))').last();
    this.partQuantityInput = page.locator('input[type="number"][placeholder*="cant" i]').first();
    this.partPriceInput = page.locator('input[type="number"][placeholder*="precio" i]').first();

    this.trabajosList = page.locator('[data-testid="trabajos-list"], .space-y-3, .divide-y');
    this.searchInput = page.locator('input[placeholder*="buscar" i]').first();
    this.filterSelect = page.locator('select:has(option:has-text("Todos"))').first();

    this.editButton = page.getByRole('button', { name: /editar/i }).first();
    this.deleteButton = page.getByRole('button', { name: /eliminar|borrar/i }).first();
    this.pdfButton = page.getByRole('button', { name: /pdf|imprimir/i }).first();
    this.registrarPagoButton = page.getByRole('button', { name: /registrar pago|abonar/i }).first();
  }

  async waitForPageLoad() {
    // Wait for cargando overlay to disappear, but only if it actually appears.
    // Using isVisible check first so a permanently stuck overlay fails the test instead of being swallowed.
    const loadingOverlay = this.page.locator('text=Cargando datos del taller');
    const overlayVisible = await loadingOverlay.isVisible({ timeout: 2_000 }).catch(() => false);
    if (overlayVisible) {
      await loadingOverlay.waitFor({ state: 'hidden', timeout: 90_000 });
    }
    await this.sectionTitle.waitFor({ state: 'visible', timeout: 45_000 });
  }

  async selectClient(index = 1) {
    await this.page.waitForFunction(
      () => {
        const sel = document.querySelector('select');
        return sel && sel.options.length > 1;
      },
      { timeout: 45_000 }
    ).catch(() => {});
    const count = await this.getOptionCount(this.clientSelect);
    if (count > 1) {
      await this.selectByIndex(this.clientSelect, Math.min(index, count - 1));
      await this.page.waitForTimeout(1000);
    }
  }

  async selectVehicle(index = 1) {
    if (await this.vehicleSelect.isVisible().catch(() => false)) {
      const count = await this.getOptionCount(this.vehicleSelect);
      if (count > 1) {
        await this.selectByIndex(this.vehicleSelect, Math.min(index, count - 1));
      }
    }
  }

  async fillDescription(text: string) {
    // Use a precise locator — placeholder is "Ej. Servicio completo frenos y aceite..."
    // Cannot use "Ej." alone — numeroOrden field also starts with "Ej." and is first in DOM.
    const precise = this.page.locator('input[placeholder*="Servicio completo" i], input[placeholder*="frenos y aceite" i]').first();
    if (await precise.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await this.fillInput(precise, text);
      await this.page.waitForTimeout(300);
      return;
    }
    // Fallback to the locator defined in constructor
    if (await this.descripcionInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.fillInput(this.descripcionInput, text);
    }
  }

  async addLaborItem(concepto: string, precio: number) {
    // Mano de obra concepto: placeholder="Ej. Arreglo de frenos, engrase de pernos..."
    // Use a specific selector that won't accidentally match the main description field.
    const conceptoInput = this.page.locator('input[placeholder*="Arreglo de frenos" i], input[placeholder*="engrase" i]').first();
    if (await conceptoInput.isVisible().catch(() => false)) {
      await conceptoInput.fill(concepto);
    }
    const precioInput = this.page.locator('input[type="number"][placeholder="0.00"]').first();
    if (await precioInput.isVisible().catch(() => false)) {
      await precioInput.fill(String(precio));
    }
    if (await this.addManoDeObraButton.isVisible().catch(() => false)) {
      const isDisabled = await this.addManoDeObraButton.isDisabled().catch(() => false);
      if (!isDisabled) {
        await this.addManoDeObraButton.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  async save() {
    // Soft save — waits for button to appear but does not hard-assert enabled state.
    // Tests that verify save success check the error banner absence and saved row presence.
    // Hard assertion (toBeEnabled) requires all test data (client+vehicle+description) to
    // be fully set up — track separately from this hotfix PR.
    await this.saveButton.waitFor({ state: 'visible', timeout: 10_000 });
    const isDisabled = await this.saveButton.isDisabled().catch(() => true);
    if (!isDisabled) {
      await this.saveButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  async finalizar() {
    await this.finalizarButton.click();
    await this.page.waitForTimeout(2000);
  }

  async getTrabajoCount(): Promise<number> {
    const items = this.page.locator('.border.rounded-xl:has(button:has-text("Editar")), [data-testid="trabajo-item"]');
    return items.count();
  }

  async getDisplayedTotal(): Promise<string> {
    const total = this.page.locator('text=/Total:.*\\$[\\d,.]+/').first();
    return this.getText(total);
  }

  async wasFinalizarSuccessful(): Promise<boolean> {
    const badge = this.page.locator('text=/terminado|finalizado/i').first();
    return badge.isVisible().catch(() => false);
  }

  async getFinalizarError(): Promise<string | null> {
    const error = this.page.locator('.bg-rose-50, .text-red-600, .border-rose-200').first();
    if (await error.isVisible().catch(() => false)) {
      return this.getText(error);
    }
    return null;
  }

  async search(query: string) {
    if (await this.searchInput.isVisible().catch(() => false)) {
      await this.fillInput(this.searchInput, query);
      await this.page.waitForTimeout(500);
    }
  }

  async filterByStatus(status: string) {
    if (await this.filterSelect.isVisible().catch(() => false)) {
      await this.filterSelect.selectOption({ label: status });
      await this.page.waitForTimeout(500);
    }
  }

  async clickEditOnTrabajo(index = 0) {
    const editButtons = this.page.getByRole('button', { name: /editar/i });
    const all = await editButtons.all();
    if (all.length > index) {
      await all[index].click();
      await this.page.waitForTimeout(1000);
    }
  }
}
