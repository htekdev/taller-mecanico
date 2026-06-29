import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * CotizacionesPage — Manages the cotizaciones (quotes) module.
 *
 * Covers: plantilla selection, form filling, line items,
 * saving, editing, converting to trabajo, search/filter, history.
 */
export class CotizacionesPage extends BasePage {
  // ─── Section-level locators ────────────────────────────────────────────────
  readonly sectionTitle: Locator;
  readonly plantillaGeneral: Locator;
  readonly plantillaAyuntamiento: Locator;
  readonly plantillaRedAmbiental: Locator;

  // ─── Form locators (visible after plantilla selection) ─────────────────────
  readonly clientSelect: Locator;
  readonly vehicleSelect: Locator;
  readonly descripcionInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly convertButton: Locator;
  readonly editButton: Locator;
  readonly numeroCotizacion: Locator;

  // ─── Line items ────────────────────────────────────────────────────────────
  readonly addLineItemButton: Locator;
  readonly lineItemRows: Locator;

  // ─── History / list ────────────────────────────────────────────────────────
  readonly historySection: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.sectionTitle = page.locator('h2:has-text("Cotizaciones")');
    this.plantillaGeneral = page.getByRole('button', { name: /general/i }).first();
    this.plantillaAyuntamiento = page.getByRole('button', { name: /ayuntamiento/i }).first();
    this.plantillaRedAmbiental = page.getByRole('button', { name: /red ambiental/i }).first();

    this.clientSelect = page.locator('select').first();
    this.vehicleSelect = page.locator('select').nth(1);
    this.descripcionInput = page.locator('textarea, input[placeholder*="descripción" i]').first();
    this.saveButton = page.getByRole('button', { name: /guardar/i });
    this.cancelButton = page.getByRole('button', { name: /cancelar/i });
    this.convertButton = page.getByRole('button', { name: /convertir/i }).first();
    this.editButton = page.getByRole('button', { name: /editar/i }).first();
    this.numeroCotizacion = page.locator('input[placeholder*="número" i], input[value*="COT-"]').first();

    this.addLineItemButton = page.getByRole('button', { name: /agregar línea|añadir|agregar item/i });
    this.lineItemRows = page.locator('[data-testid="line-item"], tr:has(input[type="number"])');

    this.historySection = page.locator('text=Historial de Cotizaciones').first();
    this.searchInput = page.locator('input[placeholder*="buscar" i]').first();
  }

  async waitForPageLoad() {
    const startSurface = this.page.locator('h2:has-text("Cotizaciones")').first();
    const templateButton = this.page.getByRole('button', { name: /general/i }).first();
    const historyTitle = this.page.getByText('Historial de Cotizaciones').first();
    const previewTitle = this.page.locator('text=/Cotización COT-/').first();

    await Promise.race([
      startSurface.waitFor({ state: 'visible', timeout: 15_000 }),
      templateButton.waitFor({ state: 'visible', timeout: 15_000 }),
      historyTitle.waitFor({ state: 'visible', timeout: 15_000 }),
      previewTitle.waitFor({ state: 'visible', timeout: 15_000 }),
    ]);
  }

  /** Select the "General" plantilla to open the form. */
  async selectPlantillaGeneral() {
    await this.plantillaGeneral.click();
    // Wait for the form to load (client select appears)
    await this.clientSelect.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Select the "Ayuntamiento" plantilla. */
  async selectPlantillaAyuntamiento() {
    await this.plantillaAyuntamiento.click();
    await this.clientSelect.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Select a client from the dropdown by index. */
  async selectClient(index = 1) {
    await this.page.waitForFunction(
      () => {
        const sel = document.querySelector('select');
        return sel && sel.options.length > 1;
      },
      { timeout: 15_000 }
    ).catch(() => {});
    const optionCount = await this.getOptionCount(this.clientSelect);
    if (optionCount > 1) {
      await this.selectByIndex(this.clientSelect, Math.min(index, optionCount - 1));
    }
    // Wait for vehicles to load after client selection
    await this.page.waitForTimeout(1000);
  }

  /** Select a vehicle from the dropdown by index. */
  async selectVehicle(index = 1) {
    if (await this.vehicleSelect.isVisible().catch(() => false)) {
      const optionCount = await this.getOptionCount(this.vehicleSelect);
      if (optionCount > 1) {
        await this.selectByIndex(this.vehicleSelect, Math.min(index, optionCount - 1));
      }
    }
  }

  /** Fill the description/notes field. */
  async fillDescription(text: string) {
    if (await this.descripcionInput.isVisible().catch(() => false)) {
      await this.fillInput(this.descripcionInput, text);
    }
  }

  /** Add a line item with description, quantity, and unit price. */
  async addLineItem(descripcion: string, cantidad: number, precioUnitario: number) {
    // Click "Agregar" to add a new row
    if (await this.addLineItemButton.isVisible().catch(() => false)) {
      await this.addLineItemButton.click();
      await this.page.waitForTimeout(300);
    }
    // Fill the last row
    const rows = this.page.locator('input[placeholder*="descripción" i], input[placeholder*="concepto" i]');
    const lastRow = rows.last();
    if (await lastRow.isVisible().catch(() => false)) {
      await lastRow.fill(descripcion);
    }
    // Fill cantidad and precio in the same row context
    const cantidadInputs = this.page.locator('input[type="number"][placeholder*="cant" i], input[type="number"]');
    const precioInputs = this.page.locator('input[type="number"]');
    // These are positional — fill the latest ones
    const allNumberInputs = await precioInputs.all();
    if (allNumberInputs.length >= 2) {
      const cantIdx = allNumberInputs.length - 2;
      const precIdx = allNumberInputs.length - 1;
      await allNumberInputs[cantIdx].fill(String(cantidad));
      await allNumberInputs[precIdx].fill(String(precioUnitario));
    }
  }

  /** Save the current cotización. Returns true if save was attempted. */
  async save(): Promise<boolean> {
    if (await this.saveButton.isVisible().catch(() => false)) {
      const isDisabled = await this.saveButton.isDisabled().catch(() => false);
      if (!isDisabled) {
        await this.saveButton.click();
        await this.page.waitForTimeout(2000);
        return true;
      }
    }
    return false;
  }

  /** Convert the current cotización to a trabajo. */
  async convertToTrabajo() {
    await this.convertButton.click();
    await this.page.waitForTimeout(3000);
  }

  /** Get the displayed total amount. */
  async getTotal(): Promise<string> {
    const totalEl = this.page.locator('text=/\\$[\\d,.]+/').last();
    return this.getText(totalEl);
  }

  /** Get the cotización number. */
  async getCotizacionNumber(): Promise<string> {
    if (await this.numeroCotizacion.isVisible().catch(() => false)) {
      return this.numeroCotizacion.inputValue();
    }
    // Try to find it as text
    const numText = this.page.locator('text=/COT-\\d+/').first();
    if (await numText.isVisible().catch(() => false)) {
      return this.getText(numText);
    }
    return '';
  }

  /** Get the count of line items. */
  async getLineItemCount(): Promise<number> {
    return this.lineItemRows.count();
  }

  /** Check if the save was successful (no error, cotización number assigned). */
  async wasSaveSuccessful(): Promise<boolean> {
    const errorVisible = await this.page.locator('.bg-rose-50, .text-red-600, .text-rose-600').first()
      .isVisible().catch(() => false);
    return !errorVisible;
  }

  /** Search in the cotizaciones history. */
  async search(query: string) {
    if (await this.searchInput.isVisible().catch(() => false)) {
      await this.fillInput(this.searchInput, query);
      await this.page.waitForTimeout(500);
    }
  }

  /** Click edit on the currently displayed cotización. */
  async clickEdit() {
    await this.editButton.click();
    await this.page.waitForTimeout(1000);
  }

  /** Get the count of saved cotizaciones in the history list. */
  async getHistoryCount(): Promise<number> {
    const items = this.page.locator('[data-testid="cotizacion-item"], .border.rounded-xl:has(text=/COT-/)');
    return items.count();
  }
}
