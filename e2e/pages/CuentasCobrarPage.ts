import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * CuentasCobrarPage — Manages the "Por Cobrar" (accounts receivable) module.
 *
 * Covers: viewing pending payments, filtering by status, recording payments,
 * editing records, viewing payment history, PDF generation.
 */
export class CuentasCobrarPage extends BasePage {
  readonly sectionTitle: Locator;
  readonly filterSelect: Locator;
  readonly cuentasList: Locator;
  readonly registrarPagoButton: Locator;
  readonly pagoMontoInput: Locator;
  readonly pagoMetodoSelect: Locator;
  readonly pagoConfirmButton: Locator;
  readonly editButton: Locator;
  readonly pdfButton: Locator;
  readonly totalPendiente: Locator;

  constructor(page: Page) {
    super(page);
    this.sectionTitle = page.locator('h2:has-text("Cuentas por Cobrar"), h2:has-text("Por Cobrar")');
    this.filterSelect = page.locator('select:has(option:has-text("Pendiente"))').first();
    this.cuentasList = page.locator('.space-y-3, .divide-y').first();
    this.registrarPagoButton = page.getByRole('button', { name: /registrar pago|abonar/i }).first();
    this.pagoMontoInput = page.locator('input[type="number"][placeholder*="monto" i], input[type="number"]').first();
    this.pagoMetodoSelect = page.locator('select:has(option:has-text("Efectivo"))').first();
    this.pagoConfirmButton = page.getByRole('button', { name: /confirmar|guardar pago/i }).first();
    this.editButton = page.getByRole('button', { name: /editar/i }).first();
    this.pdfButton = page.getByRole('button', { name: /pdf|estado de cuenta/i }).first();
    this.totalPendiente = page.locator('text=/Saldo.*\\$[\\d,.]+/').first();
  }

  async waitForPageLoad() {
    // guardarTrabajo triggers a full 8-table cargarDatos() reload which can take
    // 2+ minutes on a cold Vercel preview — wait long enough for it to complete.
    const loadingOverlay = this.page.locator('text=Cargando datos del taller');
    await loadingOverlay.waitFor({ state: 'hidden', timeout: 90_000 }).catch(() => {});
    // Once overlay is gone, section title should appear immediately.
    await this.sectionTitle.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async filterByStatus(status: 'Pendiente' | 'Parcial' | 'Pagado' | 'Todos') {
    if (await this.filterSelect.isVisible().catch(() => false)) {
      await this.filterSelect.selectOption({ label: status });
      await this.page.waitForTimeout(500);
    }
  }

  async getAccountCount(): Promise<number> {
    const items = this.page.locator('.border.rounded-xl:has(button), [data-testid="cuenta-item"]');
    return items.count();
  }

  async registerPayment(monto: number, metodo: 'Efectivo' | 'Transferencia' | 'Tarjeta' = 'Efectivo') {
    await this.registrarPagoButton.click();
    await this.page.waitForTimeout(500);

    if (await this.pagoMontoInput.isVisible().catch(() => false)) {
      await this.fillInput(this.pagoMontoInput, String(monto));
    }

    if (await this.pagoMetodoSelect.isVisible().catch(() => false)) {
      await this.pagoMetodoSelect.selectOption({ label: metodo });
    }

    await this.pagoConfirmButton.click();
    await this.page.waitForTimeout(2000);
  }

  async hasClientAccount(clientName: string): Promise<boolean> {
    return this.page.locator(`text=${clientName}`).first().isVisible().catch(() => false);
  }

  async getFirstAccountBalance(): Promise<string> {
    return this.getText(this.totalPendiente);
  }

  async getFirstAccountStatus(): Promise<string> {
    const badge = this.page.locator('.rounded-full:has-text("Pendiente"), .rounded-full:has-text("Parcial"), .rounded-full:has-text("Pagado")').first();
    return this.getText(badge);
  }
}
