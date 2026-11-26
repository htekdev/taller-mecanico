// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { jsPDF } from 'jspdf';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { generarYDescargarPDF } from '../../app/modules/cotizaciones';
import { quotationFixture } from '../fixtures/quotation-pdf';

vi.mock('@/app/lib/db', () => ({}));

let document: jsPDF;
vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>();
  return {
    ...actual,
    jsPDF: function (options: ConstructorParameters<typeof actual.jsPDF>[0]) {
      document = new actual.jsPDF(options);
      document.save = vi.fn();
      return document;
    },
  };
});

beforeEach(() => {
  // Exercise the existing branded fallback, without a network or a DOM canvas.
  vi.stubGlobal('window', {
    atob: globalThis.atob, btoa: globalThis.btoa,
    Image: class {
      onerror?: () => void;
      set src(_value: string) { this.onerror?.(); }
    },
  });
});

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
const require = createRequire(import.meta.url);
const standardFontDataUrl = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts').replace(/\\/g, '/') + '/';

async function readPdf() {
  const task = getDocument({ data: new Uint8Array(document.output('arraybuffer')), standardFontDataUrl });
  const pdf = await task.promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const { items } = await page.getTextContent();
    const text = items.filter((item) => 'str' in item && item.str.trim()).map((item) => {
      if (!('str' in item)) throw new Error('Expected PDF text');
      return item;
    });
    const height = page.view[3];
    // These are actual PDF glyph positions, not DOM/canvas approximations.
    for (const item of text) {
      expect(item.transform[5], `page ${i}: ${item.str}`).toBeGreaterThan(20);
      expect(item.transform[5], `page ${i}: ${item.str}`).toBeLessThan(height - 20);
      expect(item.transform[4], `page ${i}: ${item.str}`).toBeGreaterThan(30);
      expect(item.transform[4] + item.width, `page ${i}: ${item.str}`).toBeLessThan(page.view[2] - 25);
      expect(item.height, `readable font: ${item.str}`).toBeGreaterThanOrEqual(7);
    }
    pages.push(normalize(text.map((item) => item.str).join(' ')));
  }
  await task.destroy();
  return pages;
}

describe('downloaded quotation PDFs', () => {
  it.each(['general', 'ayuntamiento', 'red_ambiental'] as const)(
    'keeps short %s quotations on one branded page', async (template) => {
      await generarYDescargarPDF(template, quotationFixture(), 'demo-corta');
      const pages = await readPdf();
      expect(pages).toHaveLength(1);
      expect(pages[0]).toContain('MICRO DIESEL DE MERIDA');
      expect(pages[0]).toContain('COTIZACIÓN');
      expect(pages[0]).toContain('IVA (16%): $120.16');
      expect(pages[0]).toContain('TOTAL: $871.16');
      expect(pages[0]).toContain('Autorización de prueba');
      expect(document.save).toHaveBeenCalledWith('demo-corta.pdf');
    },
  );

  it('preserves every wrapped line item across more than two pages, with headers and totals', async () => {
    const form = quotationFixture(45);
    await generarYDescargarPDF('general', form);
    const pages = await readPdf();
    expect(pages.length).toBeGreaterThan(2);
    const text = pages.join(' ');
    for (const item of [...form.refacciones, ...form.manoDeObra]) {
      expect(text).toContain(normalize(item.descripcion));
      expect(text.split(item.descripcion.split(' ')[0])).toHaveLength(2);
    }
    expect(text).toContain('SUBTOTAL: $11,795.00');
    expect(text).toContain('IVA (16%): $1,887.20');
    expect(text).toContain('TOTAL: $13,682.20');
    expect(text).toContain(normalize(form.observaciones));
    expect(pages.at(-1)).toContain(form.autorizadoPor);
    pages.forEach((page, i) => {
      expect(page).toContain(`${i + 1} / ${pages.length}`);
      if (page.includes('PIEZA-')) expect(page).toContain('CANTIDAD DESCRIPCIÓN PRECIO UNIT. TOTAL');
    });
  });

  it('splits a single page-tall description and long work/notes without losing lines or duplicating amounts', async () => {
    const form = quotationFixture();
    const lines = (prefix: string, count: number) =>
      Array.from({ length: count }, (_, i) => `${prefix}-${i} Información completa / Complete information.`);
    const work = lines('TRABAJO', 90);
    const description = lines('DESCRIPCION', 160);
    const notes = lines('OBSERVACION', 95);
    form.trabajo = work.join('\n');
    form.refacciones[0].descripcion = description.join('\n');
    form.observaciones = notes.join('\n');
    form.incluirIVA = false;
    await generarYDescargarPDF('ayuntamiento', form);
    const pages = await readPdf();
    const text = pages.join(' ');
    for (const line of [...work, ...description, ...notes]) expect(text).toContain(line);
    expect(text).not.toContain('IVA (16%)');
    expect(text).toContain('TOTAL: $751.00');
    expect(text.split('$125.50')).toHaveLength(2);
    expect(pages.at(-1)).toContain(form.autorizadoPor);
  });

  it('handles empty sections and default filename/signature', async () => {
    const form = quotationFixture(0);
    form.manoDeObra = [];
    form.numeroCotizacion = '';
    form.trabajo = '';
    form.observaciones = '';
    form.autorizadoPor = '';
    await generarYDescargarPDF('general', form);
    const pages = await readPdf();
    expect(pages).toHaveLength(1);
    expect(pages[0].split('(Sin partidas)')).toHaveLength(3);
    expect(pages[0]).toContain('Autorizado por');
    expect(document.save).toHaveBeenCalledWith('Cotizacion.pdf');
  });

  it.each([5, 6, 7, 8, 9, 10, 11, 12, 13, 14])(
    'keeps totals together and signature inside the page with %i boundary-adjacent rows', async (count) => {
      await generarYDescargarPDF('general', quotationFixture(count));
      const pages = await readPdf();
      const totalsPage = pages.find(page => page.includes('SUBTOTAL:'));
      expect(totalsPage).toContain('IVA (16%):');
      expect(totalsPage).toContain('TOTAL:');
      expect(pages.at(-1)).toContain('Autorización de prueba');
    },
  );
});
