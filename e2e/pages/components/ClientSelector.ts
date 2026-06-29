import type { Page, Locator } from '@playwright/test';

/**
 * ClientSelector Component — Client/Vehicle selection pattern.
 *
 * Used in cotizaciones and trabajos forms for selecting
 * existing clients and their vehicles.
 */
export class ClientSelector {
  readonly clientSelect: Locator;
  readonly vehicleSelect: Locator;
  readonly newClientButton: Locator;

  constructor(private readonly page: Page) {
    this.clientSelect = page.locator('select').first();
    this.vehicleSelect = page.locator('select').nth(1);
    this.newClientButton = page.getByRole('button', { name: /nuevo cliente|agregar cliente/i });
  }

  /** Wait for clients to load in the select. */
  async waitForClientsLoaded(timeout = 15_000) {
    await this.page.waitForFunction(
      () => {
        const sel = document.querySelector('select');
        return sel && sel.options.length > 1;
      },
      { timeout }
    ).catch(() => {});
  }

  /** Select a client by index. */
  async selectClient(index = 1) {
    await this.waitForClientsLoaded();
    const count = await this.clientSelect.locator('option').count();
    if (count > 1) {
      await this.clientSelect.selectOption({ index: Math.min(index, count - 1) });
      await this.page.waitForTimeout(1000);
    }
  }

  /** Select a vehicle by index (after client is selected). */
  async selectVehicle(index = 1) {
    if (await this.vehicleSelect.isVisible().catch(() => false)) {
      const count = await this.vehicleSelect.locator('option').count();
      if (count > 1) {
        await this.vehicleSelect.selectOption({ index: Math.min(index, count - 1) });
      }
    }
  }

  /** Get the selected client name. */
  async getSelectedClientName(): Promise<string> {
    const selectedOption = this.clientSelect.locator('option:checked');
    return (await selectedOption.textContent()) ?? '';
  }

  /** Get the selected vehicle label. */
  async getSelectedVehicleName(): Promise<string> {
    if (await this.vehicleSelect.isVisible().catch(() => false)) {
      const selectedOption = this.vehicleSelect.locator('option:checked');
      return (await selectedOption.textContent()) ?? '';
    }
    return '';
  }

  /** Get the count of available clients. */
  async getClientCount(): Promise<number> {
    const count = await this.clientSelect.locator('option').count();
    return count - 1; // minus the placeholder
  }

  /** Get the count of available vehicles (after client selected). */
  async getVehicleCount(): Promise<number> {
    if (await this.vehicleSelect.isVisible().catch(() => false)) {
      const count = await this.vehicleSelect.locator('option').count();
      return count - 1;
    }
    return 0;
  }
}
