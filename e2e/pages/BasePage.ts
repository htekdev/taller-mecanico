import type { Page, Locator } from '@playwright/test';

/**
 * BasePage — Abstract base class for all Page Objects.
 *
 * Provides shared utilities for navigation, waiting, form interaction,
 * and the visual assertion infrastructure.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Each page must define how to verify it's loaded. */
  abstract waitForPageLoad(): Promise<void>;

  /** Navigate to a path and wait for DOM content loaded. */
  protected async navigate(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Wait for a locator to be visible with configurable timeout. */
  protected async waitForVisible(locator: Locator, timeout = 10_000) {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /** Wait for a locator to be hidden/detached. */
  protected async waitForHidden(locator: Locator, timeout = 10_000) {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /** Fill an input field, clearing existing content first. */
  protected async fillInput(locator: Locator, value: string) {
    await locator.clear();
    await locator.fill(value);
  }

  /** Select option by value from a <select> element. */
  protected async selectByValue(locator: Locator, value: string) {
    await locator.selectOption(value);
  }

  /** Select option by index from a <select> element. */
  async selectByIndex(locator: Locator, index: number) {
    await locator.selectOption({ index });
  }

  /** Get the count of options in a <select>. */
  async getOptionCount(locator: Locator): Promise<number> {
    return locator.locator('option').count();
  }

  /** Wait for Supabase data to load (spinner hidden, content visible). */
  protected async waitForDataLoad(contentLocator: Locator, timeout = 15_000) {
    // Many modules show a loading state — wait for actual content
    await contentLocator.waitFor({ state: 'visible', timeout });
  }

  /** Click a button by its visible text. */
  protected async clickButton(text: string | RegExp) {
    await this.page.getByRole('button', { name: text }).click();
  }

  /** Get all visible text from a locator. */
  protected async getText(locator: Locator): Promise<string> {
    return (await locator.textContent()) ?? '';
  }

  /** Check if element is currently visible (non-waiting). */
  protected async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }
}
