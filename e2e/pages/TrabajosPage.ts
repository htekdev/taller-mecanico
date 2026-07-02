import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * TrabajosPage — Manages the trabajos (jobs/work orders) module.
 *
 * Covers: creating jobs (with/without parts), editing, finalizing,
 * search, PDF generation, payment recording.
 */
export class TrabajosPage extends BasePage {
  // ─── Section locators ──────────────────────────────────────────────────────
  readonly sectionTitle: Locator;
  readonly nuevoTrabajoButton: Locator;

  // ─── Form locators ─────────────────────────────────────────────────────────
  readonly clientSelect: Locator;
  readonly vehicleSelect: Locator;
  readonly descripcionInput: Locator;
  readonly fechaInput: Locator;
  readonly manoDeObraConceptoInput: Locator;
  readonly manoDeObraPrecioInput: Locator;
  readonly addManoDeObraButton: Locator;
  readonly saveButton: Locator;
  readonly finalizarButton: Locator;

  // ─── Parts section ─────────────────────────────────────────────────────────
  readonly addPartButton: Locator;
  readonly partSelect: Locator;
  readonly partQuantityInput: Locator;
  readonly partPriceInput: Locator;

  // ─── List / table ──────────────────────────────────────────────────────────
  readonly trabajosList: Locator;
  readonly searchInput: Locator;
  readonly filterSelect: Locator;

  // ─── Detail view ───────────────────────────────────────────────────────────
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
    this.descripcionInput = page.locator('textarea[placeholder*="descripción" i], input[placeholder*="descripción" i]').first();
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
    await this.sectionTitle.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /** Select a client for the new trabajo. */
  async selectClient(index = 1) {
    await this.page.waitForFunction(
      () => {
        const sel = document.querySelector('select');
        return sel && sel.options.length > 1;
      },
      { timeout: 15_000 }
    ).catch(() => {});
    const count = await this.getOptionCount(this.clientSelect);
    if (count > 1) {
      await this.selectByIndex(this.clientSelect, Math.min(index, count - 1));
      await this.page.waitForTimeout(1000);
    }
  }

  /** Select a vehicle. */
  async selectVehicle(index = 1) {
    if (await this.vehicleSelect.isVisible().catch(() => false)) {
      const count = await this.getOptionCount(this.vehicleSelect);
      if (count > 1) {
        await this.selectByIndex(this.vehicleSelect, Math.min(index, count - 1));
      }
    }
  }

  /** Fill description field. */
  async fillDescription(text: string) {
    if (await this.descripcionInput.isVisible().catch(() => false)) {
      await this.fillInput(this.descripcionInput, text);
    }
  }

  /** Add a mano de obra (labor) line. */
  async addLaborItem(concepto: string, precio: number) {
    // Fill concepto — placeholder: "Ej. Arreglo de frenos, engrase de pernos..."
    const conceptoInput = this.page.locator('input[placeholder*="Arreglo de frenos" i], input[placeholder*="Ej." i]').first();
    if (await conceptoInput.isVisible().catch(() => false)) {
      await conceptoInput.fill(concepto);
    }
    // Fill precio — the number input for price in the labor row
    const precioInput = this.page.locator('input[type="number"][placeholder="0.00"]').first();
    if (await precioInput.isVisible().catch(() => false)) {
      await precioInput.fill(String(precio));
    }
    // Click "+ Agregar" to add the labor item
    if (await this.addManoDeObraButton.isVisible().catch(() => false)) {
      const isDisabled = await this.addManoDeObraButton.isDisabled().catch(() => false);
      if (!isDisabled) {
        await this.addManoDeObraButton.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  /** Save the trabajo. */
  async save() {
    // Wait for button to be actionable (might be disabled until form valid)
    if (await this.saveButton.isVisible().catch(() => false)) {
      const isDisabled = await this.saveButton.isDisabled().catch(() => false);
      if (!isDisabled) {
        await this.saveButton.click();
        await this.page.waitForTimeout(2000);
      }
    }
  }

  /** Finalize a trabajo. */
  async finalizar() {
    await this.finalizarButton.click();
    await this.page.waitForTimeout(2000);
  }

  /** Get the count of trabajos in the list. */
  async getTrabajoCount(): Promise<number> {
    const items = this.page.locator('.border.rounded-xl:has(button:has-text("Editar")), [data-testid="trabajo-item"]');
    return items.count();
  }

  /** Get total displayed for a trabajo. */
  async getDisplayedTotal(): Promise<string> {
    const total = this.page.locator('text=/Total:.*\\$[\\d,.]+/').first();
    return this.getText(total);
  }

  /** Check if finalize was successful (estado changes to 'terminado'). */
  async wasFinalizarSuccessful(): Promise<boolean> {
    const badge = this.page.locator('text=/terminado|finalizado/i').first();
    return badge.isVisible().catch(() => false);
  }

  /** Check for error message after finalizar attempt. */
  async getFinalizarError(): Promise<string | null> {
    const error = this.page.locator('.bg-rose-50, .text-red-600, .border-rose-200').first();
    if (await error.isVisible().catch(() => false)) {
      return this.getText(error);
    }
    return null;
  }

  /** Search trabajos by query. */
  async search(query: string) {
    if (await this.searchInput.isVisible().catch(() => false)) {
      await this.fillInput(this.searchInput, query);
      await this.page.waitForTimeout(500);
    }
  }

  /** Filter trabajos by status. */
  async filterByStatus(status: string) {
    if (await this.filterSelect.isVisible().catch(() => false)) {
      await this.filterSelect.selectOption({ label: status });
      await this.page.waitForTimeout(500);
    }
  }

  /** Click edit on a specific trabajo (by index in list). */
  async clickEditOnTrabajo(index = 0) {
    const editButtons = this.page.getByRole('button', { name: /editar/i });
    const all = await editButtons.all();
    if (all.length > index) {
      await all[index].click();
      await this.page.waitForTimeout(1000);
    }
  }
}
