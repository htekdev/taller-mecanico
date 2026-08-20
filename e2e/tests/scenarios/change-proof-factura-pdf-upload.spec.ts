import { test, expect, type Page } from '../../fixtures';
import { TestData } from '../../utils/test-data';
import { showPhaseLabel } from '../visual-assert';

test.describe.configure({ retries: 1 });

/**
 * Helper: Create a fresh trabajo every time and open the "Número de Factura" modal.
 * ALWAYS creates new data — no shared state between tests (fixes PR #185 timeout issue).
 */
async function openFacturaModal(
  page: Page,
  loginPage: { loginAsTestUser(): Promise<void> },
  dashboardPage: { waitForPageLoad(): Promise<void>; navigateToModule(m: string): Promise<void> },
  trabajosPage: {
    waitForPageLoad(): Promise<void>;
    selectClient(i: number): Promise<void>;
    selectVehicle(i: number): Promise<void>;
    vehicleSelect: import('@playwright/test').Locator;
    clientSelect: import('@playwright/test').Locator;
    fillDescription(t: string): Promise<void>;
    addLaborItem(c: string, p: number): Promise<void>;
    save(): Promise<void>;
  },
  jobDesc: string,
): Promise<void> {
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();
  await dashboardPage.navigateToModule('trabajos');
  await trabajosPage.waitForPageLoad();
  await page.waitForTimeout(800);

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
    const clientData = TestData.client('pdf-test');
    await dashboardPage.navigateToModule('clientes');
    await page.waitForTimeout(800);
    await page.locator('input[placeholder="Nombre completo"]').first().fill(clientData.nombre);
    await page.locator('input[placeholder*="555-123-4567"]').first().fill(clientData.telefono);
    await page.getByRole('button', { name: /\+ agregar cliente/i }).click();
    await page.waitForTimeout(1500);
    const clientCard = page.getByRole('button', { name: new RegExp(clientData.nombre, 'i') }).first();
    await expect(clientCard).toBeVisible({ timeout: 10_000 });
    await clientCard.click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder="Ej. Ford"]').fill('Toyota');
    await page.locator('input[placeholder="Ej. F-150"]').fill('Hilux');
    await page.locator('input[placeholder="Ej. 2020"]').fill('2023');
    await page.locator('input[placeholder="Ej. ABC-123"]').fill(`PDF${TestData.uniqueId().slice(-4).toUpperCase()}`);
    await page.getByRole('button', { name: /^\+ agregar$/i }).last().click();
    await page.waitForTimeout(1500);
    await dashboardPage.navigateToModule('trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(1000);
    await trabajosPage.clientSelect.selectOption({ label: clientData.nombre });
    await page.waitForTimeout(800);
    await trabajosPage.selectVehicle(1);
    vehicleFound = true;
  }

  expect(vehicleFound, 'Debe encontrarse cliente con vehículo').toBe(true);
  await trabajosPage.fillDescription(jobDesc);
  await trabajosPage.addLaborItem('Servicio', 350);
  await trabajosPage.save();
  await page.waitForTimeout(2000);

  const row = page.locator('tr').filter({ hasText: jobDesc }).first();
  await expect(row, 'Trabajo creado debe verse en tabla').toBeVisible({ timeout: 15_000 });
  await row.getByRole('button', { name: /finalizar/i }).click();
  await page.waitForTimeout(2000);

  const finModal = page.locator('.fixed.inset-0').filter({ hasText: /Finalizar Trabajo/i }).first();
  const facturaBtn = finModal.getByRole('button', { name: /factura/i }).first();
  if (await facturaBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await facturaBtn.click();
    // Wait for "Finalizar Trabajo" modal to close before proceeding
    await expect(finModal).not.toBeVisible({ timeout: 8_000 });
  }

  // After finalizing with tipoDocumento='factura', the row shows "🧾 Pendiente de facturar".
  // That button opens the "Número de Factura" modal via abrirModalFactura().
  const updatedRow = page.locator('tr').filter({ hasText: jobDesc }).first();
  await expect(updatedRow, 'Fila del trabajo debe seguir visible tras finalizar').toBeVisible({ timeout: 8_000 });
  const pendienteBtn = updatedRow.getByRole('button', { name: /pendiente de facturar/i }).first();
  await expect(pendienteBtn, 'Botón Pendiente de facturar debe aparecer en la fila').toBeVisible({ timeout: 8_000 });
  await pendienteBtn.click();
  await page.waitForTimeout(1000);

  const modal = page.locator('.fixed.inset-0').filter({ hasText: /Número de Factura/i }).first();
  await expect(modal, 'Modal Número de Factura debe abrirse').toBeVisible({ timeout: 10_000 });
}

test('change-proof: PDF upload field exists in factura modal', async ({
  page, loginPage, dashboardPage, trabajosPage,
}) => {
  test.slow();
  const desc = `PDF campo check ${TestData.uniqueId().slice(-6)}`;
  await showPhaseLabel(page, '→ Abrir modal de factura');
  await openFacturaModal(page, loginPage, dashboardPage, trabajosPage, desc);

  const modal = page.locator('.fixed.inset-0').filter({ hasText: /Número de Factura/i }).first();

  await showPhaseLabel(page, '→ Verificar campo PDF existe');
  const pdfInput = modal.locator('[data-testid="pdf-upload-input"]');
  await expect(pdfInput, 'Modal debe tener campo de PDF').toBeAttached({ timeout: 5_000 });

  await showPhaseLabel(page, '→ Crear factura sin PDF');
  const numInput = modal.locator('input[type="text"]').first();
  await numInput.fill(`CHECK-${TestData.uniqueId().slice(-4)}`);
  await modal.getByRole('button', { name: /crear factura/i }).click();
  await page.waitForTimeout(3000);

  await showPhaseLabel(page, '✅ PDF field verified');
});

test('error-handling: Non-PDF file is rejected (MIME check)', async ({
  page, loginPage, dashboardPage, trabajosPage,
}) => {
  test.slow();
  const desc = `NoPDF reject ${TestData.uniqueId().slice(-6)}`;

  await showPhaseLabel(page, '→ Setup trabajo para factura');
  await openFacturaModal(page, loginPage, dashboardPage, trabajosPage, desc);

  const modal = page.locator('.fixed.inset-0').filter({ hasText: /Número de Factura/i }).first();
  await modal.locator('input[type="text"]').first().fill(`NOPDF-${TestData.uniqueId().slice(-4)}`);
  await page.waitForTimeout(300);

  await showPhaseLabel(page, '→ Intentar subir archivo .txt (MIME: text/plain)');
  const pdfInput = modal.locator('[data-testid="pdf-upload-input"]');
  await pdfInput.setInputFiles({
    name: 'not-a-pdf.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('This is not a PDF'),
  });
  await page.waitForTimeout(500);

  // Client-side preflight check: error banner appears immediately on file selection
  await showPhaseLabel(page, '→ Verificar error MIME (preflight en picker)');
  const errorBanner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
  await expect(errorBanner, 'Debe aparecer mensaje de error MIME al seleccionar archivo').toBeVisible({ timeout: 5_000 });
  const txt = await errorBanner.textContent() ?? '';
  expect(txt, 'Error debe mencionar tipo inválido').toMatch(/tipo MIME|MIME incorrecto|no es un PDF/i);

  await showPhaseLabel(page, '✅ Non-PDF rejection verified (preflight)');
});

test('error-handling: Corrupted PDF is rejected (magic bytes check)', async ({
  page, loginPage, dashboardPage, trabajosPage,
}) => {
  test.slow();
  const desc = `Corrupt PDF ${TestData.uniqueId().slice(-6)}`;
  const facturaNum = `CORRUPT-${TestData.uniqueId().slice(-4)}`;

  await showPhaseLabel(page, '→ Setup trabajo para factura');
  await openFacturaModal(page, loginPage, dashboardPage, trabajosPage, desc);

  const modal = page.locator('.fixed.inset-0').filter({ hasText: /Número de Factura/i }).first();
  await modal.locator('input[type="text"]').first().fill(facturaNum);
  await page.waitForTimeout(300);

  await showPhaseLabel(page, '→ Intentar subir PDF corrupto (magic bytes incorrectos)');
  const pdfInput = modal.locator('[data-testid="pdf-upload-input"]');
  await pdfInput.setInputFiles({
    name: 'corrupted.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.concat([
      Buffer.from('FAKE'),
      Buffer.from('\n1 0 obj\n<</Type/Catalog>>\nendobj'),
    ]),
  });
  await page.waitForTimeout(500);

  await modal.getByRole('button', { name: /crear factura/i }).click();
  await page.waitForTimeout(3500);

  await showPhaseLabel(page, '→ Verificar error de corrupción');
  const errorBanner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
  await expect(errorBanner, 'Debe aparecer mensaje de error').toBeVisible({ timeout: 10_000 });
  const txt = await errorBanner.textContent() ?? '';
  expect(txt, 'Error debe mencionar archivo corrupto').toMatch(/corrupto|encabezado|no es un PDF/i);

  await showPhaseLabel(page, '→ Verificar rollback en Facturas');
  await dashboardPage.navigateToModule('facturas');
  await page.waitForTimeout(2000);
  // Use text content check instead of CSS class to avoid false-negatives if styles change
  const notFound = page.getByText(facturaNum, { exact: false });
  expect(await notFound.count(), 'Factura no debe haberse guardado').toBe(0);

  await showPhaseLabel(page, '✅ Corrupted PDF rejection verified');
});

test('change-proof: Valid PDF upload succeeds — ver-pdf-btn appears', async ({
  page, loginPage, dashboardPage, trabajosPage,
}) => {
  test.slow();
  const desc = `PDF valido ${TestData.uniqueId().slice(-6)}`;
  const facturaNum = `VALID-${TestData.uniqueId().slice(-4)}`;

  await showPhaseLabel(page, '→ Abrir modal de factura');
  await openFacturaModal(page, loginPage, dashboardPage, trabajosPage, desc);

  const modal = page.locator('.fixed.inset-0').filter({ hasText: /Número de Factura/i }).first();
  await modal.locator('input[type="text"]').first().fill(facturaNum);
  await page.waitForTimeout(300);

  await showPhaseLabel(page, '→ Subir PDF válido (magic bytes %PDF)');
  const pdfInput = modal.locator('[data-testid="pdf-upload-input"]');
  // Minimal valid PDF: correct magic bytes (%PDF), valid MIME type, small size
  const validPdfBytes = Buffer.concat([
    Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]), // %PDF-1.4
    Buffer.from('\n1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n'),
    Buffer.from('2 0 obj\n<</Type /Pages /Kids [] /Count 0>>\nendobj\n'),
    Buffer.from('xref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n'),
    Buffer.from('trailer\n<</Size 3 /Root 1 0 R>>\nstartxref\n0\n%%EOF'),
  ]);
  await pdfInput.setInputFiles({
    name: 'factura-valida.pdf',
    mimeType: 'application/pdf',
    buffer: validPdfBytes,
  });
  await page.waitForTimeout(500);

  await showPhaseLabel(page, '→ Crear factura con PDF');
  await modal.getByRole('button', { name: /crear factura/i }).click();
  await page.waitForTimeout(5000);

  // No error banner should appear
  const errorBanner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
  const hasError = await errorBanner.isVisible({ timeout: 2_000 }).catch(() => false);
  expect(hasError, 'No debe aparecer error banner al subir PDF válido').toBe(false);

  await showPhaseLabel(page, '→ Verificar botón Ver PDF en Facturas');
  await dashboardPage.navigateToModule('facturas');
  await page.waitForTimeout(3000);

  // The factura row should appear and show the "Ver PDF" button
  const facturaRow = page.getByText(facturaNum, { exact: false }).first();
  await expect(facturaRow, 'La factura debe aparecer en el módulo de facturas').toBeVisible({ timeout: 15_000 });

  const verPdfBtn = page
    .locator('[data-testid="ver-pdf-btn"], [data-testid="ver-pdf-header-btn"]')
    .first();
  await expect(verPdfBtn, 'El botón Ver PDF debe aparecer tras subir PDF válido').toBeVisible({ timeout: 15_000 });

  await showPhaseLabel(page, '✅ Valid PDF upload verified');
});

test('change-proof: subirPdfExistente — PDF upload via Facturas module works', async ({
  page, loginPage, dashboardPage, trabajosPage,
}) => {
  test.slow();

  // Step 1: Create a trabajo, finalize as Factura, generate factura (WITHOUT PDF)
  const desc = `SubirPDF existente ${TestData.uniqueId().slice(-6)}`;
  const facturaNum = `SUBIR-${TestData.uniqueId().slice(-4)}`;

  await showPhaseLabel(page, '→ Crear trabajo y generar factura sin PDF');
  await openFacturaModal(page, loginPage, dashboardPage, trabajosPage, desc);

  const modal = page.locator('.fixed.inset-0').filter({ hasText: /Número de Factura/i }).first();
  await modal.locator('input[type="text"]').first().fill(facturaNum);
  await page.waitForTimeout(300);

  // Confirm WITHOUT selecting a PDF
  await modal.getByRole('button', { name: /crear factura/i }).click();
  await page.waitForTimeout(3000);

  // Step 2: Navigate to Facturas module
  await showPhaseLabel(page, '→ Verificar factura sin PDF en módulo Facturas');
  await dashboardPage.navigateToModule('facturas');
  await page.waitForTimeout(2000);

  const facturaRow = page.getByText(facturaNum, { exact: false }).first();
  await expect(facturaRow, 'Factura debe aparecer sin PDF').toBeVisible({ timeout: 15_000 });

  // Step 3: Locate the "📎 Subir PDF" button for this factura
  await showPhaseLabel(page, '→ Subir PDF via botón Subir PDF en Facturas');
  // The "Subir PDF" button is near the factura row — click to trigger file input
  const subirBtn = page
    .locator('[data-testid="subir-pdf-header-btn"]')
    .first();

  const hasSubirBtn = await subirBtn.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!hasSubirBtn) {
    // Fallback: look for button by text
    const subirBtnByText = page.getByRole('button', { name: /📎 subir pdf|subir pdf/i }).first();
    const hasTextBtn = await subirBtnByText.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasTextBtn) {
      // subirPdfExistente button may not be visible without expanding the row first
      const expandBtn = page.locator('.border-slate-200.rounded-xl.overflow-hidden')
        .filter({ hasText: facturaNum })
        .getByRole('button').first();
      await expandBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  // The hidden file input for subirPdfExistente is triggered by the Subir PDF button
  // We inject the file directly to the hidden input
  const hiddenFileInput = page.locator('[data-testid="pdf-upload-existing-input"]');
  const validPdfBytes = Buffer.concat([
    Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]), // %PDF-1.4
    Buffer.from('\n1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n'),
    Buffer.from('2 0 obj\n<</Type /Pages /Kids [] /Count 0>>\nendobj\n'),
    Buffer.from('xref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n'),
    Buffer.from('trailer\n<</Size 3 /Root 1 0 R>>\nstartxref\n0\n%%EOF'),
  ]);

  // Trigger the file input by clicking the Subir PDF button first (to set pendingUploadRef)
  // then immediately set files on the hidden input
  const subirPdfBtn = page.locator('[data-testid="subir-pdf-header-btn"]').first();
  if (await subirPdfBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await subirPdfBtn.click();
    await page.waitForTimeout(300);
  }
  await hiddenFileInput.setInputFiles({
    name: 'subir-existente.pdf',
    mimeType: 'application/pdf',
    buffer: validPdfBytes,
  });
  await page.waitForTimeout(4000);

  // After upload, "Ver PDF" button should appear and no error
  const errorBanner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
  const hasError = await errorBanner.isVisible({ timeout: 1_000 }).catch(() => false);
  expect(hasError, 'No debe aparecer error al subir PDF existente').toBe(false);

  const verPdfBtn = page
    .locator('[data-testid="ver-pdf-btn"], [data-testid="ver-pdf-header-btn"]')
    .first();
  await expect(verPdfBtn, 'El botón Ver PDF debe aparecer tras subirPdfExistente').toBeVisible({ timeout: 10_000 });

  await showPhaseLabel(page, '✅ subirPdfExistente verified');
});
