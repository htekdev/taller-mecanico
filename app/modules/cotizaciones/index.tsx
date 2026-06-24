'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Cliente, Vehiculo, Refaccion, Proveedor, TrabajoRefaccion, ManoDeObraItem } from '@/app/types';
import { Label, Input, Btn, SectionTitle } from '@/app/components/ui';
import { CATEGORIAS, UNIDADES } from '@/app/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const COT_COUNTER_KEY   = 'taller_cot_counter';
const COT_HISTORY_KEY   = 'taller_cotizaciones';
const NUM_PROVEEDOR_RED = 'P004093';

// Lista de departamentos del Ayuntamiento de Mérida — confirmada por Sofia.
// Para agregar nuevos departamentos, añadir una entrada a este arreglo.
const DEPARTAMENTOS_AYUNTAMIENTO: string[] = [
  '— Seleccionar departamento —',
  'Obras públicas mantenimiento vial',
  'Servicios públicos aseo urbano poniente',
  'Servicios públicos aseo urbano oriente',
];

const AUTORIZADOS: string[] = ['Héctor Rocha', 'Sofía Rocha'];

// ─── Storage helpers ──────────────────────────────────────────────────────────

function assignNextNumber(): string {
  if (typeof window === 'undefined') return 'COT-001';
  const current = parseInt(localStorage.getItem(COT_COUNTER_KEY) ?? '0', 10);
  const next = current + 1;
  localStorage.setItem(COT_COUNTER_KEY, String(next));
  return `COT-${String(next).padStart(3, '0')}`;
}

function loadHistory(): CotizacionGuardada[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(COT_HISTORY_KEY) ?? '[]') as CotizacionGuardada[]; }
  catch { return []; }
}

function persistHistory(list: CotizacionGuardada[]): void {
  localStorage.setItem(COT_HISTORY_KEY, JSON.stringify(list));
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
  numeroCotizacion: string;   // empty until saved
  clienteId: string;
  cliente: string;
  vehiculoId: string;
  marca: string;
  modelo: string;
  anio: string;
  placas: string;
  kms: string;
  fecha: string;
  trabajo: string;
  observaciones: string;
  incluirIVA: boolean;
  autorizadoPor: string;      // Héctor Rocha | Sofía Rocha
  // Ayuntamiento
  inventario: string;
  ordenServicio: string;
  departamento: string;
  // Items
  refacciones: ItemLinea[];
  manoDeObra: ItemLinea[];
}

interface CotizacionGuardada {
  id: string;
  numeroCotizacion: string;
  plantilla: Plantilla;
  cliente: string;
  fecha: string;
  total: number;
  savedAt: string;
  cancelada?: boolean;         // soft-cancel: stays in history with badge
  editada?: boolean;           // set to true after first edit
  convertida?: boolean;        // set to true after conversion to trabajo
  form: FormCotizacion;
}

// Payload sent to page.tsx when converting a cotización to a trabajo
export interface ConversionTrabajo {
  cotizacionId: string;
  cotizacionNumero: string;
  clienteId: string;
  vehiculoId: string;
  descripcion: string;
  fecha: string;
  manoDeObraItems: ManoDeObraItem[];
  partes: TrabajoRefaccion[];
}

// Input to onAgregarRefaccion — refaccion data + optional purchase order info
export interface AgregarRefaccionInput {
  refaccion: Omit<Refaccion, 'id'>;
  ordenCompra?: {
    proveedorId?: string;
    numeroOrden?: string;
    descripcion?: string;
    cantidad: number;
  };
}

type Pantalla = 'inicio' | 'formulario' | 'preview';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const newItem = (): ItemLinea => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  descripcion: '', cantidad: '1', precioUnitario: '',
});

const parseNum = (s: string): number => { const n = parseFloat(s.replace(/,/g, '')); return isNaN(n) ? 0 : n; };
const fmtPeso  = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const calcItem = (item: ItemLinea) => parseNum(item.cantidad) * parseNum(item.precioUnitario);

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
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  const pw = 215.9, ph = 279.4, ml = 14, mr = 14, cw = pw - ml - mr;
  void ph;

  // Load logo
  let logoData: string | null = null;
  try {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = '/logo-mj-merida.jpg'; });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    logoData = canvas.toDataURL('image/jpeg', 0.92);
  } catch { /* silent */ }

  const { subtotal, iva, total } = calcTotales(form);
  const clienteNombre = plantilla === 'ayuntamiento' ? 'Ayuntamiento de Mérida'
    : plantilla === 'red_ambiental' ? 'Red Ambiental' : form.cliente;

  let y = 14;

  // ── Header ──
  if (logoData) {
    doc.addImage(logoData, 'JPEG', ml, y, 22, 18);
  } else {
    doc.setFillColor(34, 139, 34); doc.rect(ml, y, 22, 18, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('MJ', ml + 11, y + 10, { align: 'center' }); doc.setTextColor(0, 0, 0);
  }
  const hx = ml + 26;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('MICRO DIESEL DE MERIDA', hx, y + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('Héctor Armando Rocha Sepúlveda', hx, y + 10);
  doc.text('Circuito Colonias No. 752 x 64j y 64k, Col. Castilla Cámara', hx, y + 14);
  doc.text('CP 97278, Mérida, Yucatán    Tel (999) 317.22.46    Cel. 999 3597970', hx, y + 18);
  y += 24;

  // ── Title bar ──
  doc.setFillColor(30, 64, 175); doc.rect(ml, y, cw, 8, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('COTIZACIÓN', pw / 2, y + 5.5, { align: 'center' }); doc.setTextColor(0, 0, 0);
  y += 12;

  // ── Info block ──
  const col1 = ml, col2 = ml + cw / 2 + 2;
  const infoRow = (label: string, value: string, x: number, cy: number) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text(label + ':', x, cy);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(value || '—', x + doc.getTextWidth(label + ': ') + 0.5, cy);
  };

  infoRow('No. Cotización', form.numeroCotizacion, col1, y);
  infoRow('Fecha', form.fecha ? new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—', col2, y); y += 5;
  infoRow('Cliente', clienteNombre, col1, y);
  if (plantilla === 'ayuntamiento') infoRow('Departamento', form.departamento, col2, y);
  else if (plantilla === 'red_ambiental') infoRow('Núm. Proveedor', NUM_PROVEEDOR_RED, col2, y);
  y += 5;
  infoRow('Marca', form.marca, col1, y); infoRow('Modelo', form.modelo, col2, y); y += 5;
  infoRow('Año', form.anio || '—', col1, y);
  if (form.placas) infoRow('Placas', form.placas, col2, y);
  y += 5;
  if (form.kms) { infoRow('Kilometraje', form.kms + ' km', col1, y); y += 5; }
  if (plantilla === 'ayuntamiento') {
    if (form.inventario) infoRow('No. Inventario', form.inventario, col1, y);
    if (form.ordenServicio) infoRow('O.S.', form.ordenServicio, col2, y);
    if (form.inventario || form.ordenServicio) y += 5;
  }
  if (form.trabajo) {
    y += 2; doc.setDrawColor(200, 200, 200); doc.line(ml, y, ml + cw, y); y += 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text('TRABAJO / DESCRIPCIÓN:', ml, y); y += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const tl = doc.splitTextToSize(form.trabajo, cw); doc.text(tl, ml, y); y += tl.length * 4 + 2;
  }
  y += 3;

  // ── Item table helper ──
  const drawTable = (title: string, items: ItemLinea[], hColor: [number, number, number], sy: number): number => {
    let ty = sy;
    const cols = { no: 10, qty: 18, desc: cw - 10 - 18 - 30 - 28, price: 30, tot: 28 };
    const rh = 6, hh = 7;
    doc.setFillColor(...hColor); doc.rect(ml, ty, cw, hh, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(title, ml + 3, ty + 5); doc.setTextColor(0, 0, 0); ty += hh;
    doc.setFillColor(240, 244, 255); doc.rect(ml, ty, cw, rh, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    let cx = ml;
    doc.text('NO', cx + 2, ty + 4.2); cx += cols.no;
    doc.text('CANTIDAD', cx + 1, ty + 4.2); cx += cols.qty;
    doc.text('DESCRIPCIÓN', cx + 1, ty + 4.2); cx += cols.desc;
    doc.text('PRECIO UNIT.', cx + 1, ty + 4.2); cx += cols.price;
    doc.text('TOTAL', cx + 1, ty + 4.2);
    ty += rh; doc.setDrawColor(200, 210, 230); doc.line(ml, ty, ml + cw, ty);
    if (items.length === 0) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
      doc.text('(Sin partidas)', ml + cw / 2, ty + 4.2, { align: 'center' }); doc.setTextColor(0, 0, 0); ty += rh;
    } else {
      items.forEach((item, idx) => {
        const rowTotal = calcItem(item);
        const bg: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
        doc.setFillColor(...bg); doc.rect(ml, ty, cw, rh, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(0, 0, 0);
        cx = ml;
        doc.text(String(idx + 1), cx + 2, ty + 4.2); cx += cols.no;
        doc.text(item.cantidad || '1', cx + 2, ty + 4.2); cx += cols.qty;
        doc.text((doc.splitTextToSize(item.descripcion || '', cols.desc - 2))[0] || '', cx + 2, ty + 4.2); cx += cols.desc;
        doc.text('$' + fmtPeso(parseNum(item.precioUnitario)), cx + 1, ty + 4.2); cx += cols.price;
        doc.text('$' + fmtPeso(rowTotal), cx + 1, ty + 4.2);
        ty += rh; doc.setDrawColor(230, 235, 245); doc.line(ml, ty, ml + cw, ty);
      });
    }
    // Section subtotal row (inside each table)
    doc.setFillColor(245, 247, 250); doc.rect(ml, ty, cw, rh, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    const lx = ml + cols.no + cols.qty + cols.desc;
    doc.text('Subtotal ' + title + ':', lx + 1, ty + 4.2);
    doc.text('$' + fmtPeso(items.reduce((s, i) => s + calcItem(i), 0)), ml + cols.no + cols.qty + cols.desc + cols.price + 1, ty + 4.2);
    ty += rh; doc.setDrawColor(180, 190, 210); doc.line(ml, ty, ml + cw, ty); ty += 3;
    return ty;
  };

  y = drawTable('REFACCIONES', form.refacciones, [30, 100, 180], y);
  y = drawTable('MANO DE OBRA', form.manoDeObra, [22, 120, 70], y);

  // ── Totals block — simplified: Subtotal / IVA / TOTAL ──
  const tx = ml + cw - 58, tw = 58;
  const numTotRows = form.incluirIVA ? 3 : 2;
  doc.setDrawColor(180, 190, 210); doc.rect(tx, y, tw, 6 * numTotRows + 2, 'S');

  const totRow = (label: string, value: string, bold = false, bg?: [number, number, number]) => {
    if (bg) { doc.setFillColor(...bg); doc.rect(tx, y, tw, 6, 'F'); }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9 : 8);
    doc.setTextColor(bold ? 0 : 50, bold ? 0 : 50, bold ? 0 : 50);
    doc.text(label, tx + 2, y + 4.2);
    doc.text(value, tx + tw - 2, y + 4.2, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 6; doc.setDrawColor(210, 215, 225); doc.line(tx, y, tx + tw, y);
  };

  // Single Subtotal row (no separate ref/labor lines)
  totRow('SUBTOTAL:', '$' + fmtPeso(subtotal), true, [245, 247, 250]);
  if (form.incluirIVA) totRow('IVA (16%):', '$' + fmtPeso(iva), false, [255, 251, 235]);

  // TOTAL — dark blue row with white text
  doc.setFillColor(30, 64, 175); doc.rect(tx, y, tw, 6, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', tx + 2, y + 4.3);
  doc.text('$' + fmtPeso(total), tx + tw - 2, y + 4.3, { align: 'right' });
  doc.setTextColor(0, 0, 0); y += 8;

  // ── Observaciones ──
  if (form.observaciones) {
    y += 4; doc.setDrawColor(200, 200, 200); doc.line(ml, y, ml + cw, y); y += 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text('OBSERVACIONES:', ml, y); y += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const ol = doc.splitTextToSize(form.observaciones, cw); doc.text(ol, ml, y); y += ol.length * 4 + 3;
  }

  // ── Signature + Autorizador ──
  y += 10;
  doc.setDrawColor(100, 100, 100); doc.line(ml, y, ml + 65, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  const autoLabel = form.autorizadoPor ? form.autorizadoPor : 'Autorizado por';
  doc.text(autoLabel, ml + 3, y + 4);

  doc.save(`${form.numeroCotizacion || 'Cotizacion'}.pdf`);
}

// ─── Template definitions ─────────────────────────────────────────────────────

const PLANTILLAS: { key: Plantilla; emoji: string; label: string; desc: string }[] = [
  { key: 'ayuntamiento',  emoji: '🏛️', label: 'Ayuntamiento de Mérida', desc: 'Inventario, O.S. y Departamento' },
  { key: 'red_ambiental', emoji: '♻️', label: 'Red Ambiental',           desc: 'Núm. Proveedor fijo P004093'  },
  { key: 'general',       emoji: '🔧', label: 'DIMMSA / General',        desc: 'Selecciona cliente y vehículo' },
];

// ─── Editable items table ─────────────────────────────────────────────────────

function TablaItems({ titulo, color, items, onChange }: {
  titulo: string; color: 'blue' | 'green'; items: ItemLinea[]; onChange: (items: ItemLinea[]) => void;
}) {
  const hCls = color === 'blue' ? 'bg-blue-700 text-white' : 'bg-emerald-700 text-white';
  const aBtnCls = color === 'blue'
    ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100';
  const upd = (id: string, f: keyof ItemLinea, v: string) => onChange(items.map(i => i.id === id ? { ...i, [f]: v } : i));
  const rem = (id: string) => onChange(items.filter(i => i.id !== id));
  const add = () => onChange([...items, newItem()]);
  const sub = items.reduce((s, i) => s + calcItem(i), 0);

  return (
    <div className="mb-5">
      <div className={`px-4 py-2.5 rounded-t-xl font-bold text-sm ${hCls}`}>{titulo}</div>
      <div className="border border-slate-200 rounded-b-xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 gap-1 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-1">No.</div><div className="col-span-1">Cant.</div>
          <div className="col-span-6">Descripción</div><div className="col-span-2">Precio Unit.</div>
          <div className="col-span-1 text-right">Total</div><div className="col-span-1"/>
        </div>
        {items.length === 0 && (
          <div className="px-4 py-4 text-center text-slate-400 text-sm italic">Sin partidas — haz clic en &quot;+ Agregar&quot;</div>
        )}
        {items.map((item, idx) => (
          <div key={item.id} className={`grid grid-cols-12 gap-1 px-3 py-2 items-center border-t border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
            <div className="col-span-1 text-xs text-slate-500 font-mono">{idx + 1}</div>
            <div className="col-span-1">
              <input type="number" min="1" value={item.cantidad} onChange={e => upd(item.id, 'cantidad', e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="1"/>
            </div>
            <div className="col-span-6">
              <input type="text" value={item.descripcion} onChange={e => upd(item.id, 'descripcion', e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="Descripción..."/>
            </div>
            <div className="col-span-2">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <input type="number" min="0" step="0.01" value={item.precioUnitario} onChange={e => upd(item.id, 'precioUnitario', e.target.value)}
                  className="w-full pl-5 pr-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0.00"/>
              </div>
            </div>
            <div className="col-span-1 text-right text-sm font-semibold text-slate-700">${fmtPeso(calcItem(item))}</div>
            <div className="col-span-1 flex justify-end">
              <button onClick={() => rem(item.id)} className="text-slate-400 hover:text-rose-500 transition-colors text-lg leading-none" title="Eliminar">×</button>
            </div>
          </div>
        ))}
        <div className="border-t-2 border-slate-200 px-3 py-2 flex items-center justify-between bg-slate-50">
          <button onClick={add} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${aBtnCls}`}>+ Agregar partida</button>
          <div className="text-sm font-bold text-slate-700">Subtotal: <span className="text-slate-900">${fmtPeso(sub)}</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── Preview screen ───────────────────────────────────────────────────────────

function VistaPreviaContenido({ plantilla, form, entry, onEditar, onNueva }: {
  plantilla: Plantilla; form: FormCotizacion; entry: CotizacionGuardada | null; onEditar: () => void; onNueva: () => void;
}) {
  const [generando, setGenerando] = useState(false);
  const { subtotalRef, subtotalMO, subtotal, iva, total } = calcTotales(form);
  const clienteNombre = plantilla === 'ayuntamiento' ? 'Ayuntamiento de Mérida'
    : plantilla === 'red_ambiental' ? 'Red Ambiental' : form.cliente;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <SectionTitle title={`Cotización ${form.numeroCotizacion}`} subtitle="Guardada — descarga el PDF cuando quieras"/>
        {entry?.editada && (
          <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full self-start mt-1">Editada</span>
        )}
        {entry?.cancelada && (
          <span className="text-xs font-semibold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full self-start mt-1">Cancelada</span>
        )}
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <Btn variant="ghost" onClick={onNueva}>← Inicio</Btn>
        {!entry?.cancelada && <Btn variant="ghost" onClick={onEditar}>✏️ Editar</Btn>}
        <Btn variant="success" onClick={async () => { setGenerando(true); try { await generarYDescargarPDF(plantilla, form); } finally { setGenerando(false); } }} disabled={generando}>
          {generando ? '⏳ Generando...' : '⬇️ Descargar PDF'}
        </Btn>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="bg-slate-800 text-white px-6 py-4 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mj-merida.jpg" alt="Logo MJ Mérida" className="h-14 w-auto rounded object-contain bg-white p-1"/>
          <div>
            <div className="font-bold text-base">MICRO DIESEL DE MERIDA</div>
            <div className="text-xs text-slate-300">Héctor Armando Rocha Sepúlveda</div>
            <div className="text-xs text-slate-400">Circuito Colonias No. 752 x 64j y 64k, Col. Castilla Cámara, CP 97278, Mérida, Yucatán</div>
            <div className="text-xs text-slate-400">Tel (999) 317.22.46 · Cel. 999 3597970</div>
          </div>
        </div>
        <div className="bg-blue-700 text-white text-center font-bold py-2 tracking-widest text-sm">COTIZACIÓN</div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-6 py-4 text-sm border-b border-slate-200">
          <InfoFila label="No. Cotización" value={form.numeroCotizacion}/>
          <InfoFila label="Fecha" value={form.fecha ? new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}/>
          <InfoFila label="Cliente" value={clienteNombre}/>
          {plantilla === 'ayuntamiento' && <InfoFila label="Departamento" value={form.departamento}/>}
          {plantilla === 'red_ambiental' && <InfoFila label="Núm. Proveedor" value={NUM_PROVEEDOR_RED}/>}
          <InfoFila label="Marca" value={form.marca}/><InfoFila label="Modelo" value={form.modelo}/>
          {form.anio && <InfoFila label="Año" value={form.anio}/>}
          {form.placas && <InfoFila label="Placas" value={form.placas}/>}
          {form.kms && <InfoFila label="Kilometraje" value={form.kms + ' km'}/>}
          {plantilla === 'ayuntamiento' && form.inventario && <InfoFila label="No. Inventario" value={form.inventario}/>}
          {plantilla === 'ayuntamiento' && form.ordenServicio && <InfoFila label="O.S." value={form.ordenServicio}/>}
          {form.autorizadoPor && <InfoFila label="Autorizado por" value={form.autorizadoPor}/>}
        </div>

        {form.trabajo && <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trabajo / Descripción: </span>
          <p className="text-sm text-slate-700 mt-1">{form.trabajo}</p>
        </div>}

        <TablaPreview titulo="REFACCIONES" colorHeader="bg-blue-700" items={form.refacciones} subtotal={subtotalRef}/>
        <TablaPreview titulo="MANO DE OBRA" colorHeader="bg-emerald-700" items={form.manoDeObra} subtotal={subtotalMO}/>

        {/* Totals — simplified (single Subtotal line) */}
        <div className="px-6 py-4 border-t border-slate-200">
          <div className="ml-auto w-full max-w-xs space-y-1.5">
            <FilaTotal label="SUBTOTAL" value={subtotal} bold/>
            {form.incluirIVA && <FilaTotal label="IVA (16%)" value={iva} highlight="amber"/>}
            <FilaTotal label="TOTAL" value={total} bold highlight="blue"/>
          </div>
        </div>

        {form.observaciones && <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Observaciones</p>
          <p className="text-sm text-slate-700">{form.observaciones}</p>
        </div>}

        {form.autorizadoPor && <div className="px-6 py-3 border-t border-slate-200 text-xs text-slate-500">
          Autorizado por: <span className="font-semibold text-slate-700">{form.autorizadoPor}</span>
        </div>}
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
      {items.length === 0 ? <div className="px-6 py-3 text-slate-400 text-sm italic text-center">Sin partidas</div> : (
        <table className="w-full text-sm">
          <thead className="bg-slate-100"><tr>
            {['No.', 'Cant.', 'Descripción', 'Precio Unit.', 'Total'].map((h, i) => (
              <th key={h} className={`px-3 py-2 text-xs font-semibold text-slate-500 uppercase ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr></thead>
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
          <tfoot className="bg-slate-50 border-t border-slate-200"><tr>
            <td colSpan={4} className="px-3 py-2 text-right text-sm font-bold text-slate-600">Subtotal {titulo}:</td>
            <td className="px-3 py-2 text-right font-bold text-slate-900">${fmtPeso(subtotal)}</td>
          </tr></tfoot>
        </table>
      )}
    </div>
  );
}

function FilaTotal({ label, value, bold = false, highlight }: { label: string; value: number; bold?: boolean; highlight?: 'blue' | 'amber' }) {
  const cls = highlight === 'blue' ? 'bg-blue-700 text-white px-3 py-2 rounded-lg'
    : highlight === 'amber' ? 'bg-amber-50 px-3 py-1 rounded' : 'px-1 py-0.5';
  return (
    <div className={`flex justify-between items-center ${cls}`}>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'}`}>{label}:</span>
      <span className={`text-sm ${bold ? 'font-bold' : ''}`}>${fmtPeso(value)}</span>
    </div>
  );
}

// ─── History list ─────────────────────────────────────────────────────────────


// ── ModalAgregarInventario ────────────────────────────────────────────────────
// Full inventory registration popup + automatic purchase order creation

function ModalAgregarInventario({ item, proveedores, onGuardar, onCerrar }: {
  item: ItemLinea;
  proveedores: Proveedor[];
  onGuardar: (data: AgregarRefaccionInput) => Promise<void>;
  onCerrar: () => void;
}) {
  const [costoCompra, setCostoCompra] = useState('');
  const [stock, setStock]             = useState(item.cantidad || '1');
  const [categoria, setCategoria]     = useState(CATEGORIAS[0]);
  const [unidad, setUnidad]           = useState(UNIDADES[0]);
  const [proveedorId, setProveedorId] = useState('');
  const [numeroOrden, setNumeroOrden] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando]     = useState(false);
  const precioVenta = parseNum(item.precioUnitario);
  const cantNum     = Math.max(1, parseNum(stock) || 1);

  const handleGuardar = async () => {
    const costo = parseNum(costoCompra);
    if (costo <= 0) return;
    setGuardando(true);
    try {
      await onGuardar({
        refaccion: {
          nombre:      item.descripcion,
          codigo:      '',
          categoria,
          unidad,
          precioCompra: costo,
          stock:        cantNum,
          stockMinimo:  1,
          proveedorId:  proveedorId || undefined,
        },
        ordenCompra: {
          proveedorId:  proveedorId || undefined,
          numeroOrden:  numeroOrden.trim() || undefined,
          descripcion:  descripcion.trim() || undefined,
          cantidad:     cantNum,
        },
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCerrar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 relative overflow-y-auto max-h-[92vh]"
        onClick={e => e.stopPropagation()}>
        <button onClick={onCerrar} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all text-lg font-bold">✕</button>

        <div>
          <div className="text-2xl mb-1">📦</div>
          <h3 className="font-bold text-slate-800 text-lg">Dar de Alta en Inventario</h3>
          <p className="text-sm text-slate-500 mt-1">
            Registra la pieza y se creará una orden de compra recibida automáticamente.
          </p>
        </div>

        {/* Piece info — readonly summary */}
        <div className="bg-slate-50 rounded-xl p-3 text-sm border border-slate-200">
          <div className="font-semibold text-slate-700">{item.descripcion}</div>
          <div className="text-slate-500 text-xs mt-0.5">
            Precio de venta: <span className="font-medium text-slate-700">${fmtPeso(precioVenta)}</span>
          </div>
        </div>

        {/* Required fields */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Costo de compra <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <Input type="number" min="0" step="0.01"
                  className="pl-6"
                  value={costoCompra}
                  onChange={e => setCostoCompra(e.target.value)}
                  placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label>Cantidad recibida</Label>
              <Input type="number" min="1"
                value={stock}
                onChange={e => setStock(e.target.value)}
                placeholder="1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoría</Label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Unidad</Label>
              <select value={unidad} onChange={e => setUnidad(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 pt-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Orden de Compra (opcional)</p>
          <div className="space-y-3">
            <div>
              <Label>Proveedor</Label>
              <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Sin proveedor —</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            <div>
              <Label>Número de orden</Label>
              <Input
                value={numeroOrden}
                onChange={e => setNumeroOrden(e.target.value)}
                placeholder="Ej. OC-2026-001 (opcional)" />
            </div>

            <div>
              <Label>Descripción</Label>
              <Input
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Notas adicionales (opcional)" />
            </div>
          </div>
        </div>

        {/* Totals preview */}
        {parseNum(costoCompra) > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Costo total:</span>
              <span className="font-bold text-slate-800">${fmtPeso(parseNum(costoCompra) * cantNum)}</span>
            </div>
            {parseNum(costoCompra) > 0 && precioVenta > 0 && (
              <div className="flex justify-between text-slate-500 text-xs mt-1">
                <span>Utilidad estimada por pieza:</span>
                <span className="text-emerald-600 font-medium">
                  ${fmtPeso(precioVenta - parseNum(costoCompra))}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Btn variant="ghost" onClick={onCerrar}>Cancelar</Btn>
          <Btn variant="success" onClick={handleGuardar}
            disabled={guardando || parseNum(costoCompra) <= 0}>
            {guardando ? 'Guardando...' : '✅ Agregar al inventario'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── ModalReconciliacion ───────────────────────────────────────────────────────
// Full-screen overlay: checks inventory for each refacción, prompts to add missing ones

interface PartResuelta {
  refaccionId: string;
  nombre: string;
  codigo: string;
  precioCompra: number;
  precioVenta: number;
  cantidad: number;
}

function ModalReconciliacion({ cotizacion, inventario, proveedores, onAgregarRefaccion, onCrearTrabajo, onCerrar, onNavegar }: {
  cotizacion: CotizacionGuardada;
  inventario: Refaccion[];
  proveedores: Proveedor[];
  onAgregarRefaccion: (data: AgregarRefaccionInput) => Promise<Refaccion | null>;
  onCrearTrabajo: (partes: TrabajoRefaccion[], manoDeObra: ManoDeObraItem[]) => Promise<void>;
  onCerrar: () => void;
  onNavegar: () => void;
}) {
  // Auto-match refacciones by name on mount
  const [resolvedMap, setResolvedMap] = useState<Record<string, PartResuelta>>(() => {
    const map: Record<string, PartResuelta> = {};
    for (const item of cotizacion.form.refacciones) {
      if (!item.descripcion.trim()) continue;
      const match = inventario.find(r =>
        r.nombre.toLowerCase().trim() === item.descripcion.toLowerCase().trim()
      );
      if (match) {
        map[item.id] = {
          refaccionId: match.id, nombre: match.nombre, codigo: match.codigo,
          precioCompra: match.precioCompra,
          precioVenta: parseNum(item.precioUnitario),
          cantidad: parseNum(item.cantidad),
        };
      }
    }
    return map;
  });

  const [addingItem, setAddingItem] = useState<ItemLinea | null>(null);
  const [creando, setCreando] = useState(false);
  const [exito, setExito] = useState(false);

  const refacciones = cotizacion.form.refacciones.filter(i => i.descripcion.trim() !== '');
  const manoDeObraItems = cotizacion.form.manoDeObra.filter(i => i.descripcion.trim() !== '');
  const pendientes = refacciones.filter(i => !resolvedMap[i.id]);
  const allResolved = refacciones.length === 0 || pendientes.length === 0;

  const handleAgregarInventario = async (data: AgregarRefaccionInput) => {
    if (!addingItem) return;
    const nueva = await onAgregarRefaccion(data);
    if (nueva) {
      setResolvedMap(prev => ({
        ...prev,
        [addingItem.id]: {
          refaccionId: nueva.id, nombre: nueva.nombre, codigo: nueva.codigo,
          precioCompra: nueva.precioCompra,
          precioVenta: parseNum(addingItem.precioUnitario),
          cantidad: parseNum(addingItem.cantidad),
        },
      }));
    }
    setAddingItem(null);
  };

  const handleCrearTrabajo = async () => {
    setCreando(true);
    try {
      const partes: TrabajoRefaccion[] = refacciones
        .filter(i => resolvedMap[i.id])
        .map(i => {
          const r = resolvedMap[i.id];
          const cant = Math.max(1, parseNum(i.cantidad));
          return {
            refaccionId: r.refaccionId, nombre: r.nombre, codigo: r.codigo,
            cantidad: cant,
            precioCompra: r.precioCompra,
            precioVenta: r.precioVenta,
            subtotal: cant * r.precioVenta,
            costoTotal: cant * r.precioCompra,
          };
        });

      const manoDeObra: ManoDeObraItem[] = manoDeObraItems.map(i => ({
        id: `cot-${cotizacion.id}-${i.id}`,
        concepto: i.descripcion,
        precio: parseNum(i.precioUnitario) * Math.max(1, parseNum(i.cantidad)),
      }));

      await onCrearTrabajo(partes, manoDeObra);
      setExito(true);
    } finally {
      setCreando(false);
    }
  };

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (exito) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-slate-800">¡Trabajo Creado!</h2>
          <p className="text-sm text-slate-500">
            El trabajo fue creado a partir de <strong>{cotizacion.numeroCotizacion}</strong>.
            Puedes verlo en la pestaña de Trabajos.
          </p>
          <Btn variant="success" onClick={() => { onCerrar(); onNavegar(); }}>Ir a Trabajos →</Btn>
        </div>
      </div>
    );
  }

  // ── Vista principal de reconciliación ─────────────────────────────────────
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={addingItem ? undefined : onCerrar}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 relative overflow-y-auto max-h-[92vh]"
          onClick={e => e.stopPropagation()}>
          <button onClick={onCerrar} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all text-lg font-bold">✕</button>

          <div>
            <div className="text-2xl mb-1">🔧</div>
            <h2 className="text-xl font-bold text-slate-800">Convertir a Trabajo</h2>
            <p className="text-sm text-slate-500 mt-1">
              Verificando refacciones de <strong>{cotizacion.numeroCotizacion}</strong> contra el inventario.
            </p>
          </div>

          {/* Refacciones */}
          {refacciones.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Refacciones</p>
              {refacciones.map(item => {
                const resolved = resolvedMap[item.id];
                return (
                  <div key={item.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${resolved ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
                    <span className="text-xl flex-shrink-0">{resolved ? '✅' : '⚠️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm truncate">{item.descripcion}</div>
                      <div className="text-xs text-slate-500">
                        Cant: {item.cantidad} · ${fmtPeso(parseNum(item.precioUnitario))}
                        {resolved && <span className="ml-2 text-emerald-600 font-medium">✓ En inventario</span>}
                      </div>
                    </div>
                    {!resolved && (
                      <button
                        onClick={() => setAddingItem(item)}
                        className="flex-shrink-0 text-xs font-bold px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors whitespace-nowrap">
                        + Agregar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Mano de obra — passes through automatically */}
          {manoDeObraItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mano de Obra</p>
              {manoDeObraItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-emerald-50 border-emerald-200">
                  <span className="text-xl flex-shrink-0">✅</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm truncate">{item.descripcion}</div>
                    <div className="text-xs text-slate-500">${fmtPeso(parseNum(item.precioUnitario))}</div>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">Mano de obra</span>
                </div>
              ))}
            </div>
          )}

          {refacciones.length === 0 && manoDeObraItems.length === 0 && (
            <div className="text-sm text-slate-500 italic text-center py-4">
              Sin partidas en esta cotización.
            </div>
          )}

          {/* Barra de estado */}
          <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${allResolved ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
            {allResolved
              ? '✅ Todas las piezas están en inventario. ¡Listo para crear el trabajo!'
              : `⚠️ ${pendientes.length} pieza(s) sin registrar en inventario.`}
          </div>

          <div className="flex gap-3">
            <Btn variant="ghost" onClick={onCerrar}>Cancelar</Btn>
            <button
              onClick={handleCrearTrabajo}
              disabled={!allResolved || creando}
              className={`flex-1 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${allResolved && !creando ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              {creando ? '⏳ Creando trabajo...' : '🔧 Crear Trabajo'}
            </button>
          </div>
        </div>
      </div>

      {/* Mini popup de inventario — z-[70] para quedar sobre el modal principal */}
      {addingItem && (
        <ModalAgregarInventario
          item={addingItem}
          proveedores={proveedores}
          onGuardar={handleAgregarInventario}
          onCerrar={() => setAddingItem(null)}
        />
      )}
    </>
  );
}

function HistorialCotizaciones({
  history,
  onVer,
  onCancelar,
  onConvertir,
}: {
  history: CotizacionGuardada[];
  onVer: (entry: CotizacionGuardada) => void;
  onCancelar: (id: string) => void;
  onConvertir?: (entry: CotizacionGuardada) => void;
}) {
  const [filtroCliente, setFiltroCliente] = useState('');
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const clientesUnicos = Array.from(new Set(history.map(h => h.cliente))).filter(Boolean).sort();
  const filtradas = filtroCliente ? history.filter(h => h.cliente === filtroCliente) : history;

  const handleCancelar = (id: string) => {
    if (confirmando === id) {
      onCancelar(id);
      setConfirmando(null);
    } else {
      setConfirmando(id);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-lg font-bold text-slate-700">📋 Historial de Cotizaciones</h3>
        {clientesUnicos.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filtrar:</span>
            <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Todos los clientes</option>
              {clientesUnicos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {filtradas.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-sm">{filtroCliente ? `Sin cotizaciones para "${filtroCliente}"` : 'Aún no hay cotizaciones guardadas'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-2">No. Cot.</div>
            <div className="col-span-3">Cliente</div>
            <div className="col-span-2">Fecha</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-3"/>
          </div>

          {filtradas.map(entry => (
            <div key={entry.id} className={`grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-xl border transition-all ${entry.cancelada ? 'bg-rose-50 border-rose-200 opacity-75' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'}`}>
              {/* Badge */}
              <div className="col-span-2 flex flex-col gap-1">
                <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded w-fit">
                  {entry.numeroCotizacion}
                </span>
                <div className="flex gap-1 flex-wrap">
                  {entry.editada && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Editada</span>}
                  {entry.cancelada && <span className="text-xs px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-full font-medium">Cancelada</span>}
                  {entry.convertida && <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">✅ Convertida</span>}
                </div>
              </div>

              {/* Client */}
              <div className="col-span-3">
                <p className="font-semibold text-slate-800 text-sm truncate">{entry.cliente || '—'}</p>
                <p className="text-xs text-slate-400">
                  {entry.plantilla === 'ayuntamiento' ? '🏛️' : entry.plantilla === 'red_ambiental' ? '♻️' : '🔧'}{' '}
                  {PLANTILLAS.find(p => p.key === entry.plantilla)?.label}
                </p>
              </div>

              {/* Date */}
              <div className="col-span-2 text-sm text-slate-600">
                {entry.fecha ? new Date(entry.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
              </div>

              {/* Total */}
              <div className={`col-span-2 text-right font-bold text-sm ${entry.cancelada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                ${fmtPeso(entry.total)}
              </div>

              {/* Actions */}
              <div className="col-span-3 flex justify-end gap-1.5 flex-wrap">
                <button onClick={() => onVer(entry)}
                  className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap">
                  Ver →
                </button>
                {!entry.cancelada && !entry.convertida && onConvertir && (
                  <button onClick={() => onConvertir(entry)}
                    className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap">
                    🔧 Convertir
                  </button>
                )}
                {!entry.cancelada && (
                  <button onClick={() => handleCancelar(entry.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border ${
                      confirmando === entry.id
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-rose-500 border-rose-200 hover:bg-rose-50'
                    }`}>
                    {confirmando === entry.id ? '¿Confirmar?' : 'Cancelar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function VistaCotizaciones({
  clientes = [],
  vehiculos = [],
  inventario = [],
  proveedores = [],
  onConvertirATrabajo,
  onAgregarRefaccion,
  onNavToTrabajos,
}: {
  clientes?: Cliente[];
  vehiculos?: Vehiculo[];
  inventario?: Refaccion[];
  proveedores?: Proveedor[];
  onConvertirATrabajo?: (data: ConversionTrabajo) => Promise<void>;
  onAgregarRefaccion?: (data: AgregarRefaccionInput) => Promise<Refaccion | null>;
  onNavToTrabajos?: () => void;
}) {
  const [pantalla, setPantalla]     = useState<Pantalla>('inicio');
  const [plantilla, setPlantilla]   = useState<Plantilla>('general');
  const [history, setHistory]       = useState<CotizacionGuardada[]>([]);
  // When editing an existing entry, track its id so we reuse its number
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [viewEntry, setViewEntry]       = useState<CotizacionGuardada | null>(null);
  // Conversion modal: tracks which cotización is being reconciled
  const [reconciliandoId, setReconciliandoId] = useState<string | null>(null);

  useEffect(() => { setHistory(loadHistory()); }, []);

  const blankForm = useCallback((p: Plantilla): FormCotizacion => ({
    numeroCotizacion: '',
    clienteId: '', cliente: p === 'ayuntamiento' ? 'Ayuntamiento de Mérida' : p === 'red_ambiental' ? 'Red Ambiental' : '',
    vehiculoId: '', marca: '', modelo: '', anio: '', placas: '', kms: '',
    fecha: hoy(), trabajo: '', observaciones: '',
    incluirIVA: false, autorizadoPor: '',
    inventario: '', ordenServicio: '', departamento: '',
    refacciones: [newItem()], manoDeObra: [newItem()],
  }), []);

  const [form, setForm] = useState<FormCotizacion>(() => blankForm('general'));

  const [vehiculosCliente, setVehiculosCliente] = useState<Vehiculo[]>([]);
  useEffect(() => {
    setVehiculosCliente(form.clienteId ? vehiculos.filter(v => v.clienteId === form.clienteId) : []);
  }, [form.clienteId, vehiculos]);

  const set = useCallback(<K extends keyof FormCotizacion>(key: K, val: FormCotizacion[K]) => {
    setForm(f => ({ ...f, [key]: val }));
  }, []);

  const elegirPlantilla = (p: Plantilla) => {
    setPlantilla(p); setForm(blankForm(p)); setEditingId(null); setViewEntry(null);
    setPantalla('formulario');
  };

  const handleClienteChange = (clienteId: string) => {
    const c = clientes.find(c => c.id === clienteId);
    setForm(f => ({ ...f, clienteId, cliente: c?.nombre ?? '', vehiculoId: '', marca: '', modelo: '', anio: '', placas: '' }));
  };

  const handleVehiculoChange = (vehiculoId: string) => {
    const v = vehiculos.find(v => v.id === vehiculoId);
    setForm(f => ({ ...f, vehiculoId, marca: v?.marca ?? f.marca, modelo: v?.modelo ?? f.modelo, anio: v?.anio ?? f.anio, placas: v?.placa ?? f.placas }));
  };

  // ── Save / Update ──────────────────────────────────────────────────────────
  const handleGuardar = () => {
    const { total } = calcTotales(form);
    const clienteNombre = plantilla === 'ayuntamiento' ? 'Ayuntamiento de Mérida'
      : plantilla === 'red_ambiental' ? 'Red Ambiental' : form.cliente;

    let savedForm: FormCotizacion;
    let entry: CotizacionGuardada;
    const list = loadHistory();

    if (editingId) {
      // ── EDIT: reuse original number, mark as editada ──
      const existing = list.find(e => e.id === editingId)!;
      savedForm = { ...form, numeroCotizacion: existing.numeroCotizacion };
      entry = { ...existing, cliente: clienteNombre, fecha: form.fecha, total, form: savedForm, editada: true };
      const updated = list.map(e => e.id === editingId ? entry : e);
      persistHistory(updated);
    } else {
      // ── NEW: assign fresh sequential number ──
      const numero = assignNextNumber();
      savedForm = { ...form, numeroCotizacion: numero };
      entry = {
        id: Date.now().toString(), numeroCotizacion: numero, plantilla,
        cliente: clienteNombre, fecha: form.fecha, total,
        savedAt: new Date().toISOString(), form: savedForm,
      };
      list.unshift(entry);
      persistHistory(list);
    }

    setHistory(loadHistory());
    setForm(savedForm);
    setViewEntry(entry);
    setPantalla('preview');
  };

  // ── Cancel a quote (soft) ─────────────────────────────────────────────────
  const handleCancelar = (id: string) => {
    const list = loadHistory().map(e => e.id === id ? { ...e, cancelada: true } : e);
    persistHistory(list);
    setHistory(list);
    if (viewEntry?.id === id) setViewEntry(v => v ? { ...v, cancelada: true } : v);
  };

  // ── Conversion handlers ──────────────────────────────────────────────────
  const handleConvertir = (entry: CotizacionGuardada) => {
    setReconciliandoId(entry.id);
  };

  const handleCrearTrabajo = async (partes: TrabajoRefaccion[], manoDeObra: ManoDeObraItem[]) => {
    const cot = history.find(e => e.id === reconciliandoId);
    if (!cot || !onConvertirATrabajo) return;
    const descripcionBase = cot.form.trabajo?.trim() || 'Trabajo';
    await onConvertirATrabajo({
      cotizacionId:      cot.id,
      cotizacionNumero:  cot.numeroCotizacion,
      clienteId:         cot.form.clienteId,
      vehiculoId:        cot.form.vehiculoId,
      descripcion:       `${descripcionBase} (Desde ${cot.numeroCotizacion})`,
      fecha:             cot.form.fecha || hoy(),
      manoDeObraItems:   manoDeObra,
      partes,
    });
    // Mark cotización as convertida in localStorage
    const list = loadHistory().map(e => e.id === cot.id ? { ...e, convertida: true } : e);
    persistHistory(list);
    setHistory(list);
  };

  // ── Open saved entry for viewing ──────────────────────────────────────────
  const handleVerEntry = (entry: CotizacionGuardada) => {
    setPlantilla(entry.plantilla); setForm(entry.form); setViewEntry(entry); setEditingId(null);
    setPantalla('preview');
  };

  // ── Start editing from preview ────────────────────────────────────────────
  const handleEditar = () => {
    if (viewEntry) setEditingId(viewEntry.id);
    setPantalla('formulario');
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const canSave =
    form.marca.trim() !== '' && form.modelo.trim() !== '' &&
    (plantilla !== 'ayuntamiento' || form.inventario.trim() !== '') &&
    (plantilla !== 'ayuntamiento' || (form.departamento !== '' && !form.departamento.startsWith('—')));

  // ══════════════════════════════════════════════════════════════════════════
  // Pantalla: INICIO
  // ══════════════════════════════════════════════════════════════════════════
  if (pantalla === 'inicio') {
    const cotizacionReconciliando = reconciliandoId ? history.find(e => e.id === reconciliandoId) ?? null : null;
    return (
      <div>
        <SectionTitle title="Cotizaciones" subtitle="Crea y guarda cotizaciones para tus clientes"/>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Nueva Cotización</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANTILLAS.map(p => (
            <button key={p.key} onClick={() => elegirPlantilla(p.key)}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all duration-150 group">
              <span className="text-4xl">{p.emoji}</span>
              <div>
                <div className="font-bold text-slate-800 text-sm text-center group-hover:text-indigo-700">{p.label}</div>
                <div className="text-xs text-slate-500 mt-1 text-center">{p.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <HistorialCotizaciones
          history={history}
          onVer={handleVerEntry}
          onCancelar={handleCancelar}
          onConvertir={onConvertirATrabajo ? handleConvertir : undefined}
        />
        {cotizacionReconciliando && onAgregarRefaccion && (
          <ModalReconciliacion
            cotizacion={cotizacionReconciliando}
            inventario={inventario}
            proveedores={proveedores}
            onAgregarRefaccion={onAgregarRefaccion}
            onCrearTrabajo={handleCrearTrabajo}
            onCerrar={() => setReconciliandoId(null)}
            onNavegar={() => { setReconciliandoId(null); onNavToTrabajos?.(); }}
          />
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Pantalla: FORMULARIO
  // ══════════════════════════════════════════════════════════════════════════
  if (pantalla === 'formulario') {
    const labelPlantilla = PLANTILLAS.find(p => p.key === plantilla)?.label ?? '';
    const isEditing = editingId !== null;

    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setPantalla(viewEntry ? 'preview' : 'inicio')} className="text-slate-400 hover:text-slate-700 transition-colors text-lg">←</button>
          <SectionTitle
            title={isEditing ? `Editando — ${form.numeroCotizacion}` : `Cotización — ${labelPlantilla}`}
            subtitle={isEditing ? 'Se conservará el mismo número al guardar' : 'Completa los datos y guarda para asignar número'}
          />
        </div>

        {/* Edit indicator or new quote info banner */}
        {isEditing ? (
          <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-amber-500 text-lg">✏️</span>
            <p className="text-sm text-amber-700">
              Editando <strong>{form.numeroCotizacion}</strong> — el número se conservará al guardar.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-amber-500 text-lg">🔢</span>
            <p className="text-sm text-amber-700">El número <strong>COT-XXX</strong> se asignará automáticamente al guardar.</p>
          </div>
        )}

        {/* Top fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}/>
          </div>

          {plantilla === 'general' && (
            <div>
              <Label>Cliente <span className="text-rose-500">*</span></Label>
              {clientes.length > 0 ? (
                <select value={form.clienteId} onChange={e => handleClienteChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                  <option value="">— Seleccionar cliente —</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              ) : (
                <Input value={form.cliente} onChange={e => set('cliente', e.target.value)} placeholder="Nombre del cliente..."/>
              )}
            </div>
          )}

          {plantilla === 'ayuntamiento' && <>
            <div>
              <Label>No. Inventario <span className="text-rose-500">*</span></Label>
              <Input value={form.inventario} onChange={e => set('inventario', e.target.value)} placeholder="No. Inventario (obligatorio)" required/>
            </div>
            <div>
              <Label>O.S. (Orden de Servicio)</Label>
              <Input value={form.ordenServicio} onChange={e => set('ordenServicio', e.target.value)} placeholder="No. O.S."/>
            </div>
          </>}

          {plantilla === 'red_ambiental' && (
            <div>
              <Label>Núm. Proveedor</Label>
              <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-sm font-mono font-semibold select-none">
                {NUM_PROVEEDOR_RED}<span className="ml-2 text-xs text-slate-400 font-normal font-sans">(fijo)</span>
              </div>
            </div>
          )}
        </div>

        {/* Ayuntamiento Departamento */}
        {plantilla === 'ayuntamiento' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <Label>Departamento <span className="text-rose-500">*</span></Label>
              <select value={form.departamento} onChange={e => set('departamento', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                {DEPARTAMENTOS_AYUNTAMIENTO.map(d => (
                  <option key={d} value={d} disabled={d.startsWith('—')}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Vehicle section */}
        <div className="border border-slate-200 rounded-xl p-4 mb-5 bg-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Datos del Vehículo</p>
          {plantilla === 'general' && form.clienteId && vehiculosCliente.length > 0 && (
            <div className="mb-4">
              <Label>Seleccionar vehículo registrado</Label>
              <select value={form.vehiculoId} onChange={e => handleVehiculoChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                <option value="">— Seleccionar vehículo —</option>
                {vehiculosCliente.map(v => (
                  <option key={v.id} value={v.id}>{[v.marca, v.modelo, v.anio, v.placa].filter(Boolean).join(' · ')}</option>
                ))}
              </select>
            </div>
          )}
          {plantilla === 'general' && form.clienteId && vehiculosCliente.length === 0 && (
            <p className="text-xs text-slate-500 mb-3 italic">Sin vehículos registrados — ingresa los datos manualmente.</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div><Label>Marca <span className="text-rose-500">*</span></Label><Input value={form.marca} onChange={e => set('marca', e.target.value)} placeholder="Ej. Ford"/></div>
            <div><Label>Modelo <span className="text-rose-500">*</span></Label><Input value={form.modelo} onChange={e => set('modelo', e.target.value)} placeholder="Ej. F-150"/></div>
            <div><Label>Año</Label><Input value={form.anio} onChange={e => set('anio', e.target.value)} placeholder="Ej. 2020"/></div>
            <div><Label>Placas (opcional)</Label><Input value={form.placas} onChange={e => set('placas', e.target.value)} placeholder="AAA-000-A"/></div>
            <div><Label>Kilometraje (opcional)</Label><Input value={form.kms} onChange={e => set('kms', e.target.value)} placeholder="Ej. 85000"/></div>
          </div>
        </div>

        {/* Trabajo */}
        <div className="mb-5">
          <Label>Trabajo / Descripción</Label>
          <textarea value={form.trabajo} onChange={e => set('trabajo', e.target.value)} rows={3}
            placeholder="Describe el trabajo a realizar..."
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"/>
        </div>

        <TablaItems titulo="REFACCIONES" color="blue" items={form.refacciones} onChange={items => set('refacciones', items)}/>
        <TablaItems titulo="MANO DE OBRA" color="green" items={form.manoDeObra} onChange={items => set('manoDeObra', items)}/>

        {/* IVA + live totals */}
        <div className="border border-slate-200 rounded-xl p-4 mb-5 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <input id="iva-toggle" type="checkbox" checked={form.incluirIVA} onChange={e => set('incluirIVA', e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"/>
            <label htmlFor="iva-toggle" className="text-sm font-semibold text-slate-700 cursor-pointer">¿Incluir IVA? (16%)</label>
          </div>
          {(() => {
            const { subtotal, iva, total } = calcTotales(form);
            return (
              <div className="ml-auto w-full max-w-xs space-y-1.5">
                <FilaTotal label="SUBTOTAL" value={subtotal} bold/>
                {form.incluirIVA && <FilaTotal label="IVA (16%)" value={iva} highlight="amber"/>}
                <FilaTotal label="TOTAL" value={total} bold highlight="blue"/>
              </div>
            );
          })()}
        </div>

        {/* Observaciones */}
        <div className="mb-5">
          <Label>Observaciones</Label>
          <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={2}
            placeholder="Notas adicionales, condiciones de pago..."
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"/>
        </div>

        {/* Autorizado por */}
        <div className="mb-6">
          <Label>Autorizado por</Label>
          <select value={form.autorizadoPor} onChange={e => set('autorizadoPor', e.target.value)}
            className="w-full sm:w-64 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
            <option value="">— Sin especificar —</option>
            {AUTORIZADOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap items-center">
          <Btn variant="ghost" onClick={() => setPantalla(viewEntry ? 'preview' : 'inicio')}>← Cancelar</Btn>
          <Btn variant="success" onClick={handleGuardar} disabled={!canSave}>
            {isEditing ? '💾 Guardar cambios' : '💾 Guardar Cotización'}
          </Btn>
          {!canSave && (
            <span className="text-xs text-rose-500">
              {form.marca.trim() === '' || form.modelo.trim() === '' ? '* Marca y Modelo son obligatorios'
                : plantilla === 'ayuntamiento' && form.inventario.trim() === '' ? '* No. Inventario es obligatorio'
                : '* Selecciona un departamento válido'}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Pantalla: PREVIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <VistaPreviaContenido
      plantilla={viewEntry?.plantilla ?? plantilla}
      form={form}
      entry={viewEntry}
      onEditar={handleEditar}
      onNueva={() => setPantalla('inicio')}
    />
  );
}
