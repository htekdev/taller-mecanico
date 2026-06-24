'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Cliente, Vehiculo } from '@/app/types';
import { Label, Input, Btn, SectionTitle } from '@/app/components/ui';

// ─── Constants ───────────────────────────────────────────────────────────────

const COT_COUNTER_KEY = 'taller_cot_counter';
const NUM_PROVEEDOR_RED_AMBIENTAL = 'P004093';

// Lista de departamentos del Ayuntamiento de Mérida — confirmada por Sofia.
// Para agregar nuevos departamentos, añadir una entrada a este arreglo.
const DEPARTAMENTOS_AYUNTAMIENTO: string[] = [
  '— Seleccionar departamento —',
  'Obras públicas mantenimiento vial',
  'Servicios públicos aseo urbano poniente',
  'Servicios públicos aseo urbano oriente',
];

function nextCotizacionNumber(): string {
  if (typeof window === 'undefined') return 'COT-001';
  const current = parseInt(localStorage.getItem(COT_COUNTER_KEY) ?? '0', 10);
  const next = current + 1;
  localStorage.setItem(COT_COUNTER_KEY, String(next));
  return `COT-${String(next).padStart(3, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Plantilla = 'ayuntamiento' | 'red_ambiental' | 'general';

interface ItemLinea {
  id: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
}

interface FormCotizacion {
  numeroCotizacion: string;    // auto-generated, read-only display
  clienteId: string;           // general template: selected client id
  cliente: string;             // display name
  vehiculoId: string;          // general template: selected vehicle id
  marca: string;
  modelo: string;
  anio: string;
  placas: string;
  kms: string;
  fecha: string;
  trabajo: string;
  observaciones: string;
  incluirIVA: boolean;
  // Ayuntamiento
  inventario: string;          // REQUIRED for Ayuntamiento
  ordenServicio: string;
  departamento: string;        // dropdown
  // Line items
  refacciones: ItemLinea[];
  manoDeObra: ItemLinea[];
}

type Pantalla = 'selector' | 'formulario' | 'preview';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const newItem = (): ItemLinea => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  descripcion: '',
  cantidad: '1',
  precioUnitario: '',
});

const parseNum = (s: string): number => {
  const n = parseFloat(s.replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};

const fmtPeso = (n: number) =>
  n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const calcItem = (item: ItemLinea) =>
  parseNum(item.cantidad) * parseNum(item.precioUnitario);

function calcTotales(form: FormCotizacion) {
  const subtotalRef = form.refacciones.reduce((s, i) => s + calcItem(i), 0);
  const subtotalMO  = form.manoDeObra.reduce((s, i) => s + calcItem(i), 0);
  const subtotal    = subtotalRef + subtotalMO;
  const iva         = form.incluirIVA ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
  const total       = subtotal + iva;
  return { subtotalRef, subtotalMO, subtotal, iva, total };
}

const hoy = () => new Date().toISOString().split('T')[0];

// ─── PDF Generator ────────────────────────────────────────────────────────────

async function generarYDescargarPDF(plantilla: Plantilla, form: FormCotizacion) {
  const jsPDFMod = await import('jspdf');
  const { jsPDF } = jsPDFMod;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  const pw = 215.9;
  const ph = 279.4;
  const ml = 14;
  const mr = 14;
  const cw = pw - ml - mr;
  void ph;

  // Load logo
  let logoData: string | null = null;
  try {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = '/logo-mj-merida.jpg';
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    logoData = canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    // logo fails silently
  }

  const { subtotalRef, subtotalMO, subtotal, iva, total } = calcTotales(form);

  // Resolved values
  const numProveedor = plantilla === 'red_ambiental' ? NUM_PROVEEDOR_RED_AMBIENTAL : '';
  const clienteNombre =
    plantilla === 'ayuntamiento' ? 'Ayuntamiento de Mérida' :
    plantilla === 'red_ambiental' ? 'Red Ambiental' :
    form.cliente;

  let y = 14;

  // ── Header ──
  if (logoData) {
    doc.addImage(logoData, 'JPEG', ml, y, 22, 18);
  } else {
    doc.setFillColor(34, 139, 34);
    doc.rect(ml, y, 22, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('MJ', ml + 11, y + 10, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  const hx = ml + 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('MICRO DIESEL DE MERIDA', hx, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Héctor Armando Rocha Sepúlveda', hx, y + 10);
  doc.text('Circuito Colonias No. 752 x 64j y 64k, Col. Castilla Cámara', hx, y + 14);
  doc.text('CP 97278, Mérida, Yucatán    Tel (999) 317.22.46    Cel. 999 3597970', hx, y + 18);

  y += 24;

  // ── Title bar ──
  doc.setFillColor(30, 64, 175);
  doc.rect(ml, y, cw, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('COTIZACIÓN', pw / 2, y + 5.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  y += 12;

  // ── Info block ──
  const col1 = ml;
  const col2 = ml + cw / 2 + 2;
  const colW = cw / 2 - 2;

  const infoRow = (label: string, value: string, x: number, cy: number, _w = colW) => {
    void _w;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(label + ':', x, cy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(value || '—', x + doc.getTextWidth(label + ': ') + 0.5, cy);
  };

  infoRow('No. Cotización', form.numeroCotizacion, col1, y);
  infoRow('Fecha', form.fecha ? new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—', col2, y);
  y += 5;

  infoRow('Cliente', clienteNombre, col1, y);
  if (plantilla === 'ayuntamiento') {
    infoRow('Departamento', form.departamento, col2, y);
  } else if (plantilla === 'red_ambiental') {
    infoRow('Núm. Proveedor', numProveedor, col2, y);
  }
  y += 5;

  infoRow('Marca', form.marca, col1, y);
  infoRow('Modelo', form.modelo, col2, y);
  y += 5;

  infoRow('Año', form.anio || '—', col1, y);
  if (form.placas) infoRow('Placas', form.placas, col2, y);
  y += 5;

  if (form.kms) {
    infoRow('Kilometraje', form.kms + ' km', col1, y);
    y += 5;
  }

  if (plantilla === 'ayuntamiento') {
    if (form.inventario) { infoRow('No. Inventario', form.inventario, col1, y); }
    if (form.ordenServicio) { infoRow('O.S.', form.ordenServicio, col2, y); }
    if (form.inventario || form.ordenServicio) y += 5;
  }

  if (form.trabajo) {
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(ml, y, ml + cw, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('TRABAJO / DESCRIPCIÓN:', ml, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const trabajoLines = doc.splitTextToSize(form.trabajo, cw);
    doc.text(trabajoLines, ml, y);
    y += trabajoLines.length * 4 + 2;
  }

  y += 3;

  // ── Table helper ──
  const drawTable = (
    title: string,
    items: ItemLinea[],
    headerColor: [number, number, number],
    startY: number
  ): number => {
    let ty = startY;
    const cols = { no: 10, cantidad: 18, descripcion: cw - 10 - 18 - 30 - 28, precioUnit: 30, total: 28 };
    const rowH = 6;
    const hRowH = 7;

    doc.setFillColor(...headerColor);
    doc.rect(ml, ty, cw, hRowH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title, ml + 3, ty + 5);
    doc.setTextColor(0, 0, 0);
    ty += hRowH;

    doc.setFillColor(240, 244, 255);
    doc.rect(ml, ty, cw, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    let cx = ml;
    doc.text('NO', cx + 2, ty + 4.2); cx += cols.no;
    doc.text('CANTIDAD', cx + 1, ty + 4.2); cx += cols.cantidad;
    doc.text('DESCRIPCIÓN', cx + 1, ty + 4.2); cx += cols.descripcion;
    doc.text('PRECIO UNIT.', cx + 1, ty + 4.2); cx += cols.precioUnit;
    doc.text('TOTAL', cx + 1, ty + 4.2);
    ty += rowH;

    doc.setDrawColor(200, 210, 230);
    doc.line(ml, ty, ml + cw, ty);

    if (items.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('(Sin partidas)', ml + cw / 2, ty + 4.2, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      ty += rowH;
      doc.line(ml, ty, ml + cw, ty);
    } else {
      items.forEach((item, idx) => {
        const rowTotal = calcItem(item);
        const bg: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
        doc.setFillColor(...bg);
        doc.rect(ml, ty, cw, rowH, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        cx = ml;
        doc.text(String(idx + 1), cx + 2, ty + 4.2); cx += cols.no;
        doc.text(item.cantidad || '1', cx + 2, ty + 4.2); cx += cols.cantidad;
        const descLines = doc.splitTextToSize(item.descripcion || '', cols.descripcion - 2);
        doc.text(descLines[0] || '', cx + 2, ty + 4.2); cx += cols.descripcion;
        doc.text('$' + fmtPeso(parseNum(item.precioUnitario)), cx + 1, ty + 4.2); cx += cols.precioUnit;
        doc.text('$' + fmtPeso(rowTotal), cx + 1, ty + 4.2);
        ty += rowH;
        doc.setDrawColor(230, 235, 245);
        doc.line(ml, ty, ml + cw, ty);
      });
    }

    doc.setFillColor(245, 247, 250);
    doc.rect(ml, ty, cw, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const sectionTotal = items.reduce((s, i) => s + calcItem(i), 0);
    const labelX = ml + cols.no + cols.cantidad + cols.descripcion;
    doc.text('Subtotal ' + title + ':', labelX + 1, ty + 4.2);
    doc.text('$' + fmtPeso(sectionTotal), ml + cols.no + cols.cantidad + cols.descripcion + cols.precioUnit + 1, ty + 4.2);
    ty += rowH;
    doc.setDrawColor(180, 190, 210);
    doc.line(ml, ty, ml + cw, ty);
    ty += 3;

    return ty;
  };

  y = drawTable('REFACCIONES', form.refacciones, [30, 100, 180], y);
  y = drawTable('MANO DE OBRA', form.manoDeObra, [22, 120, 70], y);

  // ── Totals ──
  const totalsX = ml + cw - 65;
  const totalsW = 65;
  const numTotRows = form.incluirIVA ? 4 : 3;

  doc.setDrawColor(180, 190, 210);
  doc.rect(totalsX, y, totalsW, 6 * numTotRows + 2, 'S');

  const totRow = (label: string, value: string, bold = false, bgColor?: [number, number, number]) => {
    if (bgColor) {
      doc.setFillColor(...bgColor);
      doc.rect(totalsX, y, totalsW, 6, 'F');
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9 : 8);
    doc.setTextColor(bold ? 0 : 50, bold ? 0 : 50, bold ? 0 : 50);
    doc.text(label, totalsX + 2, y + 4.2);
    doc.text(value, totalsX + totalsW - 2, y + 4.2, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 6;
    doc.setDrawColor(210, 215, 225);
    doc.line(totalsX, y, totalsX + totalsW, y);
  };

  totRow('Subtotal Refacciones:', '$' + fmtPeso(subtotalRef));
  totRow('Subtotal M. de Obra:', '$' + fmtPeso(subtotalMO));
  totRow('SUBTOTAL:', '$' + fmtPeso(subtotal), true, [245, 247, 250]);
  if (form.incluirIVA) {
    totRow('IVA (16%):', '$' + fmtPeso(iva), false, [255, 251, 235]);
  }

  // TOTAL row with dark blue background + white text
  doc.setFillColor(30, 64, 175);
  doc.rect(totalsX, y, totalsW, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', totalsX + 2, y + 4.3);
  doc.text('$' + fmtPeso(total), totalsX + totalsW - 2, y + 4.3, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 8;

  // ── Observaciones ──
  if (form.observaciones) {
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(ml, y, ml + cw, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('OBSERVACIONES:', ml, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const obsLines = doc.splitTextToSize(form.observaciones, cw);
    doc.text(obsLines, ml, y);
    y += obsLines.length * 4 + 3;
  }

  // ── Signature ──
  y += 10;
  doc.setDrawColor(100, 100, 100);
  doc.line(ml, y, ml + 60, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Autorizado por', ml + 15, y + 4);

  const nombre = form.numeroCotizacion ? `Cotizacion-${form.numeroCotizacion}` : 'Cotizacion';
  doc.save(`${nombre}.pdf`);
}

// ─── Template cards ───────────────────────────────────────────────────────────

const PLANTILLAS: { key: Plantilla; emoji: string; label: string; desc: string }[] = [
  {
    key: 'ayuntamiento',
    emoji: '🏛️',
    label: 'Ayuntamiento de Mérida',
    desc: 'Incluye No. Inventario, O.S. y Departamento',
  },
  {
    key: 'red_ambiental',
    emoji: '♻️',
    label: 'Red Ambiental',
    desc: 'Núm. Proveedor fijo P004093',
  },
  {
    key: 'general',
    emoji: '🔧',
    label: 'DIMMSA / General',
    desc: 'Selecciona cliente y vehículo registrado',
  },
];

// ─── Items table (editable) ───────────────────────────────────────────────────

function TablaItems({
  titulo,
  color,
  items,
  onChange,
}: {
  titulo: string;
  color: 'blue' | 'green';
  items: ItemLinea[];
  onChange: (items: ItemLinea[]) => void;
}) {
  const headerCls = color === 'blue' ? 'bg-blue-700 text-white' : 'bg-emerald-700 text-white';
  const addBtnCls =
    color === 'blue'
      ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100';

  const update = (id: string, field: keyof ItemLinea, value: string) =>
    onChange(items.map(i => (i.id === id ? { ...i, [field]: value } : i)));
  const remove = (id: string) => onChange(items.filter(i => i.id !== id));
  const add = () => onChange([...items, newItem()]);

  const subtotal = items.reduce((s, i) => s + calcItem(i), 0);

  return (
    <div className="mb-5">
      <div className={`px-4 py-2.5 rounded-t-xl font-bold text-sm ${headerCls}`}>{titulo}</div>
      <div className="border border-slate-200 rounded-b-xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 gap-1 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-1">No.</div>
          <div className="col-span-1">Cant.</div>
          <div className="col-span-6">Descripción</div>
          <div className="col-span-2">Precio Unit.</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1"></div>
        </div>

        {items.length === 0 && (
          <div className="px-4 py-4 text-center text-slate-400 text-sm italic">
            Sin partidas — haz clic en &quot;+ Agregar&quot;
          </div>
        )}

        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`grid grid-cols-12 gap-1 px-3 py-2 items-center border-t border-slate-100 ${
              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
            }`}
          >
            <div className="col-span-1 text-xs text-slate-500 font-mono">{idx + 1}</div>
            <div className="col-span-1">
              <input
                type="number"
                min="1"
                value={item.cantidad}
                onChange={e => update(item.id, 'cantidad', e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="1"
              />
            </div>
            <div className="col-span-6">
              <input
                type="text"
                value={item.descripcion}
                onChange={e => update(item.id, 'descripcion', e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="Descripción del concepto..."
              />
            </div>
            <div className="col-span-2">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.precioUnitario}
                  onChange={e => update(item.id, 'precioUnitario', e.target.value)}
                  className="w-full pl-5 pr-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="col-span-1 text-right text-sm font-semibold text-slate-700">
              ${fmtPeso(calcItem(item))}
            </div>
            <div className="col-span-1 flex justify-end">
              <button
                onClick={() => remove(item.id)}
                className="text-slate-400 hover:text-rose-500 transition-colors text-lg leading-none"
                title="Eliminar"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        <div className="border-t-2 border-slate-200 px-3 py-2 flex items-center justify-between bg-slate-50">
          <button
            onClick={add}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${addBtnCls}`}
          >
            + Agregar partida
          </button>
          <div className="text-sm font-bold text-slate-700">
            Subtotal: <span className="text-slate-900">${fmtPeso(subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Preview screen ───────────────────────────────────────────────────────────

function VistaPreviaContenido({
  plantilla,
  form,
  onEditar,
}: {
  plantilla: Plantilla;
  form: FormCotizacion;
  onEditar: () => void;
}) {
  const [generando, setGenerando] = useState(false);
  const { subtotalRef, subtotalMO, subtotal, iva, total } = calcTotales(form);

  const clienteNombre =
    plantilla === 'ayuntamiento'
      ? 'Ayuntamiento de Mérida'
      : plantilla === 'red_ambiental'
      ? 'Red Ambiental'
      : form.cliente;

  const handleDescargar = async () => {
    setGenerando(true);
    try {
      await generarYDescargarPDF(plantilla, form);
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div>
      <SectionTitle title="Vista Previa — Cotización" subtitle="Revisa antes de descargar el PDF" />

      <div className="flex gap-3 mb-6 flex-wrap">
        <Btn variant="ghost" onClick={onEditar}>← Editar</Btn>
        <Btn variant="success" onClick={handleDescargar} disabled={generando}>
          {generando ? '⏳ Generando...' : '⬇️ Descargar PDF'}
        </Btn>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-4 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mj-merida.jpg" alt="Logo MJ Mérida" className="h-14 w-auto rounded object-contain bg-white p-1" />
          <div>
            <div className="font-bold text-base">MICRO DIESEL DE MERIDA</div>
            <div className="text-xs text-slate-300">Héctor Armando Rocha Sepúlveda</div>
            <div className="text-xs text-slate-400">Circuito Colonias No. 752 x 64j y 64k, Col. Castilla Cámara, CP 97278, Mérida, Yucatán</div>
            <div className="text-xs text-slate-400">Tel (999) 317.22.46 · Cel. 999 3597970</div>
          </div>
        </div>

        <div className="bg-blue-700 text-white text-center font-bold py-2 tracking-widest text-sm">
          COTIZACIÓN
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-6 py-4 text-sm border-b border-slate-200">
          <InfoFila label="No. Cotización" value={form.numeroCotizacion} />
          <InfoFila
            label="Fecha"
            value={form.fecha ? new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
          />
          <InfoFila label="Cliente" value={clienteNombre} />
          {plantilla === 'ayuntamiento' && <InfoFila label="Departamento" value={form.departamento} />}
          {plantilla === 'red_ambiental' && <InfoFila label="Núm. Proveedor" value={NUM_PROVEEDOR_RED_AMBIENTAL} />}
          <InfoFila label="Marca" value={form.marca} />
          <InfoFila label="Modelo" value={form.modelo} />
          {form.anio && <InfoFila label="Año" value={form.anio} />}
          {form.placas && <InfoFila label="Placas" value={form.placas} />}
          {form.kms && <InfoFila label="Kilometraje" value={form.kms + ' km'} />}
          {plantilla === 'ayuntamiento' && form.inventario && <InfoFila label="No. Inventario" value={form.inventario} />}
          {plantilla === 'ayuntamiento' && form.ordenServicio && <InfoFila label="O.S." value={form.ordenServicio} />}
        </div>

        {form.trabajo && (
          <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trabajo / Descripción: </span>
            <p className="text-sm text-slate-700 mt-1">{form.trabajo}</p>
          </div>
        )}

        <TablaPreview titulo="REFACCIONES" colorHeader="bg-blue-700" items={form.refacciones} subtotal={subtotalRef} />
        <TablaPreview titulo="MANO DE OBRA" colorHeader="bg-emerald-700" items={form.manoDeObra} subtotal={subtotalMO} />

        <div className="px-6 py-4 border-t border-slate-200">
          <div className="ml-auto w-full max-w-xs space-y-1.5">
            <FilaTotal label="Subtotal Refacciones" value={subtotalRef} />
            <FilaTotal label="Subtotal Mano de Obra" value={subtotalMO} />
            <FilaTotal label="SUBTOTAL" value={subtotal} bold />
            {form.incluirIVA && <FilaTotal label="IVA (16%)" value={iva} highlight="amber" />}
            <FilaTotal label="TOTAL" value={total} bold highlight="blue" />
          </div>
        </div>

        {form.observaciones && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Observaciones</p>
            <p className="text-sm text-slate-700">{form.observaciones}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoFila({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}: </span>
      <span className="text-sm text-slate-800">{value || '—'}</span>
    </div>
  );
}

function TablaPreview({ titulo, colorHeader, items, subtotal }: { titulo: string; colorHeader: string; items: ItemLinea[]; subtotal: number }) {
  return (
    <div className="border-b border-slate-200">
      <div className={`${colorHeader} text-white px-6 py-2 text-xs font-bold uppercase tracking-wider`}>{titulo}</div>
      {items.length === 0 ? (
        <div className="px-6 py-3 text-slate-400 text-sm italic text-center">Sin partidas</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">No.</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Cant.</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Descripción</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Precio Unit.</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-3 py-2 text-slate-500 text-xs">{idx + 1}</td>
                <td className="px-3 py-2 text-slate-700">{item.cantidad}</td>
                <td className="px-3 py-2 text-slate-800">{item.descripcion}</td>
                <td className="px-3 py-2 text-right text-slate-700">${fmtPeso(parseNum(item.precioUnitario))}</td>
                <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmtPeso(calcItem(item))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr>
              <td colSpan={4} className="px-3 py-2 text-right text-sm font-bold text-slate-600">Subtotal {titulo}:</td>
              <td className="px-3 py-2 text-right font-bold text-slate-900">${fmtPeso(subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

function FilaTotal({ label, value, bold = false, highlight }: { label: string; value: number; bold?: boolean; highlight?: 'blue' | 'amber' }) {
  const cls =
    highlight === 'blue' ? 'bg-blue-700 text-white px-3 py-2 rounded-lg'
    : highlight === 'amber' ? 'bg-amber-50 px-3 py-1 rounded'
    : 'px-1 py-0.5';
  return (
    <div className={`flex justify-between items-center ${cls}`}>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'}`}>{label}:</span>
      <span className={`text-sm ${bold ? 'font-bold' : ''}`}>${fmtPeso(value)}</span>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function VistaCotizaciones({
  clientes = [],
  vehiculos = [],
}: {
  clientes?: Cliente[];
  vehiculos?: Vehiculo[];
}) {
  const [pantalla, setPantalla] = useState<Pantalla>('selector');
  const [plantillaActual, setPlantillaActual] = useState<Plantilla>('general');

  const buildForm = useCallback((p: Plantilla): FormCotizacion => ({
    numeroCotizacion: nextCotizacionNumber(),
    clienteId: '',
    cliente: p === 'ayuntamiento' ? 'Ayuntamiento de Mérida' : p === 'red_ambiental' ? 'Red Ambiental' : '',
    vehiculoId: '',
    marca: '',
    modelo: '',
    anio: '',
    placas: '',
    kms: '',
    fecha: hoy(),
    trabajo: '',
    observaciones: '',
    incluirIVA: false,
    inventario: '',
    ordenServicio: '',
    departamento: '',
    refacciones: [newItem()],
    manoDeObra: [newItem()],
  }), []);

  const [form, setForm] = useState<FormCotizacion>(() => buildForm('general'));

  // Track selected client's vehicles for the General template
  const [vehiculosCliente, setVehiculosCliente] = useState<Vehiculo[]>([]);

  useEffect(() => {
    if (form.clienteId) {
      setVehiculosCliente(vehiculos.filter(v => v.clienteId === form.clienteId));
    } else {
      setVehiculosCliente([]);
    }
  }, [form.clienteId, vehiculos]);

  const set = useCallback(<K extends keyof FormCotizacion>(key: K, val: FormCotizacion[K]) => {
    setForm(f => ({ ...f, [key]: val }));
  }, []);

  const elegirPlantilla = (p: Plantilla) => {
    setPlantillaActual(p);
    setForm(buildForm(p));
    setPantalla('formulario');
  };

  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    setForm(f => ({
      ...f,
      clienteId,
      cliente: cliente?.nombre ?? '',
      vehiculoId: '',
      marca: '',
      modelo: '',
      anio: '',
      placas: '',
    }));
  };

  const handleVehiculoChange = (vehiculoId: string) => {
    const v = vehiculos.find(veh => veh.id === vehiculoId);
    setForm(f => ({
      ...f,
      vehiculoId,
      marca: v?.marca ?? f.marca,
      modelo: v?.modelo ?? f.modelo,
      anio: v?.anio ?? f.anio,
      placas: v?.placa ?? f.placas,
    }));
  };

  const canPreview =
    form.marca.trim() !== '' &&
    form.modelo.trim() !== '' &&
    (plantillaActual !== 'ayuntamiento' || form.inventario.trim() !== '') &&
    (plantillaActual !== 'ayuntamiento' || (form.departamento !== '' && !form.departamento.startsWith('—')));

  // ─── Selector ───────────────────────────────────────────────────────────────
  if (pantalla === 'selector') {
    return (
      <div>
        <SectionTitle title="Nueva Cotización" subtitle="Selecciona la plantilla según el cliente" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {PLANTILLAS.map(p => (
            <button
              key={p.key}
              onClick={() => elegirPlantilla(p.key)}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all duration-150 text-left group"
            >
              <span className="text-4xl">{p.emoji}</span>
              <div>
                <div className="font-bold text-slate-800 text-sm text-center group-hover:text-indigo-700">{p.label}</div>
                <div className="text-xs text-slate-500 mt-1 text-center">{p.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Formulario ─────────────────────────────────────────────────────────────
  if (pantalla === 'formulario') {
    const labelPlantilla = PLANTILLAS.find(p => p.key === plantillaActual)?.label ?? '';

    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setPantalla('selector')} className="text-slate-400 hover:text-slate-700 transition-colors text-lg">←</button>
          <SectionTitle title={`Cotización — ${labelPlantilla}`} subtitle="Completa los datos del vehículo y las partidas" />
        </div>

        {/* ── No. Cotización (auto) + Fecha ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <Label>No. Cotización</Label>
            <div className="flex items-center gap-2">
              <Input
                value={form.numeroCotizacion}
                readOnly
                className="bg-slate-50 font-mono font-bold text-indigo-700 cursor-default"
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">auto</span>
            </div>
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
          </div>

          {/* ── Template-specific top fields ── */}
          {plantillaActual === 'general' && (
            <div>
              <Label>Cliente <span className="text-rose-500">*</span></Label>
              {clientes.length > 0 ? (
                <select
                  value={form.clienteId}
                  onChange={e => handleClienteChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">— Seleccionar cliente —</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              ) : (
                <Input
                  value={form.cliente}
                  onChange={e => set('cliente', e.target.value)}
                  placeholder="Nombre del cliente..."
                />
              )}
            </div>
          )}

          {plantillaActual === 'ayuntamiento' && (
            <>
              <div>
                <Label>No. Inventario <span className="text-rose-500">*</span></Label>
                <Input
                  value={form.inventario}
                  onChange={e => set('inventario', e.target.value)}
                  placeholder="No. Inventario (obligatorio)"
                  required
                />
              </div>
              <div>
                <Label>O.S. (Orden de Servicio)</Label>
                <Input
                  value={form.ordenServicio}
                  onChange={e => set('ordenServicio', e.target.value)}
                  placeholder="No. O.S."
                />
              </div>
            </>
          )}

          {plantillaActual === 'red_ambiental' && (
            <div>
              <Label>Núm. Proveedor</Label>
              <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-sm font-mono font-semibold select-none">
                {NUM_PROVEEDOR_RED_AMBIENTAL}
                <span className="ml-2 text-xs text-slate-400 font-normal font-sans">(fijo)</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Ayuntamiento: Departamento ── */}
        {plantillaActual === 'ayuntamiento' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <Label>Departamento <span className="text-rose-500">*</span></Label>
              <select
                value={form.departamento}
                onChange={e => set('departamento', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                {DEPARTAMENTOS_AYUNTAMIENTO.map(d => (
                  <option key={d} value={d} disabled={d.startsWith('—')}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Datos del vehículo ── */}
        <div className="border border-slate-200 rounded-xl p-4 mb-5 bg-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Datos del Vehículo</p>

          {/* Vehicle dropdown for General template when client is selected */}
          {plantillaActual === 'general' && form.clienteId && vehiculosCliente.length > 0 && (
            <div className="mb-4">
              <Label>Seleccionar vehículo registrado</Label>
              <select
                value={form.vehiculoId}
                onChange={e => handleVehiculoChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">— Seleccionar vehículo —</option>
                {vehiculosCliente.map(v => (
                  <option key={v.id} value={v.id}>
                    {[v.marca, v.modelo, v.anio, v.placa].filter(Boolean).join(' · ')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {plantillaActual === 'general' && form.clienteId && vehiculosCliente.length === 0 && (
            <p className="text-xs text-slate-500 mb-3 italic">
              Este cliente no tiene vehículos registrados — ingresa los datos manualmente.
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label>Marca <span className="text-rose-500">*</span></Label>
              <Input
                value={form.marca}
                onChange={e => set('marca', e.target.value)}
                placeholder="Ej. Ford"
                required
              />
            </div>
            <div>
              <Label>Modelo <span className="text-rose-500">*</span></Label>
              <Input
                value={form.modelo}
                onChange={e => set('modelo', e.target.value)}
                placeholder="Ej. F-150"
                required
              />
            </div>
            <div>
              <Label>Año</Label>
              <Input
                value={form.anio}
                onChange={e => set('anio', e.target.value)}
                placeholder="Ej. 2020"
              />
            </div>
            <div>
              <Label>Placas (opcional)</Label>
              <Input
                value={form.placas}
                onChange={e => set('placas', e.target.value)}
                placeholder="AAA-000-A"
              />
            </div>
            <div>
              <Label>Kilometraje (opcional)</Label>
              <Input
                value={form.kms}
                onChange={e => set('kms', e.target.value)}
                placeholder="Ej. 85000"
              />
            </div>
          </div>
        </div>

        {/* ── Trabajo ── */}
        <div className="mb-5">
          <Label>Trabajo / Descripción</Label>
          <textarea
            value={form.trabajo}
            onChange={e => set('trabajo', e.target.value)}
            rows={3}
            placeholder="Describe el trabajo a realizar..."
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
          />
        </div>

        {/* ── REFACCIONES ── */}
        <TablaItems titulo="REFACCIONES" color="blue" items={form.refacciones} onChange={items => set('refacciones', items)} />

        {/* ── MANO DE OBRA ── */}
        <TablaItems titulo="MANO DE OBRA" color="green" items={form.manoDeObra} onChange={items => set('manoDeObra', items)} />

        {/* ── IVA + Totales ── */}
        <div className="border border-slate-200 rounded-xl p-4 mb-5 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <input
              id="iva-toggle"
              type="checkbox"
              checked={form.incluirIVA}
              onChange={e => set('incluirIVA', e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <label htmlFor="iva-toggle" className="text-sm font-semibold text-slate-700 cursor-pointer">
              ¿Incluir IVA? (16%)
            </label>
          </div>
          {(() => {
            const { subtotalRef, subtotalMO, subtotal, iva, total } = calcTotales(form);
            return (
              <div className="ml-auto w-full max-w-xs space-y-1.5">
                <FilaTotal label="Subtotal Refacciones" value={subtotalRef} />
                <FilaTotal label="Subtotal Mano de Obra" value={subtotalMO} />
                <FilaTotal label="SUBTOTAL" value={subtotal} bold />
                {form.incluirIVA && <FilaTotal label="IVA (16%)" value={iva} highlight="amber" />}
                <FilaTotal label="TOTAL" value={total} bold highlight="blue" />
              </div>
            );
          })()}
        </div>

        {/* ── Observaciones ── */}
        <div className="mb-6">
          <Label>Observaciones</Label>
          <textarea
            value={form.observaciones}
            onChange={e => set('observaciones', e.target.value)}
            rows={2}
            placeholder="Notas adicionales, condiciones de pago..."
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
          />
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3 flex-wrap items-center">
          <Btn variant="ghost" onClick={() => setPantalla('selector')}>← Cambiar plantilla</Btn>
          <Btn variant="primary" onClick={() => setPantalla('preview')} disabled={!canPreview}>
            Ver Vista Previa →
          </Btn>
          {!canPreview && (
            <span className="text-xs text-rose-500">
              {form.marca.trim() === '' || form.modelo.trim() === ''
                ? '* Marca y Modelo son obligatorios'
                : plantillaActual === 'ayuntamiento' && form.inventario.trim() === ''
                ? '* No. Inventario es obligatorio para Ayuntamiento'
                : '* Selecciona un departamento válido'}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ─── Preview ─────────────────────────────────────────────────────────────────
  return (
    <VistaPreviaContenido
      plantilla={plantillaActual}
      form={form}
      onEditar={() => setPantalla('formulario')}
    />
  );
}
