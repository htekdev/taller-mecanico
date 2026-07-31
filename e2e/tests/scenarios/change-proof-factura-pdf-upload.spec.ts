import { test, expect, type Page } from '../../fixtures';
import { TestData } from '../../utils/test-data';
import { showPhaseLabel } from '../visual-assert';

/**
 * change-proof-factura-pdf-upload
 * Verifies: PDF upload field exists in the factura number modal,
 * Facturas section shows factura correctly,
 * CxC has no PDF file input.
 * Also verifies error handling & rollback for invalid PDFs.
 */
test.describe.configure({ retries: 1 });

/**
 * Shared helper: ensure the "Número de Factura" modal is open.
 *
 * Strategy:
 * 1. If a "Pendiente de facturar" button is already visible → click it.
 * 2. Otherwise create a fresh trabajo (iterates through clients 1-8 to
 *    find one with vehicles, then creates a client+vehicle if none found),
 *    finalizes it, and advances to the factura modal.
 *
 * Returns with the modal open and ready for PDF / number input.
 */
async function setupJobForFactura(
  page: Page,
  loginPage: { loginAsTestUser: () => Promise<void> },
  dashboardPage: { waitForPageLoad: () => Promise<void>; navigateToModule: (m: string) => Promise<void> },
  trabajosPage: {
    waitForPageLoad: () => Promise<void>;
    selectClient: (i: number) => Promise<void>;
    selectVehicle: (i: number) => Promise<void>;
    vehicleSelect: import('@playwright/test').Locator;
    clientSelect: import('@playwright/test').Locator;
    fillDescription: (t: string) => Promise<void>;
    addLaborItem: (c: string, p: number) => Promise<void>;
    save: () => Promise<void>;
  },
  jobDesc: string,
): Promise<void> {
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();
  await dashboardPage.navigateToModule('trabajos');
  await trabajosPage.waitForPageLoad();
  await page.waitForTimeout(800);

  const pendienteBtn = page.getByRole('button', { name: /pendiente de facturar/i }).first();
  if (await pendienteBtn.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await showPhaseLabel(page, '→ Usar trabajo pendiente de facturar existente');
    await pendienteBtn.click();
    await page.waitForTimeout(1500);
    return;
  }

  // No pending job — create one with the same robust multi-client search as test #1
  await showPhaseLabel(page, '→ Crear trabajo de apoyo');

  let vehicleFound = false;
  for (let ci = 1; ci <= 8; ci++) {
    await trabajosPage.selectClient(ci);
    await page.waitForTimeout(600);
    const optCount = await trabajosPage.vehicleSelect.locator('option').count();
    if (optCount > 1) {
      await trabajosPage.selectVehicle(1);
      vehicleFound = true;
      break;
    }
  }

  if (!vehicleFound) {
    // Create a temporary client + vehicle
    const clientData = TestData.client('factura-errhandling');
    const vehicleData = {
      marca: 'Honda',
      modelo: `CR-V ${TestData.uniqueId().slice(-4)}`,
      anio: '2021',
      placa: `ERR-${TestData.uniqueId().slice(-3).toUpperCase()}`,
    };

    await showPhaseLabel(page, '→ Crear cliente y unidad de apoyo');
    await dashboardPage.navigateToModule('clientes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    await page.locator('input[placeholder="Nombre completo"]').first().fill(clientData.nombre);
    await page.locator('input[placeholder*="555-123-4567"]').first().fill(clientData.telefono);
    await page.getByRole('button', { name: /\+ agregar cliente/i }).click();
    await page.waitForTimeout(1500);

    const clientCard = page.getByRole('button', { name: new RegExp(clientData.nombre, 'i') }).first();
    await expect(clientCard, 'Cliente de apoyo debe existir').toBeVisible({ timeout: 10_000 });
    await clientCard.click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder="Ej. Ford"]').fill(vehicleData.marca);
    await page.locator('input[placeholder="Ej. F-150"]').fill(vehicleData.modelo);
    await page.locator('input[placeholder="Ej. 2020"]').fill(vehicleData.anio);
    await page.locator('input[placeholder="Ej. ABC-123"]').fill(vehicleData.placa);
    await page.getByRole('button', { name: /^\+ agregar$/i }).last().click();
    await page.waitForTimeout(1500);

    await dashboardPage.navigateToModule('trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(1000);
    await trabajosPage.clientSelect.selectOption({ label: clientData.nombre });
    await page.waitForTimeout(1000);
    const optCount = await trabajosPage.vehicleSelect.locator('option').count();
    expect(optCount, 'Cliente de apoyo debe tener unidad').toBeGreaterThan(1);
    await trabajosPage.selectVehicle(1);
    vehicleFound = true;
  }

  expect(vehicleFound, 'Debe existir cliente con vehículo').toBe(true);
  await trabajosPage.fillDescription(jobDesc);
  await trabajosPage.addLaborItem('Chequeo', 200);
  await trabajosPage.save();
  await page.waitForTimeout(2000);

  const trabajoRow = page.locator('tr').filter({ hasText: jobDesc }).first();
  await expect(trabajoRow, 'Trabajo creado debe aparecer en tabla').toBeVisible({ timeout: 10_000 });
  await trabajoRow.getByRole('button', { name: /finalizar/i }).click();
  await page.waitForTimeout(2000);

  const finalizarModal = page.locator('.fixed.inset-0').filter({ hasText: /Finalizar Trabajo/i }).first();
  const facturaBtn = finalizarModal.getByRole('button', { name: /factura/i }).first();
  if (await facturaBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await facturaBtn.click();
    await page.waitForTimeout(1500);
  }
}

test('change-proof: PDF upload in facturado modal, visible only in Facturas', async ({
  page, loginPage, dashboardPage, trabajosPage,
}) => {
  test.slow();
  const JOB_DESC = 'Prueba PDF factura PR185 modal check';

  await showPhaseLabel(page, '→ Login & setup trabajo');
  await setupJobForFactura(page, loginPage, dashboardPage, trabajosPage, JOB_DESC);

  await showPhaseLabel(page, '→ Verificar modal tiene campo PDF');
  const modal = page.locator('.fixed.inset-0').filter({ hasText: /Número de Factura/i }).first();
  await expect(modal, 'Modal debe ser visible').toBeVisible({ timeout: 8_000 });
  const pdfInput = modal.locator('input[accept="application/pdf"]');
  await expect(pdfInput, 'Modal debe tener input PDF').toBeAttached({ timeout: 5_000 });

  const numeroInput = modal.locator('input[type="text"]').first();
  await numeroInput.fill('PRV2-001');
  await page.waitForTimeout(500);
  const crearBtn = modal.getByRole('button', { name: /crear factura/i });
  await crearBtn.click();
  await page.waitForTimeout(3000);

  await showPhaseLabel(page, '→ Verificar sección Facturas');
  await dashboardPage.navigateToModule('facturas');
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const facturaRow = page.locator('.border-slate-200.rounded-xl.overflow-hidden').filter({ hasText: /PRV2-001/i }).first();
  await expect(facturaRow, 'Factura PRV2-001 debe aparecer en Facturas').toBeVisible({ timeout: 10_000 });

  await showPhaseLabel(page, '→ Verificar CxC sin upload PDF');
  await dashboardPage.navigateToModule('cuentas');
  await page.waitForTimeout(2000);
  const cxcPdfInput = page.locator('input[accept="application/pdf"]');
  await expect(cxcPdfInput, 'CxC NO debe tener input PDF').not.toBeAttached();

  await showPhaseLabel(page, '✅ PR #185 verificado');
  await page.waitForTimeout(500);
});

test('error-handling: Non-PDF file rejection with rollback', async ({
  page, loginPage, dashboardPage, trabajosPage,
}) => {
  test.slow();
  const JOB_DESC = 'Prueba rechazo archivo no-PDF';

  await showPhaseLabel(page, '→ Setup trabajo listo para facturar');
  await setupJobForFactura(page, loginPage, dashboardPage, trabajosPage, JOB_DESC);

  await showPhaseLabel(page, '→ Attempt upload .txt file (non-PDF)');
  const modal = page.locator('.fixed.inset-0').filter({ hasText: /Número de Factura/i }).first();
  await expect(modal, 'Modal debe ser visible').toBeVisible({ timeout: 8_000 });

  const numeroInput = modal.locator('input[type="text"]').first();
  await numeroInput.fill(`ERR-${TestData.uniqueId().slice(-3)}`);
  await page.waitForTimeout(300);

  // Create a temporary .txt file to simulate non-PDF
  const pdfInput = modal.locator('input[accept="application/pdf"]');
  await pdfInput.setInputFiles({
    name: 'not-a-pdf.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('This is not a PDF file'),
  });
  await page.waitForTimeout(500);

  const crearBtn = modal.getByRole('button', { name: /crear factura/i });
  await crearBtn.click();
  await page.waitForTimeout(2500);

  await showPhaseLabel(page, '→ Verify error message');
  const errorBanner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
  await expect(errorBanner, 'Error banner debe aparecer').toBeVisible({ timeout: 8_000 });
  const errorText = await errorBanner.textContent();
  expect(errorText, 'Error debe mencionar tipo MIME incorrecto').toMatch(/tipo MIME|MIME incorrecto/i);

  // Capture numero BEFORE navigating — modal closes on navigation and locator becomes stale
  const numeroVal = await numeroInput.inputValue();

  await showPhaseLabel(page, '→ Verify rollback (factura NOT in DB)');
  await dashboardPage.navigateToModule('facturas');
  await page.waitForTimeout(1500);
  const facturaNotFound = page.locator('.border-slate-200').filter({ hasText: new RegExp(numeroVal, 'i') });
  const facturaCount = await facturaNotFound.count();
  expect(facturaCount, 'Factura debe ser eliminada (rollback)').toBe(0);

  await showPhaseLabel(page, '✅ Non-PDF rejection & rollback verified');
});

test('error-handling: Corrupted PDF rejection with rollback', async ({
  page, loginPage, dashboardPage, trabajosPage,
}) => {
  test.slow();
  const JOB_DESC = 'Prueba rechazo PDF corrupto';

  await showPhaseLabel(page, '→ Setup trabajo listo para facturar');
  await setupJobForFactura(page, loginPage, dashboardPage, trabajosPage, JOB_DESC);

  await showPhaseLabel(page, '→ Attempt upload corrupted PDF (invalid magic number)');
  const modal = page.locator('.fixed.inset-0').filter({ hasText: /Número de Factura/i }).first();
  await expect(modal, 'Modal debe ser visible').toBeVisible({ timeout: 8_000 });

  const numeroInput = modal.locator('input[type="text"]').first();
  await numeroInput.fill(`CORRUPT-${TestData.uniqueId().slice(-2)}`);
  await page.waitForTimeout(300);

  // Create a fake PDF with wrong magic number
  const pdfInput = modal.locator('input[accept="application/pdf"]');
  const fakeBuffer = Buffer.concat([
    Buffer.from('FAKE'), // Wrong magic number (should be %PDF)
    Buffer.from('\n\n1 0 obj\n<< /Type /Catalog >>\nendobj'),
  ]);
  await pdfInput.setInputFiles({
    name: 'corrupted.pdf',
    mimeType: 'application/pdf',
    buffer: fakeBuffer,
  });
  await page.waitForTimeout(500);

  const crearBtn = modal.getByRole('button', { name: /crear factura/i });
  await crearBtn.click();
  await page.waitForTimeout(2500);

  await showPhaseLabel(page, '→ Verify error message');
  const errorBanner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
  await expect(errorBanner, 'Error banner debe aparecer').toBeVisible({ timeout: 8_000 });
  const errorText = await errorBanner.textContent();
  expect(errorText, 'Error debe mencionar archivo corrupto').toMatch(/corrupto|parece estar/i);

  await showPhaseLabel(page, '→ Verify rollback (factura NOT in DB)');
  await dashboardPage.navigateToModule('facturas');
  await page.waitForTimeout(1500);
  const numeroVal = await numeroInput.inputValue();
  const facturaNotFound = page.locator('.border-slate-200').filter({ hasText: new RegExp(numeroVal, 'i') });
  const facturaCount = await facturaNotFound.count();
  expect(facturaCount, 'Factura debe ser eliminada (rollback)').toBe(0);

  await showPhaseLabel(page, '✅ Corrupted PDF rejection & rollback verified');
});
