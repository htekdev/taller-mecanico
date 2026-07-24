import type { Trabajo, Cliente, Vehiculo } from '@/app/types';
import { getHoy } from '@/app/lib/utils';

function fmtPeso(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Comprobante de Pago ──────────────────────────────────────────────────────
async function generarComprobantePago(
  trabajo: Trabajo,
  cliente: Cliente | undefined,
  vehiculo: Vehiculo | undefined,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  const pw = 215.9;  // letter width mm
  const ml = 18, mr = 18, cw = pw - ml - mr;

  const DARK   = [15,  23,  42]  as [number, number, number];
  const MID    = [71,  85, 105]  as [number, number, number];
  const LIGHT  = [203,213,225]  as [number, number, number];
  const XLIGHT = [248,250,252]  as [number, number, number];
  const WHITE  = [255,255,255]  as [number, number, number];
  const GREEN  = [5,  150,  105] as [number, number, number];

  const fechaHoy = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  const fechaTrabajo = trabajo.fecha
    ? new Date(trabajo.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
    : fechaHoy;

  let y = 15;

  // ═══ HEADER ══════════════════════════════════════════════════════════════
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...DARK);
  doc.text('MICRO DIESEL DE MÉRIDA', ml, y + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MID);
  doc.text('Héctor Armando Rocha Sepúlveda', ml, y + 10);
  doc.text('Circuito Colonias No. 752, Col. Castilla Cámara, CP 97278  ·  Mérida, Yucatán', ml, y + 14.5);
  doc.text('Tel. (999) 317.22.46  ·  Cel. 999 359.79.70', ml, y + 18.5);

  // PAGADO stamp (top right)
  doc.setFillColor(...GREEN);
  doc.roundedRect(ml + cw - 38, y, 38, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...WHITE);
  doc.text('PAGADO', ml + cw - 19, y + 9, { align: 'center' });
  doc.setFontSize(7); doc.setTextColor(...WHITE);
  doc.text('COMPROBANTE', ml + cw - 19, y + 15, { align: 'center' });

  y += 25;
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.4); doc.line(ml, y, ml + cw, y);
  y += 7;

  // ═══ TITLE ══════════════════════════════════════════════════════════════
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...DARK);
  doc.text('COMPROBANTE DE PAGO', ml + cw / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MID);
  doc.text(`Generado el ${fechaHoy}`, ml + cw / 2, y, { align: 'center' });
  y += 8;

  // ═══ CLIENT + VEHICLE ════════════════════════════════════════════════════
  doc.setFillColor(...XLIGHT); doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3);
  doc.roundedRect(ml, y, cw, 22, 1.5, 1.5, 'FD');

  const half = cw / 2 - 3;
  // Left: client
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...MID);
  doc.text('CLIENTE', ml + 4, y + 5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...DARK);
  doc.text(cliente?.nombre ?? '—', ml + 4, y + 11);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MID);
  doc.text(cliente?.telefono ?? '', ml + 4, y + 16.5);

  // Right: vehicle
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...MID);
  doc.text('VEHÍCULO', ml + half + 6, y + 5);
  const vLabel = vehiculo
    ? [vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')
    : '—';
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK);
  doc.text(doc.splitTextToSize(vLabel, half)[0], ml + half + 6, y + 11);
  if (vehiculo?.placa) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MID);
    doc.text(`Placa: ${vehiculo.placa}`, ml + half + 6, y + 16.5);
  }
  y += 27;

  // ═══ WORK DETAILS ════════════════════════════════════════════════════════
  doc.setFillColor(...DARK); doc.rect(ml, y, cw, 7, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...WHITE);
  doc.text('SERVICIO', ml + 3, y + 4.5);
  y += 7;

  doc.setFillColor(...XLIGHT); doc.setDrawColor(...LIGHT); doc.setLineWidth(0.2);
  doc.rect(ml, y, cw, 16, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK);
  const desc = doc.splitTextToSize(trabajo.descripcion, cw - 8);
  doc.text(desc[0], ml + 4, y + 6);
  if (desc[1]) doc.text(desc[1], ml + 4, y + 11);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MID);
  doc.text(`Fecha del servicio: ${fechaTrabajo}`, ml + 4, y + 14.5);
  if (trabajo.folioFiscal && trabajo.folioFiscal !== '__CANCELADA__') {
    doc.text(`Folio fiscal: ${trabajo.folioFiscal}`, ml + cw - 4, y + 14.5, { align: 'right' });
  }
  y += 21;

  // ═══ MANO DE OBRA ITEMS ═══════════════════════════════════════════════════
  if (trabajo.manoDeObraItems?.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...MID);
    doc.text('MANO DE OBRA', ml, y + 4);
    y += 7;
    const rh = 6;
    trabajo.manoDeObraItems.forEach((item, i) => {
      if (y > 255) { doc.addPage(); y = 15; }
      if (i % 2 === 0) { doc.setFillColor(...XLIGHT); doc.rect(ml, y, cw, rh, 'F'); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...DARK);
      const itemLabel = item.cantidad && item.cantidad > 1
        ? `${item.concepto} × ${item.cantidad}`
        : item.concepto;
      doc.text(doc.splitTextToSize(itemLabel, cw - 30)[0], ml + 3, y + 4);
      const itemTotal = item.precio * (item.cantidad ?? 1);
      doc.text(`$${fmtPeso(itemTotal)}`, ml + cw, y + 4, { align: 'right' });
      doc.setDrawColor(...LIGHT); doc.setLineWidth(0.15); doc.line(ml, y + rh, ml + cw, y + rh);
      y += rh;
    });
    // subtotal mano de obra
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...DARK);
    doc.text('Subtotal mano de obra', ml + cw - 50, y + 4);
    doc.text(`$${fmtPeso(trabajo.manoDeObra)}`, ml + cw, y + 4, { align: 'right' });
    y += 8;
  }

  // ═══ AMOUNTS SUMMARY ══════════════════════════════════════════════════════
  if (y > 230) { doc.addPage(); y = 15; }
  const sumX = ml + cw - 75;
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3); doc.line(sumX, y, ml + cw, y);
  y += 5;

  const sumLine = (label: string, value: string, bold = false, color = DARK) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9 : 8);
    doc.setTextColor(...color);
    doc.text(label, sumX + 2, y);
    doc.text(value, ml + cw, y, { align: 'right' });
    y += 5.5;
  };

  if (trabajo.manoDeObra > 0) sumLine('Mano de obra:', `$${fmtPeso(trabajo.manoDeObra)}`);
  if (trabajo.refacciones > 0) sumLine('Refacciones:', `$${fmtPeso(trabajo.refacciones)}`);
  if (trabajo.iva > 0) sumLine('IVA (16%):', `$${fmtPeso(trabajo.iva)}`);

  doc.setDrawColor(...DARK); doc.setLineWidth(0.4);
  doc.line(sumX, y, ml + cw, y); y += 1;
  doc.line(sumX, y, ml + cw, y); y += 6;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...DARK);
  doc.text('TOTAL', sumX + 2, y);
  doc.text(`$${fmtPeso(trabajo.total)}`, ml + cw, y, { align: 'right' });
  y += 12;

  // ═══ PAYMENT RECORDS ══════════════════════════════════════════════════════
  if (trabajo.pagos?.length > 0) {
    doc.setFillColor(...DARK); doc.rect(ml, y, cw, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...WHITE);
    doc.text('PAGOS REALIZADOS', ml + 3, y + 4.5);
    y += 7;

    trabajo.pagos.forEach((pago, i) => {
      if (y > 260) { doc.addPage(); y = 15; }
      if (i % 2 === 0) { doc.setFillColor(...XLIGHT); doc.rect(ml, y, cw, 6, 'F'); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...DARK);
      const pagoFecha = pago.fecha
        ? new Date(pago.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';
      doc.text(pagoFecha, ml + 3, y + 4);
      if (pago.nota) doc.text(pago.nota, ml + 45, y + 4);
      doc.text(`$${fmtPeso(pago.monto)}`, ml + cw, y + 4, { align: 'right' });
      doc.setDrawColor(...LIGHT); doc.setLineWidth(0.15); doc.line(ml, y + 6, ml + cw, y + 6);
      y += 6;
    });
    y += 4;
  }

  // ═══ FOOTER ══════════════════════════════════════════════════════════════
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3); doc.line(ml, y, ml + cw, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MID);
  doc.text(`Generado el ${fechaHoy}  ·  Este documento es un comprobante interno, no tiene validez fiscal.`, ml, y);
  doc.text('MICRO DIESEL DE MÉRIDA', ml + cw, y, { align: 'right' });

  const slug = trabajo.fecha ?? getHoy();
  doc.save(`comprobante-pago-${cliente?.nombre?.replace(/\s+/g, '-').toLowerCase() ?? 'cliente'}-${slug}.pdf`);
}
