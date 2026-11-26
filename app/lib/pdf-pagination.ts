import type { jsPDF } from 'jspdf';

/**
 * Letter-PDF flow layout. All coordinates are millimetres; reserve the bottom
 * margin for page numbers, and never shrink text to make content fit.
 */
export function createPdfPagination(doc: jsPDF, left: number, width: number) {
  const top = 14;
  const bottom = doc.internal.pageSize.getHeight() - 18;

  const newPage = () => {
    doc.addPage();
    return top;
  };

  const ensureSpace = (y: number, height: number) =>
    y + height > bottom ? newPage() : y;

  /** Draw already-wrapped lines individually so no text straddles a page. */
  const textLines = (lines: string[], start: number, spacing = 4) => {
    let y = start;
    for (const line of lines) {
      y = ensureSpace(y, spacing);
      doc.text(line, left, y);
      y += spacing;
    }
    return y;
  };

  /** Add numbering after layout so the total page count is final. */
  const numberPages = () => {
    const count = doc.getNumberOfPages();
    for (let page = 1; page <= count; page++) {
      doc.setPage(page);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`${page} / ${count}`, left + width, bottom + 10, { align: 'right' });
    }
  };

  return { top, bottom, newPage, ensureSpace, textLines, numberPages };
}
