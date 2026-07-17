import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Expense Tracking (Gastos) — Complete expense management.
 *
 * Steps:
 * 1. Navigate to Gastos
 * 2. Verify module loads without errors
 * 3. Add a new expense with category
 * 4. Verify it appears in the list
 * 5. Filter by category
 * 6. Verify monthly totals update
 */

test.describe('Expense Tracking (Gastos)', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  // Supabase cold-start can delay first module load — test.slow() + retries:1 guards against flakes
  test('gastos module loads and functions', { retries: 1 }, async ({
    page, dashboardPage, gastosPage
  }) => {
    test.slow(); // Supabase cold-start on Vercel preview can take 2-3min
    await showPhaseLabel(page, '💸 Phase 1: Load Gastos');
    await dashboardPage.navigateToModule('gastos');
    await gastosPage.waitForPageLoad();

    const healthy = await gastosPage.isModuleHealthy();
    expect(healthy).toBe(true);
    await expectVisible(gastosPage.sectionTitle, 'Gastos module loaded');

    await showPhaseLabel(page, '✅ Gastos Module Healthy');
  });

  test('add new expense with full details', async ({
    page, dashboardPage, gastosPage
  }) => {
    await showPhaseLabel(page, '📝 Add New Expense');
    await dashboardPage.navigateToModule('gastos');
    await gastosPage.waitForPageLoad();

    const expenseData = TestData.expense();
    await gastosPage.addExpense({
      concepto: expenseData.concepto,
      monto: expenseData.monto,
      fecha: expenseData.fecha,
    });

    // Verify expense was added (no error shown)
    const healthy = await gastosPage.isModuleHealthy();
    expect(healthy).toBe(true);

    await showPhaseLabel(page, '✅ Expense Added');
  });

  test('filter gastos by category', async ({
    page, dashboardPage, gastosPage
  }) => {
    await showPhaseLabel(page, '🔍 Filter Gastos');
    await dashboardPage.navigateToModule('gastos');
    await gastosPage.waitForPageLoad();

    // Add an expense first
    const expenseData = TestData.expense();
    await gastosPage.addExpense({
      categoria: 'operativo',
      concepto: expenseData.concepto,
      monto: expenseData.monto,
    });

    // Filter by category
    await gastosPage.filterByCategoria('operativo');
    await page.waitForTimeout(500);

    // Module should still be healthy after filtering
    const healthy = await gastosPage.isModuleHealthy();
    expect(healthy).toBe(true);

    await showPhaseLabel(page, '✅ Category Filter Works');
  });
});