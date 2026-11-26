import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { quotationFixture } from '../../../__tests__/fixtures/quotation-pdf';
import { expectVisible, showPhaseLabel } from '../visual-assert';

const standardFontDataUrl = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts').replace(/\\/g, '/') + '/';

test('change-proof-quotation-pdf-pagination — descarga completa y páginas legibles', async ({ page }, testInfo) => {
  const form = quotationFixture(18);
  // Force a single description to exceed a whole page as well as many rows.
  form.refacciones[7].descripcion = Array.from({ length: 64 }, (_, i) =>
    `DETALLE-${i} Revisión de transmisión / Complete assembly inspection.`).join('\n');
  form.observaciones += '\n' + Array.from({ length: 36 }, (_, i) => `NOTA-${i} Garantía de demostración / Demo warranty.`).join('\n');
  const shop = { id: '00000000-0000-4000-8000-000000000001', nombre: 'Taller de demostración', created_at: '2026-11-26T12:00:00Z' };
  const user = { id: '00000000-0000-4000-8000-000000000002', email: 'pdf-demo@example.invalid', aud: 'authenticated', role: 'authenticated' };
  const jwt = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'),
    'synthetic-signature-not-a-real-credential',
  ].join('.');
  // All auth/database traffic stays inside this browser test. No real records
  // are read or written, even when running against a protected Vercel preview.
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({ json: route.request().url().includes('/user') ? user : {
      access_token: jwt, refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user,
    } });
  });
  await page.route('**/rest/v1/**', async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').at(-1);
    let rows: unknown[] = [];
    if (table === 'taller_members' && route.request().method() === 'GET') rows = [{ role: 'owner', talleres: shop }];
    if (table === 'cotizaciones') rows = [{
      id: '00000000-0000-4000-8000-000000000003', taller_id: shop.id,
      numero_cotizacion: form.numeroCotizacion, plantilla: 'general',
      cliente: form.cliente, fecha: form.fecha, total: 5820.88, form,
      created_at: '2026-11-26T12:00:00Z', saved_at: '2026-11-26T12:00:00Z',
    }];
    await route.fulfill({ json: rows });
  });
  await page.goto('/');
  await page.locator('input[type=email]').fill(user.email);
  await page.locator('input[type=password]').fill('synthetic-demo-only');
  await page.locator('button[type=submit]').click();
  await page.locator('nav button').filter({ hasText: 'Cotizaciones' }).click();
  await showPhaseLabel(page, 'Cotización sintética larga: piezas, mano de obra y observaciones');
  await page.getByRole('button', { name: 'Ver →', exact: true }).click();
  const downloadButton = page.getByRole('button', { name: /Descargar PDF/ });
  await expectVisible(downloadButton, 'Descargar cotización completa');
  const downloadEvent = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('COT-PRUEBA-PDF.pdf');
  const filename = testInfo.outputPath('cotizacion-sintetica-completa.pdf');
  await download.saveAs(filename);
  await testInfo.attach('PDF sintético descargado', { path: filename, contentType: 'application/pdf' });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(await readFile(filename)), standardFontDataUrl });
  const pdf = await task.promise;
  expect(pdf.numPages).toBeGreaterThan(2);
  const texts: string[] = [];
  const images: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const pdfPage = await pdf.getPage(i);
    const { items } = await pdfPage.getTextContent();
    const text = items.filter(item => 'str' in item && item.str.trim());
    texts.push(text.map(item => 'str' in item ? item.str : '').join(' '));
    for (const item of text) {
      if (!('str' in item)) continue;
      expect(item.transform[5], `página ${i}: ${item.str}`).toBeGreaterThan(20);
      expect(item.transform[5]).toBeLessThan(pdfPage.view[3] - 20);
      expect(item.transform[4] + item.width).toBeLessThan(pdfPage.view[2] - 25);
      expect(item.height).toBeGreaterThanOrEqual(7);
    }
    // Render the ACTUAL downloaded PDF, not the quotation DOM, for video proof.
    const viewport = pdfPage.getViewport({ scale: 1.25 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await pdfPage.render({ canvas: null, canvasContext: canvas.getContext('2d') as unknown as CanvasRenderingContext2D, viewport }).promise;
    const png = canvas.toBuffer('image/png');
    await testInfo.attach(`PDF página ${i}`, { body: png, contentType: 'image/png' });
    images.push(`data:image/png;base64,${png.toString('base64')}`);
  }
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
  const text = normalize(texts.join(' '));
  for (const item of [...form.refacciones, ...form.manoDeObra]) {
    for (const line of item.descripcion.split('\n')) expect(text).toContain(normalize(line));
  }
  for (const line of form.observaciones.split('\n')) expect(text).toContain(normalize(line));
  expect(text).toContain('SUBTOTAL: $5,018.00 IVA (16%): $802.88 TOTAL: $5,820.88');
  expect(texts.at(-1)).toContain(form.autorizadoPor);
  await task.destroy();
  // A local, test-only proof viewer displays every real PDF page and boundary.
  await page.setContent('<main style="background:#dbe2ea;padding:24px;text-align:center"><h1>PDF descargado: contenido completo en varias páginas</h1></main>');
  for (const [i, image] of images.entries()) {
    await page.locator('main').evaluate((main, { image, i }) => {
      const heading = document.createElement('h2');
      heading.textContent = `Página ${i + 1}`;
      const img = document.createElement('img');
      img.src = image;
      img.alt = `PDF página ${i + 1}`;
      img.style.cssText = 'display:block;width:700px;max-width:100%;margin:auto;border:2px solid #334155';
      main.append(heading, img);
    }, { image, i });
  }
  for (let i = 0; i < images.length; i++) {
    const image = page.getByAltText(`PDF página ${i + 1}`, { exact: true });
    await image.scrollIntoViewIfNeeded();
    await expectVisible(image, `Página ${i + 1}: límites completos`);
    await image.screenshot({ path: testInfo.outputPath(`pdf-pagina-${i + 1}.png`) });
    await page.mouse.wheel(0, 340);
    await showPhaseLabel(page, `Página ${i + 1}/${images.length}: sin recortes`, 700);
  }
});
