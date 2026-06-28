import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * GastosPage — Manages the expenses (Gastos) module.
 *
 * Covers: adding expenses with categories/subcategories,
 * filtering, editing, monthly totals.
 */
export class GastosPage extends BasePage {
  readonly sectionTitle: Locator;
  readonly categoriaSelect: Locator;
  readonly subcategoriaSelect: Locator;
  readonly conceptoInput: Locator;
  readonly montoInput: Locator;
  readonly fechaInput: Locator;
  readonly notasInput: Locator;
  readonly guardarButton: Locator;
  readonly cancelarButton: Locator;
  readonly nuevoGastoButton: Locator;
  readonly filtroCategoriaSelect: Locator;
  readonly gastosList: Locator;
  readonly totalMensual: Locator;

  constructor(page: Page) {
    super(page);
    this.sectionTitle = page.locator('h2:has-text("Gastos")');
    this.categoriaSelect = page.locator('select').first();
    this.subcategoriaSelect = page.locator('select').nth(1);
    // Concepto input is after "Concepto" label — use nth input (not type=number, not type=date)
    this.conceptoInput = page.locator('input:not([type="number"]):not([type="date"]):not([type="hidden"])').nth(1);
    this.montoInput = page.locator('input[type="number"]').first();
    this.fechaInput = page.locator('input[type="date"]').first();
    this.notasInput = page.locator('input[placeholder*="Referencia" i], input[placeholder*="notas" i]').first();
    this.guardarButton = page.getByRole('button', { name: /guardar/i });
    this.cancelarButton = page.getByRole('button', { name: /cancelar/i });
    this.nuevoGastoButton = page.getByRole('button', { name: /nuevo gasto|agregar primer gasto/i }).first();
    this.filtroCategoriaSelect = page.locator('select:has(option:has-text("Todos"))').first();
    this.gastosList = page.locator('.space-y-2, .divide-y').first();
    this.totalMensual = page.locator('text=/Total.*\\$[\\d,.]+/').first();
  }

  async waitForPageLoad() {
    await this.sectionTitle.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Add a new expense. */
  async addExpense(data: {
    categoria?: string;
    concepto: string;
    monto: number;
    fecha?: string;
    notas?: string;
  }) {
    // If there's a "Nuevo Gasto" button, click it first
    if (await this.nuevoGastoButton.isVisible().catch(() => false)) {
      await this.nuevoGastoButton.click();
      await this.page.waitForTimeout(500);
    }

    if (data.categoria && await this.categoriaSelect.isVisible().catch(() => false)) {
      // Category options have value=key (e.g., 'operativo') and label='🏠 Operativos'
      await this.categoriaSelect.selectOption({ value: data.categoria });
      await this.page.waitForTimeout(300);
    }

    if (await this.conceptoInput.isVisible().catch(() => false)) {
      await this.fillInput(this.conceptoInput, data.concepto);
    }

    if (await this.montoInput.isVisible().catch(() => false)) {
      await this.fillInput(this.montoInput, String(data.monto));
    }

    if (data.fecha && await this.fechaInput.isVisible().catch(() => false)) {
      await this.fillInput(this.fechaInput, data.fecha);
    }

    if (data.notas && await this.notasInput.isVisible().catch(() => false)) {
      await this.fillInput(this.notasInput, data.notas);
    }

    await this.guardarButton.click();
    await this.page.waitForTimeout(2000);
  }

  /** Filter gastos by category. */
  async filterByCategoria(categoria: string) {
    if (await this.filtroCategoriaSelect.isVisible().catch(() => false)) {
      await this.filtroCategoriaSelect.selectOption({ label: categoria });
      await this.page.waitForTimeout(500);
    }
  }

  /** Get count of visible expenses. */
  async getExpenseCount(): Promise<number> {
    const items = this.page.locator('.border.rounded-lg:has(text=/\\$/), .border.rounded-xl:has(text=/\\$/), [data-testid="gasto-item"]');
    return items.count();
  }

  /** Get the monthly total text. */
  async getMonthlyTotal(): Promise<string> {
    return this.getText(this.totalMensual);
  }

  /** Check if module loaded successfully (no errors). */
  async isModuleHealthy(): Promise<boolean> {
    const errorVisible = await this.page.locator('.bg-rose-50, .text-red-600').first()
      .isVisible().catch(() => false);
    const titleVisible = await this.sectionTitle.isVisible().catch(() => false);
    return titleVisible && !errorVisible;
  }
}
