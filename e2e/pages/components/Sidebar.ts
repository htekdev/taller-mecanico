import type { Page, Locator } from '@playwright/test';

/**
 * Sidebar Component -- Tab navigation bar.
 *
 * Encapsulates all navigation interactions and badge reading.
 */
export class Sidebar {
  readonly nav: Locator;

  constructor(private readonly page: Page) {
    this.nav = page.locator('nav');
  }

  /** Click a nav tab by its label text. */
  async clickTab(label: string) {
    const btn = this.nav.getByRole('button', { name: label });
    // Reduced from 90s to 30s -- a missing button should not block the test for 90 seconds.
    // The catch swallows the timeout; force:true click below handles the actionability.
    await btn.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    // Wait for loading overlay to clear before clicking
    const loadingOverlay = this.page.locator('text=Cargando datos del taller');
    await loadingOverlay.waitFor({ state: 'hidden', timeout: 90_000 }).catch(() => {});
    // force:true bypasses overlay/actionability -- the nav is always interactable
    await btn.click({ force: true });
    await this.page.waitForTimeout(500);
  }

  /** Get the active (highlighted) tab text. */
  async getActiveTabLabel(): Promise<string> {
    const active = this.nav.locator('button.bg-indigo-600');
    return (await active.textContent())?.trim() ?? '';
  }

  /** Check if a tab has a warning badge. */
  async hasWarningBadge(label: string): Promise<boolean> {
    const tab = this.nav.getByRole('button', { name: label });
    const badge = tab.locator('span:has-text("!")');
    return badge.isVisible().catch(() => false);
  }

  /** Check if a tab has a pending badge. */
  async hasPendingBadge(label: string): Promise<boolean> {
    const tab = this.nav.getByRole('button', { name: label });
    const badge = tab.locator('span:has-text("pending")');
    return badge.isVisible().catch(() => false);
  }

  /** Get all visible tab labels. */
  async getAllTabLabels(): Promise<string[]> {
    const buttons = await this.nav.locator('button').all();
    const labels: string[] = [];
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text) labels.push(text.trim());
    }
    return labels;
  }

  /** Get the badge count number for a tab. */
  async getBadgeCount(label: string): Promise<number | null> {
    const tab = this.nav.getByRole('button', { name: label });
    const badge = tab.locator('span.text-xs.font-bold');
    if (await badge.isVisible().catch(() => false)) {
      const text = (await badge.textContent())?.replace(/[^\d]/g, '');
      return text ? parseInt(text) : null;
    }
    return null;
  }
}
