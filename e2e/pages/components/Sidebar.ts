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
    // Wait up to 180s for the nav button — cold-start Supabase can delay nav rendering 3+ min.
    // The catch swallows the timeout so force:true click below can still proceed.
    await btn.waitFor({ state: 'visible', timeout: 180_000 }).catch(() => {});
    // Wait for loading overlay to clear before clicking
    const loadingOverlay = this.page.locator('text=Cargando datos del taller');
    await loadingOverlay.waitFor({ state: 'hidden', timeout: 90_000 }).catch(() => {});
    // force:true bypasses overlay/actionability; 60s timeout handles element-not-yet-in-DOM case
    await btn.click({ force: true, timeout: 60_000 });
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
