import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VistaPreviaContenido } from '../../app/modules/cotizaciones';
import { quotationFixture } from '../fixtures/quotation-pdf';

const { savePdf, constructionError } = vi.hoisted(() => ({
  savePdf: vi.fn(), constructionError: { value: false },
}));
vi.mock('@/app/lib/db', () => ({}));
vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>();
  return {
    ...actual,
    jsPDF: function (options: ConstructorParameters<typeof actual.jsPDF>[0]) {
      if (constructionError.value) throw new Error('Synthetic PDF initialization failure');
      const doc = new actual.jsPDF(options);
      doc.save = savePdf;
      return doc;
    },
  };
});

const images: { onerror?: () => void }[] = [];
beforeEach(() => {
  images.length = 0;
  savePdf.mockReset();
  constructionError.value = false;
  vi.stubGlobal('Image', class {
    onerror?: () => void;
    constructor() { images.push(this); }
    set src(_value: string) { /* Controlled completion keeps export pending. */ }
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function renderPreview() {
  render(<VistaPreviaContenido plantilla="general" form={quotationFixture()} entry={null} onEditar={vi.fn()} onNueva={vi.fn()} />);
  return screen.getByRole('button', { name: /Descargar PDF/ });
}

describe('quotation PDF download feedback', () => {
  it('disables pending export, catches failure, and clears the alert on a successful retry', async () => {
    savePdf.mockImplementationOnce(() => { throw new Error('Synthetic serialization failure'); });
    const unhandled = vi.fn();
    window.addEventListener('unhandledrejection', unhandled);
    try {
      const button = renderPreview();
      fireEvent.click(button);
      await waitFor(() => expect(images).toHaveLength(1));
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Generando...');
      fireEvent.click(button);
      expect(images).toHaveLength(1);
      await act(async () => { images[0].onerror?.(); });
      expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo generar el PDF. Intenta descargarlo de nuevo.');
      expect(button).toBeEnabled();
      expect(unhandled).not.toHaveBeenCalled();

      fireEvent.click(button);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      await waitFor(() => expect(images).toHaveLength(2));
      expect(button).toBeDisabled();
      await act(async () => { images[1].onerror?.(); });
      await waitFor(() => expect(button).toBeEnabled());
      expect(savePdf).toHaveBeenCalledTimes(2);
      expect(savePdf).toHaveBeenLastCalledWith('COT-PRUEBA-PDF.pdf');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(unhandled).not.toHaveBeenCalled();
    } finally { window.removeEventListener('unhandledrejection', unhandled); }
  });

  it('shows the same recoverable message when PDF initialization fails before logo loading', async () => {
    constructionError.value = true;
    const button = renderPreview();
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo generar el PDF.');
    expect(button).toBeEnabled();
    expect(images).toHaveLength(0);
    expect(savePdf).not.toHaveBeenCalled();
  });
});
