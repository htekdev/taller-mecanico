import type { Page, Locator } from '@playwright/test';

/**
 * DataTable Component — Reusable table/list interaction patterns.
 *
 * Many modules render data in card-based lists or tables.
 * This component provides generic interactions for those patterns.
 */
export class DataTable {
  private readonly container: Locator;

  constructor(private readonly page: Page, containerSelector?: string) {
    this.container = containerSelector
      ? page.locator(containerSelector)
      : page.locator('.space-y-3, .space-y-2, .divide-y').first();
  }

  /** Get the count of visible rows/cards. */
  async getRowCount(): Promise<number> {
    const rows = this.container.locator('.border.rounded-xl, .border.rounded-lg, tr');
    return rows.count();
  }

  /** Check if the table/list is empty. */
  async isEmpty(): Promise<boolean> {
    const count = await this.getRowCount();
    return count === 0;
  }

  /** Click on a row/card containing specific text. */
  async clickRowWithText(text: string) {
    const row = this.container.locator(`:has-text("${text}")`).first();
    await row.click();
    await this.page.waitForTimeout(500);
  }

  /** Check if a specific text exists in the table. */
  async containsText(text: string): Promise<boolean> {
    return this.container.locator(`text=${text}`).first().isVisible().catch(() => false);
  }

  /** Get all visible text content from the table. */
  async getAllText(): Promise<string> {
    return (await this.container.textContent()) ?? '';
  }

  /** Get the Nth row/card element. */
  getRow(index: number): Locator {
    return this.container.locator('.border.rounded-xl, .border.rounded-lg, tr').nth(index);
  }
}
