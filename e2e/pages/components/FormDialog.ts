import type { Page, Locator } from '@playwright/test';

/**
 * FormDialog Component — Modal/dialog form interactions.
 *
 * Handles modal overlays that appear for editing, confirming,
 * or viewing details.
 */
export class FormDialog {
  private readonly overlay: Locator;
  private readonly content: Locator;

  constructor(private readonly page: Page) {
    // Modals typically use fixed/absolute overlay patterns
    this.overlay = page.locator('.fixed.inset-0, [role="dialog"], .modal-overlay').first();
    this.content = page.locator('.fixed .bg-white, [role="dialog"] .bg-white, .modal-content').first();
  }

  /** Check if a dialog/modal is currently visible. */
  async isOpen(): Promise<boolean> {
    return this.overlay.isVisible().catch(() => false);
  }

  /** Wait for the dialog to appear. */
  async waitForOpen(timeout = 5_000) {
    await this.overlay.waitFor({ state: 'visible', timeout });
  }

  /** Wait for the dialog to close. */
  async waitForClose(timeout = 5_000) {
    await this.overlay.waitFor({ state: 'hidden', timeout });
  }

  /** Click the primary action button (Guardar, Confirmar, etc.). */
  async confirm() {
    const btn = this.content.getByRole('button', { name: /guardar|confirmar|aceptar/i }).first();
    await btn.click();
    await this.page.waitForTimeout(1000);
  }

  /** Click the cancel/close button. */
  async cancel() {
    const btn = this.content.getByRole('button', { name: /cancelar|cerrar/i }).first();
    await btn.click();
    await this.page.waitForTimeout(500);
  }

  /** Fill an input within the dialog by placeholder. */
  async fillInput(placeholder: string, value: string) {
    const input = this.content.locator(`input[placeholder*="${placeholder}" i]`).first();
    await input.clear();
    await input.fill(value);
  }

  /** Select option in a select within the dialog. */
  async selectOption(selectIndex: number, optionIndex: number) {
    const select = this.content.locator('select').nth(selectIndex);
    await select.selectOption({ index: optionIndex });
  }

  /** Get text content of the dialog. */
  async getText(): Promise<string> {
    return (await this.content.textContent()) ?? '';
  }

  /** Check if an error message is displayed in the dialog. */
  async hasError(): Promise<boolean> {
    return this.content.locator('.text-red-600, .text-rose-600, .bg-rose-50').first()
      .isVisible().catch(() => false);
  }

  /** Get the error message text. */
  async getErrorText(): Promise<string> {
    const error = this.content.locator('.text-red-600, .text-rose-600, .bg-rose-50').first();
    return (await error.textContent()) ?? '';
  }
}
