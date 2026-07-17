'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Cliente, Vehiculo, Refaccion, Trabajo, Factura, ManoDeObraItem, TrabajoRefaccion, PricingIntel, Proveedor } from '@/app/types';
import { Label, Input, Select, Btn, SectionTitle, EmptyRow } from '@/app/components/ui';
import { labelVehiculo, fmt, getMontoPagado, formatearFecha, getHoy } from '@/app/lib/utils';
import { getPricingIntel } from '@/app/lib/pricing';

// ─── Departamentos localStorage ───────────────────────────────────────────────

import { DEPTOS_KEY, DEFAULT_DEPTOS } from '@/app/lib/departamentos-constants';

function loadDepartamentos(): string[] {
  try {
    const raw = localStorage.getItem(DEPTOS_KEY);
    if (!raw) {
      saveDepartamentos(DEFAULT_DEPTOS);
      return [...DEFAULT_DEPTOS];
    }
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [...DEFAULT_DEPTOS];
  } catch {
    return [...DEFAULT_DEPTOS];
  }
}

function saveDepartamentos(deptos: string[]): void {
  try { localStorage.setItem(DEPTOS_KEY, JSON.stringify(deptos)); } catch { /* noop */ }
}

// ─── PDF helpers (Ayuntamiento) ───────────────────────────────────────────────

function fmtPesoA(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadLogoBase64Aya(): Promise<string | null> {
  try {
    const res = await fetch('/logo-mj-merida.jpg');
    const buf = await res.arrayBuffer();
    let bin = '';
    new Uint8Array(buf).forEach(b => { bin += String.fromCharCode(b); });
    return 'data:image/jpeg;base64,' + btoa(bin);
  } catch { return null; }
}

type FiltroAyuntamiento = 'sin_tft' | 'con_tft_sin_pago' | 'facturadas' | 'todos';

async function generarPDFAyuntamiento(
  trabajos: Trabajo[],
  vehiculos: Vehiculo[],
  filtro: FiltroAyuntamiento,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });

  const pw = 279.4;
  const ml = 18, mr = 18, cw = pw - ml - mr;
  const DARK   = [15,  23,  42]  as [number, number, number];
  const MID    = [71,  85, 105]  as [number, number, number];
  const LIGHT  = [203,213,225]  as [number, number, number];
  const XLIGHT = [248,250,252]  as [number, number, number];
  const WHITE  = [255,255,255]  as [number, number, number];

  const fechaHoy = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  const fechaSlug = getHoy();

  const filtroNombres: Record<FiltroAyuntamiento, string> = {
    sin_tft:          'Sin TFT',
    con_tft_sin_pago: 'Con TFT Sin Pago',
    facturadas:       'Facturadas',
    todos:            'Todos',
  };
  const filtroSlugs: Record<FiltroAyuntamiento, string> = {
    sin_tft:          'sin-tft',
    con_tft_sin_pago: 'con-tft-sin-pago',
    facturadas:       'facturadas',
    todos:            'todos',
  };

  const trabajosAyu = trabajos.filter(t => {
    if (t.folioFiscal === '__CANCELADA__') return false;
    if (t.tipoCliente !== 'ayuntamiento') return false;
    if (filtro === 'sin_tft')          return (t.tftEstado ?? 'sin_tft') === 'sin_tft' && t.estado === 'completado';
    if (filtro === 'con_tft_sin_pago') return (t.tftEstado ?? 'sin_tft') === 'con_tft' && getMontoPagado(t) < t.total;
    if (filtro === 'facturadas')       return t.estadoFacturacion === 'facturado';
    return true;
  });

  let y = 15;

  // ═══ HEADER ════════════════════════════════════════════════════════════════
  const logoB64 = await loadLogoBase64Aya();
  if (logoB64) doc.addImage(logoB64, 'JPEG', ml, y, 16, 16);

  const cx = ml + 20;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK);
  doc.text('MICRO DIESEL DE MÉRIDA', cx, y + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MID);
  doc.text('Héctor Armando Rocha Sepúlveda', cx, y + 10);
  doc.text('Circuito Colonias No. 752, Col. Castilla Cámara, CP 97278  ·  Mérida, Yucatán', cx, y + 14.5);
  doc.text('Tel. (999) 317.22.46  ·  Cel. 999 359.79.70', cx, y + 18.5);

  y += 22;
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.4); doc.line(ml, y, ml + cw, y);
  y += 6;

  // ═══ TITLE + DATE ══════════════════════════════════════════════════════════
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...DARK);
  doc.text(`REPORTE AYUNTAMIENTO — ${filtroNombres[filtro].toUpperCase()}`, ml, y + 4);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MID);
  doc.text(fechaHoy, ml + cw, y + 4, { align: 'right' });
  y += 10;

  // ═══ CLIENT BLOCK ══════════════════════════════════════════════════════════
  doc.setFillColor(...XLIGHT);
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3);
  doc.roundedRect(ml, y, cw, 12, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MID);
  doc.text('CLIENTE', ml + 4, y + 4.5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...DARK);
  doc.text('AYUNTAMIENTO DE MÉRIDA', ml + 4, y + 9.5);
  y += 17;

  // ═══ TABLE ══════════════════════════════════════════════════════════════════
  const rh = 6;
  // cw ≈ 243.4mm landscape letter
  const wOrden = 30, wInv = 24, wVeh = 52, wDepto = 58, wDesc = 44, wTotal = 28, wTft = cw - 30 - 24 - 52 - 58 - 44 - 28;

  // thead
  doc.setFillColor(...DARK); doc.rect(ml, y, cw, rh, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...WHITE);
  const colDefs = [
    { label: 'ORDEN SERVICIO', w: wOrden, align: 'left'   as const },
    { label: 'INVENTARIO',     w: wInv,   align: 'left'   as const },
    { label: 'UNIDAD',         w: wVeh,   align: 'left'   as const },
    { label: 'DEPARTAMENTO',   w: wDepto, align: 'left'   as const },
    { label: 'DESCRIPCIÓN',    w: wDesc,  align: 'left'   as const },
    { label: 'TOTAL',          w: wTotal, align: 'right'  as const },
    { label: 'ESTADO TFT',     w: wTft,   align: 'center' as const },
  ];
  let xh = ml;
  colDefs.forEach(c => {
    const tx = c.align === 'right' ? xh + c.w - 2.5 : c.align === 'center' ? xh + c.w / 2 : xh + 2.5;
    doc.text(c.label, tx, y + 4, { align: c.align });
    xh += c.w;
  });
  doc.setTextColor(...DARK);
  y += rh;

  // rows
  let totalSum = 0;
  let pagadoSum = 0;
  trabajosAyu.forEach((t, i) => {
    const veh = vehiculos.find(v => v.id === t.vehiculoId);
    const vLabel = veh ? [veh.anio, veh.marca, veh.modelo].filter(Boolean).join(' ') : '—';
    const tftLabel = (t.tftEstado ?? 'sin_tft') === 'con_tft' ? `TFT-${t.tftNumero ?? '?'}` : 'Sin TFT';
    const pagado = getMontoPagado(t);
    totalSum += t.total;
    pagadoSum += pagado;

    if (i % 2 === 1) { doc.setFillColor(...XLIGHT); doc.rect(ml, y, cw, rh, 'F'); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...DARK);

    const rowCells = [
      { text: t.ordenServicioGob ?? '—', w: wOrden, align: 'left'   as const },
      { text: t.inventarioNum    ?? '—', w: wInv,   align: 'left'   as const },
      { text: vLabel,                    w: wVeh,   align: 'left'   as const },
      { text: t.departamento     ?? '—', w: wDepto, align: 'left'   as const },
      { text: t.descripcion,             w: wDesc,  align: 'left'   as const },
      { text: '$' + fmtPesoA(t.total),   w: wTotal, align: 'right'  as const },
      { text: tftLabel,                  w: wTft,   align: 'center' as const },
    ];
    let xr = ml;
    rowCells.forEach(c => {
      const tx = c.align === 'right' ? xr + c.w - 2.5 : c.align === 'center' ? xr + c.w / 2 : xr + 2.5;
      const txt = (doc.splitTextToSize(c.text, c.w - 4))[0] ?? '';
      doc.text(txt, tx, y + 4, { align: c.align });
      xr += c.w;
    });
    doc.setDrawColor(...LIGHT); doc.setLineWidth(0.2); doc.line(ml, y + rh, ml + cw, y + rh);
    y += rh;
  });

  if (trabajosAyu.length === 0) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...MID);
    doc.text('Sin resultados para este filtro.', ml + 2.5, y + 4);
    y += rh;
  }

  // ═══ SUMMARY ══════════════════════════════════════════════════════════════
  y += 4;
  const pendienteSum = Math.max(0, totalSum - pagadoSum);
  const sumX = ml + cw - 90;
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3); doc.line(sumX, y, ml + cw, y);
  y += 4;

  const sumRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9 : 8);
    doc.setTextColor(...(bold ? DARK : MID));
    doc.text(label, sumX + 2, y);
    if (value) doc.text(value, ml + cw, y, { align: 'right' });
    y += 5.5;
  };

  sumRow(`Trabajos incluidos: ${trabajosAyu.length}`, '');
  sumRow('Total importe:', '$' + fmtPesoA(totalSum));
  sumRow('Total abonado:', '$' + fmtPesoA(pagadoSum));

  doc.setDrawColor(...DARK); doc.setLineWidth(0.4);
  doc.line(sumX, y, ml + cw, y); y += 0.8;
  doc.line(sumX, y, ml + cw, y); y += 5;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...DARK);
  doc.text('SALDO PENDIENTE', sumX + 2, y);
  doc.text('$' + fmtPesoA(pendienteSum), ml + cw, y, { align: 'right' });
  y += 10;

  // ═══ FOOTER ═══════════════════════════════════════════════════════════════
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3); doc.line(ml, y, ml + cw, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MID);
  doc.text(`Documento generado el ${fechaHoy}  ·  Este documento no tiene validez fiscal.`, ml, y);
  doc.text('MICRO DIESEL DE MÉRIDA', ml + cw, y, { align: 'right' });

  doc.save(`reporte-ayuntamiento-${filtroSlugs[filtro]}-${fechaSlug}.pdf`);
}

// ── Finalization Modal ──────────────────────────────────────────────────────
function ModalFinalizacion({
  trabajo,
  cliente,
  vehiculo,
  onConfirmar,
  onCancelar,
}: {
  trabajo: Trabajo;
  cliente?: Cliente;
  vehiculo?: Vehiculo;
  onConfirmar: (tipo: 'factura' | 'nota') => void;
  onCancelar: () => void;
}) {
  const subtotal = trabajo.manoDeObra + trabajo.refacciones;
  const ivaFactura = Math.round(subtotal * 0.16 * 100) / 100;
  const totalFactura = subtotal + ivaFactura;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancelar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onCancelar}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all text-lg font-bold"
          aria-label="Cerrar"
        >&#x2715;</button>

        <div className="text-center space-y-1">
          <div className="text-4xl mb-2">&#127937;</div>
          <h2 className="text-xl font-bold text-slate-800">Finalizar Trabajo</h2>
          <p className="text-sm text-slate-500">El camión ya salió del taller.</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-1 text-sm">
          <div className="font-semibold text-slate-700 truncate">{trabajo.descripcion}</div>
          {cliente && <div className="text-slate-500">Cliente: {cliente.nombre}</div>}
          {vehiculo && (
            <div className="text-slate-500">
              Vehículo: {[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')}
              {vehiculo.placa && <span className="ml-1.5 text-xs font-mono bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{vehiculo.placa}</span>}
            </div>
          )}
          <div className="border-t border-slate-200 mt-2 pt-2 text-slate-700 font-medium">
            Subtotal: <span className="font-bold text-slate-900">${fmt(subtotal)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">¿Cómo se va a cobrar?</p>
          <button
            onClick={() => onConfirmar('nota')}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
          >
            <span className="text-3xl">&#128196;</span>
            <div className="flex-1">
              <div className="font-bold text-slate-800 group-hover:text-indigo-700">Nota</div>
              <div className="text-xs text-slate-500">Sin IVA — pago en efectivo o informal</div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-slate-900 text-lg">${fmt(subtotal)}</div>
              <div className="text-xs text-slate-400">sin IVA</div>
            </div>
          </button>
          <button
            onClick={() => onConfirmar('factura')}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-left group"
          >
            <span className="text-3xl">&#129534;</span>
            <div className="flex-1">
              <div className="font-bold text-slate-800 group-hover:text-amber-700">Factura Fiscal</div>
              <div className="text-xs text-slate-500">Con IVA 16% — factura oficial SAT</div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-amber-700 text-lg">${fmt(totalFactura)}</div>
              <div className="text-xs text-amber-600">+${fmt(ivaFactura)} IVA</div>
            </div>
          </button>
        </div>

        <button
          onClick={onCancelar}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 transition-all text-slate-700 font-semibold text-sm"
        >
          &#8592; Regresar — el trabajo sigue en progreso
        </button>
      </div>
    </div>
  );
}

// DEPARTAMENTOS_AYUNTAMIENTO is now managed via localStorage (see loadDepartamentos/saveDepartamentos above)

// ── Main Component ──────────────────────────────────────────────────────────
export function VistaTrabajo({
  clientes,
  vehiculos,
  inventario,
  trabajos,
  facturas,
  proveedores,
  onGuardar,
  onEditar,
  onFinalizar,
  onIrAInventario,
  onGenerarFactura,
  onRefacturar,
  onCancelarTrabajo,
  onReactivarTrabajo,
  onActualizarTft,
  onIrAFacturas,
}: {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  inventario: Refaccion[];
  trabajos: Trabajo[];
  facturas: Factura[];
  proveedores: Proveedor[];
  onGuardar: (t: Omit<Trabajo, 'id' | 'total' | 'iva'>) => Promise<void>;
  onEditar: (trabajoId: string, data: Omit<Trabajo, 'id' | 'total' | 'iva'>) => Promise<void>;
  onFinalizar: (trabajoId: string, tipo: 'factura' | 'nota') => void;
  onIrAInventario: () => void;
  onGenerarFactura: (trabajoId: string) => void;
  onRefacturar: (trabajoId: string) => void;
  onCancelarTrabajo: (trabajoId: string) => void;
  onReactivarTrabajo: (trabajoId: string) => void;
  onActualizarTft: (trabajoId: string, tftNumero: string) => Promise<void> | void;
  onIrAFacturas: () => void;
}) {
  const emptyForm = {
    clienteId: '', vehiculoId: '',
    fecha: getHoy(),
    numeroOrden: '',
    descripcion: '',
    kilometraje: '' as string | number,
    requiereFactura: false,
    folioFiscal: '',
    estado: 'pendiente' as Trabajo['estado'],
    departamento: '',
    inventarioNum: '',
    ordenServicioGob: '',
    fechaEntrada: '',
    fechaSalida: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [laborItems, setLaborItems] = useState<ManoDeObraItem[]>([]);
  const [laborConcepto, setLaborConcepto] = useState('');
  const [laborPrecio, setLaborPrecio]     = useState(0);
  // Save state — prevents double-submit and keeps form data if save fails
  const [guardandoForm, setGuardandoForm] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  // ── Servicios externos ──────────────────────────────────────
  const [showExtForm, setShowExtForm]       = useState(false);
  const [extProveedorId, setExtProveedorId] = useState('');
  const [extConcepto, setExtConcepto]       = useState('');
  const [extCostoTaller, setExtCostoTaller] = useState(0);
  const [extPrecioCliente, setExtPrecioCliente] = useState(0);
  const [partesSeleccionadas, setPartesSeleccionadas] = useState<TrabajoRefaccion[]>([]);
  const [pickerRefId, setPickerRefId]         = useState('');
  const [pickerCantidad, setPickerCantidad]   = useState(1);
  const [pickerPrecioVenta, setPickerPrecioVenta] = useState(0);
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'general' | 'ayuntamiento'>('general');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'completado'>('todos');
  const [filtroFacturacion, setFiltroFacturacion] = useState<'todos' | 'con_factura' | 'sin_factura'>('todos');
  const [filtroTft, setFiltroTft] = useState<'todos' | 'sin_tft' | 'con_tft'>('todos');
  const [filtroPendienteRefacciones, setFiltroPendienteRefacciones] = useState(false);
  const [filtroClienteId, setFiltroClienteId] = useState('');
  const [filtroVehiculoId, setFiltroVehiculoId] = useState('');
  const [confirmCancelarId, setConfirmCancelarId] = useState<string | null>(null);
  const [capturandoTftId, setCapturandoTftId] = useState<string | null>(null);
  const [tftNumeroDraft, setTftNumeroDraft] = useState('');
  const [errorTft, setErrorTft] = useState<string | null>(null);
  const [isSavingTft, setIsSavingTft] = useState(false);
  const [verCancelados, setVerCancelados] = useState(false);

  // ── Departamentos CRUD ──────────────────────────────────────────────────
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [showDeptoManager, setShowDeptoManager] = useState(false);
  const [nuevoDepto, setNuevoDepto] = useState('');

  useEffect(() => {
    setDepartamentos(loadDepartamentos());
  }, []);

  const vehiculosDelCliente = vehiculos.filter(v => v.clienteId === form.clienteId);
  const totalManoDeObra       = laborItems.reduce((s, l) => s + l.precio, 0);
  const totalVentaRefacciones = partesSeleccionadas.reduce((s, p) => s + (p.subtotal ?? 0), 0);
  const totalCostoRefacciones = partesSeleccionadas.reduce((s, p) => s + (p.costoTotal ?? 0), 0);
  const utilidadRefacciones   = totalVentaRefacciones - totalCostoRefacciones;
  const subtotalSinIVA        = totalManoDeObra + totalVentaRefacciones;
  const esAyuntamientoTab = subTab === 'ayuntamiento';

  // Auto-detect Ayuntamiento client (case-insensitive match on name containing "ayuntamiento")
  const clienteAyuntamiento = clientes.find(c => c.nombre.toLowerCase().includes('ayuntamiento'));

  const handleClienteChange = (clienteId: string) =>
    setForm(f => ({ ...f, clienteId, vehiculoId: '' }));

  const agregarLabor = () => {
    if (!laborConcepto.trim() || laborPrecio <= 0) return;
    setLaborItems(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      concepto: laborConcepto.trim(),
      precio: laborPrecio,
      tipo: 'interno' as const,
    }]);
    setLaborConcepto('');
    setLaborPrecio(0);
  };

  const removerLabor = (id: string) =>
    setLaborItems(prev => prev.filter(l => l.id !== id));

  const agregarServicioExterno = () => {
    if (!extConcepto.trim() || extPrecioCliente <= 0) return;
    const prov = proveedores.find(p => p.id === extProveedorId);
    setLaborItems(prev => [...prev, {
      id: `${Date.now()}-ext-${Math.random()}`,
      concepto: extConcepto.trim(),
      precio: extPrecioCliente,
      tipo: 'externo' as const,
      proveedorId: extProveedorId || undefined,
      proveedorNombre: prov?.nombre ?? undefined,
      costoTaller: extCostoTaller > 0 ? extCostoTaller : undefined,
      pagosServicio: [],
    }]);
    setExtConcepto('');
    setExtCostoTaller(0);
    setExtPrecioCliente(0);
    setExtProveedorId('');
    setShowExtForm(false);
  };

  const agregarParte = () => {
    const ref = inventario.find(r => r.id === pickerRefId);
    if (!ref || pickerCantidad <= 0) return;
    const pVenta = pickerPrecioVenta > 0 ? pickerPrecioVenta : ref.precioCompra;
    setPartesSeleccionadas(prev => {
      const existente = prev.find(p => p.refaccionId === ref.id);
      if (existente) {
        // Merge: update quantity keeping existing sale price
        const nuevaCantidad = existente.cantidad + pickerCantidad;
        return prev.map(p => p.refaccionId === ref.id ? {
          ...p,
          cantidad: nuevaCantidad,
          subtotal:   nuevaCantidad * p.precioVenta,
          costoTotal: nuevaCantidad * p.precioCompra,
        } : p);
      }
      return [...prev, {
        refaccionId: ref.id, nombre: ref.nombre, codigo: ref.codigo,
        cantidad: pickerCantidad,
        precioCompra: ref.precioCompra,
        precioVenta: pVenta,
        subtotal:   pickerCantidad * pVenta,
        costoTotal: pickerCantidad * ref.precioCompra,
      }];
    });
    setPickerRefId('');
    setPickerCantidad(1);
    setPickerPrecioVenta(0);
  };

  // Auto-fill precio venta when part changes — prefer client's last price
  const handlePickerRefChange = (id: string) => {
    setPickerRefId(id);
    const ref = inventario.find(r => r.id === id);
    if (!ref) { setPickerPrecioVenta(0); return; }
    // Look up client history — use highest price ever charged (never charge less)
    if (form.clienteId) {
      const prices = trabajos
        .filter(t => t.clienteId === form.clienteId)
        .flatMap(t => t.partes.filter(p => p.refaccionId === id && p.precioVenta > 0).map(p => p.precioVenta));
      if (prices.length > 0) { setPickerPrecioVenta(Math.max(...prices)); return; }
    }
    setPickerPrecioVenta(ref.precioCompra);
  };

  const removerParte = (refaccionId: string) =>
    setPartesSeleccionadas(prev => prev.filter(p => p.refaccionId !== refaccionId));

  const resetForm = () => {
    setForm(emptyForm);
    setLaborItems([]);
    setLaborConcepto('');
    setLaborPrecio(0);
    setPartesSeleccionadas([]);
    setPickerRefId('');
    setPickerCantidad(1);
    setPickerPrecioVenta(0);
    setEditandoId(null);
    setShowExtForm(false);
    setExtConcepto('');
    setExtCostoTaller(0);
    setExtPrecioCliente(0);
    setExtProveedorId('');
    setCapturandoTftId(null);
    setTftNumeroDraft('');
  };

  const iniciarEdicion = (trabajo: Trabajo) => {
    setSubTab(trabajo.tipoCliente === 'ayuntamiento' ? 'ayuntamiento' : 'general');
    setForm({
      clienteId: trabajo.clienteId,
      vehiculoId: trabajo.vehiculoId,
      fecha: trabajo.fecha,
      numeroOrden: trabajo.numeroOrden ?? '',
      descripcion: trabajo.descripcion,
      kilometraje: trabajo.kilometraje ?? '',
      requiereFactura: trabajo.requiereFactura,
      folioFiscal: trabajo.folioFiscal ?? '',
      estado: trabajo.estado,
      departamento: trabajo.departamento ?? '',
      inventarioNum: trabajo.inventarioNum ?? '',
      ordenServicioGob: trabajo.ordenServicioGob ?? '',
      fechaEntrada: trabajo.fechaEntrada ?? '',
      fechaSalida: trabajo.fechaSalida ?? '',
    });
    setLaborItems(trabajo.manoDeObraItems ?? []);
    setPartesSeleccionadas(trabajo.partes ?? []);
    setLaborConcepto('');
    setLaborPrecio(0);
    setPickerRefId('');
    setPickerCantidad(1);
    setPickerPrecioVenta(0);
    setEditandoId(trabajo.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteId || !form.vehiculoId || !form.descripcion) return;
    const kmVal = typeof form.kilometraje === 'string' ? (form.kilometraje.trim() !== '' ? Number(form.kilometraje) : undefined) : (form.kilometraje || undefined);
    const trabajoExistente = editandoId ? trabajos.find(t => t.id === editandoId) : null;
    const trabajoData = {
      ...form,
      numeroOrden: form.numeroOrden?.trim() || undefined,
      kilometraje: kmVal,
      manoDeObra: totalManoDeObra,
      manoDeObraItems: laborItems,
      refacciones: totalVentaRefacciones,
      costoRefacciones: totalCostoRefacciones,
      tipoCliente: subTab as 'general' | 'ayuntamiento',
      ...(subTab === 'ayuntamiento' ? {
        departamento: form.departamento || undefined,
        inventarioNum: form.inventarioNum || undefined,
        ordenServicioGob: form.ordenServicioGob || undefined,
        fechaEntrada: form.fechaEntrada || undefined,
        fechaSalida: form.fechaSalida || undefined,
        tftEstado: trabajoExistente?.tftEstado ?? 'sin_tft',
        tftNumero: trabajoExistente?.tftNumero,
      } : {
        departamento: undefined,
        inventarioNum: undefined,
        ordenServicioGob: undefined,
        fechaEntrada: undefined,
        fechaSalida: undefined,
        tftEstado: undefined,
        tftNumero: undefined,
      }),
      // Preserve requiereFactura for completed jobs so IVA is recalculated correctly
      requiereFactura: trabajoExistente?.estado === 'completado'
        ? (trabajoExistente.requiereFactura ?? false)
        : false,
      folioFiscal: undefined,
      partes: partesSeleccionadas,
      pagos: editandoId ? (trabajoExistente?.pagos ?? []) : [],
    };
    setGuardandoForm(true);
    setErrorGuardado(null);
    try {
      if (editandoId) {
        await onEditar(editandoId, trabajoData);
      } else {
        await onGuardar(trabajoData);
      }
      resetForm(); // only reset AFTER successful save
    } catch {
      setErrorGuardado('No se pudo guardar el trabajo. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setGuardandoForm(false);
    }
  };

  const getCliente  = (id: string) => clientes.find(c => c.id === id);
  const getVehiculo = (id: string) => vehiculos.find(v => v.id === id);
  const pickerRef   = inventario.find(r => r.id === pickerRefId);

  const intel: PricingIntel | null = useMemo(() => {
    if (!pickerRefId || !form.clienteId) return null;
    const ref = inventario.find(r => r.id === pickerRefId);
    if (!ref) return null;
    return getPricingIntel(pickerRefId, form.clienteId, ref.precioCompra, trabajos);
  }, [pickerRefId, form.clienteId, inventario, trabajos]);

  // ── Compatibility filtering ──
  const vehiculoDelTrabajo = vehiculos.find(v => v.id === form.vehiculoId);

  const isCompatible = (r: Refaccion): boolean => {
    if (!vehiculoDelTrabajo) return true;
    if (!r.compatibilidad || r.compatibilidad.length === 0) return true; // universal
    const marca  = vehiculoDelTrabajo.marca.toLowerCase().trim();
    const modelo = vehiculoDelTrabajo.modelo.toLowerCase().trim();
    return r.compatibilidad.some(c =>
      c.marca.toLowerCase().trim() === marca &&
      c.modelos.some(m => m.toLowerCase().trim() === modelo)
    );
  };

  // Parts grouped for the picker optgroups
  const partesParaEstaUnidad  = inventario.filter(r => r.vehiculoId === form.vehiculoId && isCompatible(r));
  const partesCompatibles      = inventario.filter(r => r.vehiculoId !== form.vehiculoId && r.compatibilidad?.length && isCompatible(r));
  const partesUniversales      = inventario.filter(r => r.vehiculoId !== form.vehiculoId && (!r.compatibilidad || r.compatibilidad.length === 0));
  // When vehicle is selected: only compatible+universal+linked-to-this-unit; otherwise all
  const totalCompatibles = form.vehiculoId
    ? partesParaEstaUnidad.length + partesCompatibles.length + partesUniversales.length
    : inventario.length;

  // Exclude cancelled jobs from all active views
  const trabajosActivos = trabajos.filter(t => t.folioFiscal !== '__CANCELADA__');
  const trabajosCancelados = trabajos.filter(t => t.folioFiscal === '__CANCELADA__');
  const coincideTab = (trabajo: Trabajo) => esAyuntamientoTab ? trabajo.tipoCliente === 'ayuntamiento' : trabajo.tipoCliente !== 'ayuntamiento';
  const trabajosDelTab = trabajosActivos.filter(coincideTab);
  const trabajosCanceladosDelTab = trabajosCancelados.filter(coincideTab);

  const trabajosPendientes = trabajosDelTab.filter(t => t.estado === 'pendiente');
  const trabajosPendientesFacturar = trabajosDelTab.filter(t => t.tipoDocumento !== 'nota' && t.estadoFacturacion !== 'facturado').length;
  const trabajosSinRefacciones = trabajosDelTab.filter(t => t.pendienteRefacciones === true);
  const [ordenHistorial, setOrdenHistorial] = useState<'desc' | 'asc'>('desc');
  const trabajosFiltrados = [...trabajosDelTab]
    .filter(t => {
      if (filtroClienteId && t.clienteId !== filtroClienteId) return false;
      if (filtroVehiculoId && t.vehiculoId !== filtroVehiculoId) return false;
      if (filtroEstado !== 'todos' && t.estado !== filtroEstado) return false;
      if (filtroFacturacion === 'con_factura' && t.estadoFacturacion !== 'facturado') return false;
      if (filtroFacturacion === 'sin_factura' && t.estadoFacturacion === 'facturado') return false;
      if (esAyuntamientoTab && filtroTft !== 'todos' && (t.tftEstado ?? 'sin_tft') !== filtroTft) return false;
      if (filtroPendienteRefacciones && !t.pendienteRefacciones) return false;
      return true;
    })
    .sort((a, b) => ordenHistorial === 'desc'
      ? b.fecha.localeCompare(a.fecha)
      : a.fecha.localeCompare(b.fecha)
    );
  const trabajoFinalizando = finalizandoId ? trabajos.find(t => t.id === finalizandoId) : null;

  const guardarTft = async (trabajoId: string) => {
    const numero = tftNumeroDraft.trim();
    if (!numero || isSavingTft) return;
    setErrorTft(null);
    setIsSavingTft(true);
    try {
      await onActualizarTft(trabajoId, numero);
      setCapturandoTftId(null);
      setTftNumeroDraft('');
    } catch {
      setErrorTft('No se pudo guardar el número TFT. Intenta de nuevo.');
    } finally {
      setIsSavingTft(false);
    }
  };

  const finalizarDesdeFila = (trabajo: Trabajo) => {
    if (trabajo.tipoCliente === 'ayuntamiento') {
      const confirmar = window.confirm('¿Finalizar este trabajo del Ayuntamiento como factura?');
      if (confirmar) onFinalizar(trabajo.id, 'factura');
      return;
    }
    setFinalizandoId(trabajo.id);
  };

  // ── Departamentos CRUD handlers ────────────────────────────────────────────
  const agregarDepto = () => {
    const trimmed = nuevoDepto.trim();
    if (!trimmed || departamentos.includes(trimmed)) return;
    const updated = [...departamentos, trimmed];
    setDepartamentos(updated);
    saveDepartamentos(updated);
    setNuevoDepto('');
  };

  const eliminarDepto = (depto: string) => {
    const updated = departamentos.filter(d => d !== depto);
    setDepartamentos(updated);
    saveDepartamentos(updated);
    // Clear form selection if the deleted depto was selected
    if (form.departamento === depto) setForm(f => ({ ...f, departamento: '' }));
  };

  return (
    <div>
      {trabajoFinalizando && (
        <ModalFinalizacion
          trabajo={trabajoFinalizando}
          cliente={getCliente(trabajoFinalizando.clienteId)}
          vehiculo={getVehiculo(trabajoFinalizando.vehiculoId)}
          onConfirmar={(tipo) => {
            onFinalizar(finalizandoId!, tipo);
            setFinalizandoId(null);
          }}
          onCancelar={() => setFinalizandoId(null)}
        />
      )}
      <SectionTitle title="Registro de Trabajos" subtitle="Selecciona cliente, unidad y las refacciones usadas del inventario." />

      <div className="flex gap-1 bg-white rounded-xl p-1.5 border border-slate-200 mb-3">
        <button
          type="button"
          onClick={() => { setSubTab('general'); setFiltroTft('todos'); resetForm(); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            subTab === 'general' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          👥 General
        </button>
        <button
          type="button"
          onClick={() => { setSubTab('ayuntamiento'); setFiltroTft('todos'); resetForm(); if (clienteAyuntamiento) { setForm(f => ({ ...f, clienteId: clienteAyuntamiento.id })); } }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            subTab === 'ayuntamiento' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🏛️ Ayuntamiento
        </button>
      </div>

      {/* ── Gestión de Departamentos (solo tab Ayuntamiento) ── */}
      {esAyuntamientoTab && (
        <div className="mb-4">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowDeptoManager(v => !v)}
              className="text-xs font-semibold text-slate-500 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
            >
              ⚙️ Departamentos
            </button>
          </div>
          {showDeptoManager && (
            <div className="mt-2 border border-rose-200 bg-rose-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-rose-700 uppercase tracking-widest">Gestión de Departamentos</p>
              <div className="space-y-1">
                {departamentos.map(d => (
                  <div key={d} className="flex items-center justify-between bg-white border border-rose-100 rounded-lg px-3 py-2 text-sm">
                    <span className="text-slate-700">{d}</span>
                    <button
                      type="button"
                      onClick={() => eliminarDepto(d)}
                      className="text-xs text-rose-400 hover:text-rose-700 font-bold ml-2 transition-colors"
                      title="Eliminar departamento"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {departamentos.length === 0 && (
                  <p className="text-xs text-rose-400 italic px-1">Sin departamentos registrados.</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Nuevo departamento..."
                  value={nuevoDepto}
                  onChange={e => setNuevoDepto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarDepto(); } }}
                />
                <Btn type="button" size="sm" variant="primary" onClick={agregarDepto} disabled={!nuevoDepto.trim() || departamentos.includes(nuevoDepto.trim())}>
                  Agregar
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`border rounded-xl p-5 mb-8 ${editandoId ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {editandoId ? 'Editar Trabajo' : 'Nuevo Trabajo'}
          </h3>
          {editandoId && (
            <button type="button" onClick={resetForm}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors">
              ✕ Cancelar edición
            </button>
          )}
        </div>
        {editandoId && (() => {
          const trabajoEditando = trabajos.find(t => t.id === editandoId);
          const esCompletado = trabajoEditando?.estado === 'completado';
          return (
            <div className={`mb-4 px-3 py-2 border rounded-lg text-xs font-medium ${esCompletado ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-amber-100 border-amber-300 text-amber-800'}`}>
              {esCompletado
                ? '✏️ Editando trabajo terminado — puedes agregar costos. El estado y tipo de cobro se conservan.'
                : `✏️ Editando trabajo del ${new Date(form.fecha + 'T00:00:00').toLocaleDateString('es-MX')}`}
            </div>
          );
        })()}
        <form onSubmit={handleSubmit} className="space-y-6">

          {esAyuntamientoTab && (
            <div className="border border-rose-200 rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-3 bg-rose-700">
                <span className="text-xs font-bold text-white uppercase tracking-widest">🏛️ Datos del Ayuntamiento</span>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <Label>Departamento</Label>
                  <Select value={form.departamento} onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))}>
                    <option value="">Seleccionar departamento...</option>
                    {departamentos.map(departamento => (
                      <option key={departamento} value={departamento}>{departamento}</option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Inventario</Label>
                    <Input type="text" placeholder="Ej. INV-203" value={form.inventarioNum}
                      onChange={e => setForm(f => ({ ...f, inventarioNum: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Orden de Servicio</Label>
                    <Input type="text" placeholder="Ej. OS-1456" value={form.ordenServicioGob}
                      onChange={e => setForm(f => ({ ...f, ordenServicioGob: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Fecha Entrada</Label>
                    <Input type="date" value={form.fechaEntrada}
                      onChange={e => setForm(f => ({ ...f, fechaEntrada: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Fecha Salida</Label>
                    <Input type="date" value={form.fechaSalida}
                      onChange={e => setForm(f => ({ ...f, fechaSalida: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ① Cliente + ② Unidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {esAyuntamientoTab ? (
              <div>
                <Label>① Cliente</Label>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
                  <span>🏛️</span>
                  <span>{clienteAyuntamiento?.nombre ?? 'Ayuntamiento de Mérida'}</span>
                  <span className="ml-auto text-xs text-slate-400 font-normal">🔒 Fijo</span>
                </div>
              </div>
            ) : (
              <div>
                <Label>① Cliente</Label>
                <Select value={form.clienteId} onChange={e => handleClienteChange(e.target.value)} required>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </Select>
              </div>
            )}
            <div>
              <Label>② Unidad / Vehículo</Label>
              <Select value={form.vehiculoId} onChange={e => setForm(f => ({ ...f, vehiculoId: e.target.value }))}
                required disabled={!form.clienteId || vehiculosDelCliente.length === 0}>
                <option value="">Seleccionar unidad...</option>
                {vehiculosDelCliente.map(v => <option key={v.id} value={v.id}>{labelVehiculo(v)}</option>)}
              </Select>
            </div>
          </div>

          {form.clienteId && vehiculosDelCliente.length === 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <span>⚠️</span>
              <span>Este cliente no tiene unidades. Ve a <span className="font-bold">👥 Clientes</span> para registrar una primero.</span>
            </div>
          )}

          {esAyuntamientoTab && !clienteAyuntamiento && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
              <span>⚠️</span>
              <span>No se encontró un cliente con nombre &quot;Ayuntamiento&quot;. Ve a <span className="font-bold">👥 Clientes</span> y crea un cliente llamado <span className="font-bold">&quot;Ayuntamiento de Mérida&quot;</span> primero.</span>
            </div>
          )}

          {/* Fecha + Número de orden + Kilometraje + Descripción */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div>
              <Label>Número de Orden</Label>
              <Input type="text" placeholder="Ej. 001, OT-2026-45..." value={form.numeroOrden}
                onChange={e => setForm(f => ({ ...f, numeroOrden: e.target.value }))} />
            </div>
            <div>
              <Label>🛣 Kilometraje</Label>
              <Input type="number" placeholder="Ej. 85000" min="0" step="1"
                value={form.kilometraje === '' ? '' : form.kilometraje}
                onChange={e => setForm(f => ({ ...f, kilometraje: e.target.value }))} />
            </div>
            <div>
              <Label>Descripción general del trabajo</Label>
              <Input type="text" placeholder="Ej. Servicio completo frenos y aceite..." value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} required />
            </div>
          </div>

          {/* ② Mano de Obra — multi-item */}
          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 bg-slate-700">
              <span className="text-xs font-bold text-white uppercase tracking-widest">② Mano de Obra</span>
              <span className="ml-3 text-slate-400 text-xs">Agrega cada tarea con su precio</span>
            </div>
            <div className="p-4 space-y-4">
              {/* Labor picker */}
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-48">
                  <Label>Concepto</Label>
                  <Input type="text" placeholder="Ej. Arreglo de frenos, engrase de pernos..."
                    value={laborConcepto}
                    onChange={e => setLaborConcepto(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarLabor(); } }}
                  />
                </div>
                <div className="w-36">
                  <Label>Precio ($)</Label>
                  <Input type="number" placeholder="0.00" min="0.01" step="0.01"
                    value={laborPrecio || ''}
                    onChange={e => setLaborPrecio(Number(e.target.value))} />
                </div>
                <div className="flex items-end">
                  <Btn variant="primary"
                    disabled={!laborConcepto.trim() || laborPrecio <= 0}
                    onClick={agregarLabor}>
                    + Agregar
                  </Btn>
                </div>
              </div>

              {/* Labor items table */}
              {laborItems.length > 0 && (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Concepto</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Precio</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {laborItems.map(l => (
                        <tr key={l.id} className={l.tipo === 'externo' ? 'bg-orange-50' : 'bg-white'}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {l.tipo === 'externo' && (
                                <span className="text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded">
                                  🏭 Externo
                                </span>
                              )}
                              <span className="font-medium text-slate-800">{l.concepto}</span>
                              {l.tipo === 'externo' && l.proveedorNombre && (
                                <span className="text-xs text-orange-600">{l.proveedorNombre}</span>
                              )}
                              {l.tipo === 'externo' && l.costoTaller != null && (
                                <span className="text-xs text-slate-400">
                                  Costo: ${fmt(l.costoTaller)} · Ganancia: ${fmt(l.precio - l.costoTaller)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(l.precio)}</td>
                          <td className="px-3 py-2 text-center">
                            <Btn size="sm" variant="danger" onClick={() => removerLabor(l.id)}>✕</Btn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td className="px-3 py-2 text-sm font-bold text-slate-700 text-right">Total Mano de Obra:</td>
                        <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(totalManoDeObra)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {laborItems.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">
                  Sin conceptos de mano de obra. El trabajo se registra con mano de obra = $0.00
                </p>
              )}
            </div>
          </div>

          {/* ② Servicios Externos — subcontratados a otros talleres/laboratorios */}
          <div className="border border-orange-200 rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 bg-orange-700 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-widest">🏭 Servicios Externos</span>
                <span className="ml-3 text-orange-200 text-xs">Lab. inyectores, rectificación, etc.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowExtForm(v => !v)}
                className="text-xs font-bold text-orange-100 hover:text-white border border-orange-400 hover:border-white px-3 py-1 rounded-lg transition-colors"
              >
                {showExtForm ? '✕ Cancelar' : '+ Agregar'}
              </button>
            </div>

            <div className="p-4">
              {/* External service form */}
              {showExtForm && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Nuevo Servicio Externo</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Proveedor / Laboratorio</Label>
                      <select
                        value={extProveedorId}
                        onChange={e => setExtProveedorId(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      >
                        <option value="">Sin proveedor registrado</option>
                        {proveedores.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Concepto del servicio</Label>
                      <Input
                        type="text"
                        placeholder="Ej. Laboratorio de inyectores, Rectificación..."
                        value={extConcepto}
                        onChange={e => setExtConcepto(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <Label>Costo al taller ($)</Label>
                      <Input
                        type="number" placeholder="0.00" min="0" step="0.01"
                        value={extCostoTaller || ''}
                        onChange={e => setExtCostoTaller(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Precio al cliente ($)</Label>
                      <Input
                        type="number" placeholder="0.00" min="0.01" step="0.01"
                        value={extPrecioCliente || ''}
                        onChange={e => setExtPrecioCliente(Number(e.target.value))}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      {extCostoTaller > 0 && extPrecioCliente > 0 && (
                        <div className={`flex-1 text-center text-xs font-bold px-3 py-2 rounded-lg ${
                          extPrecioCliente > extCostoTaller
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          Ganancia: ${fmt(extPrecioCliente - extCostoTaller)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Btn
                      variant="primary"
                      disabled={!extConcepto.trim() || extPrecioCliente <= 0}
                      onClick={agregarServicioExterno}
                    >
                      ✓ Agregar Servicio
                    </Btn>
                    <Btn variant="ghost" onClick={() => setShowExtForm(false)}>Cancelar</Btn>
                  </div>
                </div>
              )}

              {/* External items list */}
              {laborItems.filter(l => l.tipo === 'externo').length > 0 ? (
                <div className="rounded-lg border border-orange-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-orange-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-orange-700 uppercase tracking-wide">Servicio</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-orange-700 uppercase tracking-wide">Costo</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-orange-700 uppercase tracking-wide">Cliente</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-700 uppercase tracking-wide">Ganancia</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100">
                      {laborItems.filter(l => l.tipo === 'externo').map(l => (
                        <tr key={l.id} className="bg-orange-50/50">
                          <td className="px-3 py-2">
                            <div className="font-medium text-slate-800">{l.concepto}</div>
                            {l.proveedorNombre && (
                              <div className="text-xs text-orange-600 mt-0.5">🏭 {l.proveedorNombre}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-rose-600 font-semibold">
                            ${fmt(l.costoTaller ?? 0)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(l.precio)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                            ${fmt(l.precio - (l.costoTaller ?? 0))}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Btn size="sm" variant="danger" onClick={() => removerLabor(l.id)}>✕</Btn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                !showExtForm && (
                  <p className="text-xs text-slate-400 text-center py-2">
                    Sin servicios externos. Toca &quot;+ Agregar&quot; para registrar laboratorio, rectificación, etc.
                  </p>
                )
              )}
            </div>
          </div>

          {/* ③ Refacciones del inventario */}
          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-widest">③ Refacciones del Inventario</span>
              {inventario.length === 0 && (
                <button type="button" onClick={onIrAInventario}
                  className="text-xs text-indigo-300 hover:text-white underline font-medium">
                  Ir a Inventario →
                </button>
              )}
            </div>

            {inventario.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">
                <p>El inventario está vacío.</p>
                <button type="button" onClick={onIrAInventario}
                  className="mt-2 text-indigo-600 font-semibold hover:underline">
                  Agregar refacciones al inventario →
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Compatibility filter indicator */}
                {form.vehiculoId && vehiculoDelTrabajo && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                    totalCompatibles > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <span>🚗</span>
                    <span>
                      {totalCompatibles > 0
                        ? `Mostrando ${totalCompatibles} refacción${totalCompatibles !== 1 ? 'es' : ''} compatibles con ${vehiculoDelTrabajo.marca} ${vehiculoDelTrabajo.modelo}`
                        : `Sin refacciones marcadas como compatibles con ${vehiculoDelTrabajo.marca} ${vehiculoDelTrabajo.modelo} — se muestran las universales`}
                    </span>
                  </div>
                )}

                {/* Picker: refacción + cantidad + precio venta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2 lg:col-span-2">
                    <Label>Refacción</Label>
                    <Select value={pickerRefId} onChange={e => handlePickerRefChange(e.target.value)}>
                      <option value="">Seleccionar pieza...</option>
                      {/* 1. Parts bought specifically for this vehicle unit */}
                      {partesParaEstaUnidad.length > 0 && (
                        <optgroup label="🎯 Compradas para esta unidad">
                          {partesParaEstaUnidad.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {/* 2. Parts with matching make/model compatibility */}
                      {partesCompatibles.length > 0 && vehiculoDelTrabajo && (
                        <optgroup label={`✅ Compatible con ${vehiculoDelTrabajo.marca} ${vehiculoDelTrabajo.modelo}`}>
                          {partesCompatibles.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {/* 3. Universal parts (no compatibility restrictions) */}
                      {partesUniversales.length > 0 && (
                        <optgroup label="🌐 Universales (todos los vehículos)">
                          {partesUniversales.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {/* When no vehicle selected: show all with old grouping */}
                      {!form.vehiculoId && inventario.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Cantidad</Label>
                    <Input type="number" min="1" step="1" placeholder="1"
                      value={pickerCantidad || ''}
                      onChange={e => setPickerCantidad(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>
                      Precio venta ($)
                      {intel?.clientLastSale && pickerPrecioVenta > 0 && pickerPrecioVenta < intel.clientLastSale.precio && (
                        <span className="ml-2 text-amber-600 font-bold text-xs">⚠ menor que antes</span>
                      )}
                    </Label>
                    <Input type="number" min="0" step="0.01" placeholder="0.00"
                      value={pickerPrecioVenta || ''}
                      onChange={e => setPickerPrecioVenta(Number(e.target.value))}
                      className={
                        intel?.clientLastSale && pickerPrecioVenta > 0 && pickerPrecioVenta < intel.clientLastSale.precio
                          ? '!border-amber-400 !ring-amber-400'
                          : ''
                      }
                    />
                  </div>
                </div>

                {/* ── Pricing intelligence panel ── */}
                {pickerRef && intel && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-sm">

                    {/* Row 1: Cost + Markup buttons */}
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-slate-500 text-xs">
                        Costo: <strong className="text-slate-700">${fmt(pickerRef.precioCompra)}</strong>/{pickerRef.unidad}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400 font-medium">Sugerencias:</span>
                      {intel.markups.map(m => (
                        <button key={m.pct} type="button"
                          onClick={() => setPickerPrecioVenta(m.price)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            pickerPrecioVenta === m.price
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                          }`}>
                          {m.pct}% margen ${fmt(m.price)}
                        </button>
                      ))}
                      {pickerRef.stock < pickerCantidad && (
                        <span className="text-xs font-semibold text-amber-600 ml-auto">
                          ⚠ solo {pickerRef.stock} en stock
                        </span>
                      )}
                    </div>

                    {/* Row 2: Client history — most prominent */}
                    {intel.clientLastSale && (() => {
                      const isLower = pickerPrecioVenta > 0 && pickerPrecioVenta < intel.clientLastSale!.precio;
                      const isSame  = pickerPrecioVenta === intel.clientLastSale!.precio;
                      return (
                        <div className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 border ${
                          isLower ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200'
                        }`}>
                          <div className="text-xs">
                            <span className={`font-bold ${isLower ? 'text-amber-700' : 'text-indigo-700'}`}>
                              {isLower ? '⚠️' : '📋'}
                              {' '}
                              {isLower
                                ? `Estás cobrando menos que antes ($${fmt(pickerPrecioVenta)} vs $${fmt(intel.clientLastSale!.precio)})`
                                : isSame
                                  ? `Mismo precio que el máximo cobrado ($${fmt(intel.clientLastSale!.precio)})`
                                  : `Mayor precio cobrado a este cliente: $${fmt(intel.clientLastSale!.precio)}`
                              }
                            </span>
                            <span className="text-slate-400 ml-1">
                              — {formatearFecha(intel.clientLastSale!.fecha)}
                              {intel.clientAllSales.length > 1 && ` · ${intel.clientAllSales.length} veces vendida`}
                            </span>
                          </div>
                          {!isSame && (
                            <button type="button"
                              onClick={() => setPickerPrecioVenta(intel.clientLastSale!.precio)}
                              className={`text-xs font-bold whitespace-nowrap px-2.5 py-1 rounded-lg border transition-all ${
                                isLower
                                  ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                                  : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                              }`}>
                              Usar ${fmt(intel.clientLastSale!.precio)}
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Row 3: Cross-client range */}
                    {intel.otherMin !== null && (
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <span>💬</span>
                        <span>
                          Otros clientes pagaron:{' '}
                          <strong className="text-slate-600">
                            {intel.otherMin === intel.otherMax
                              ? `$${fmt(intel.otherMin!)}`
                              : `$${fmt(intel.otherMin!)} – $${fmt(intel.otherMax!)}`}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Agregar button (always visible) */}
                <div className="flex justify-between items-center gap-3 flex-wrap">
                  {pickerPrecioVenta > 0 && pickerRef && (
                    <span className="text-xs text-slate-500">
                      Margen: <strong className={pickerPrecioVenta > pickerRef.precioCompra ? 'text-emerald-600' : 'text-slate-600'}>
                        ${fmt((pickerPrecioVenta - pickerRef.precioCompra) * pickerCantidad)}
                        {' '}({(((pickerPrecioVenta - pickerRef.precioCompra) / pickerRef.precioCompra) * 100).toFixed(0)}%)
                      </strong>
                      {pickerCantidad > 1 && ` · subtotal cobrado $${fmt(pickerPrecioVenta * pickerCantidad)}`}
                    </span>
                  )}
                  <div className={!pickerRef ? 'ml-auto' : ''}>
                    <Btn variant="primary" disabled={!pickerRefId || pickerCantidad <= 0} onClick={agregarParte}>
                      + Agregar pieza
                    </Btn>
                  </div>
                </div>

                {/* Lista de partes seleccionadas */}
                {partesSeleccionadas.length > 0 && (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Refacción</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Cant.</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Costo</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Venta</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-600 uppercase tracking-wide">Margen</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {partesSeleccionadas.map(p => {
                          const margen = (p.subtotal ?? 0) - (p.costoTotal ?? 0);
                          return (
                            <tr key={p.refaccionId} className="bg-white">
                              <td className="px-3 py-2 text-slate-800 font-medium">
                                {p.nombre}
                                {p.codigo && <span className="ml-1.5 text-xs font-mono text-slate-400">{p.codigo}</span>}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-700">{p.cantidad}</td>
                              <td className="px-3 py-2 text-right text-slate-400 text-xs">${fmt(p.costoTotal ?? 0)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(p.subtotal ?? 0)}</td>
                              <td className="px-3 py-2 text-right font-medium text-emerald-600">${fmt(margen)}</td>
                              <td className="px-3 py-2 text-center">
                                <Btn size="sm" variant="danger" onClick={() => removerParte(p.refaccionId)}>✕</Btn>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={2} className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Totales:</td>
                          <td className="px-3 py-2 text-right text-xs text-slate-400 font-semibold">${fmt(totalCostoRefacciones)}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(totalVentaRefacciones)}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-emerald-600">${fmt(utilidadRefacciones)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {partesSeleccionadas.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">
                    Sin refacciones agregadas. El trabajo se registra con refacciones = $0.00
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Nota: IVA se elige al finalizar ── */}
          {!esAyuntamientoTab && (
            <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 text-sm text-indigo-700 flex items-start gap-2">
              <span className="text-lg mt-0.5">ℹ️</span>
              <span>El IVA se elige cuando el trabajo se <strong>finaliza</strong> — al presionar el botón 🏁 Finalizar elegirás entre <strong>Nota</strong> (sin IVA) o <strong>Factura Fiscal</strong> (IVA 16%).</span>
            </div>
          )}

          {(totalManoDeObra > 0 || totalVentaRefacciones > 0) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 space-y-2 text-sm">
              <div className="flex flex-wrap gap-6">
                <div>
                  <span className="text-indigo-500 font-semibold">Mano de obra</span>
                  {laborItems.length > 0 && <span className="text-indigo-400 ml-1">({laborItems.length} concepto{laborItems.length !== 1 ? 's' : ''})</span>}
                  {': '}<span className="font-bold text-slate-800">${fmt(totalManoDeObra)}</span>
                </div>
                <div><span className="text-indigo-500 font-semibold">Venta refacciones:</span> <span className="font-bold text-slate-800">${fmt(totalVentaRefacciones)}</span></div>
                <div><span className="text-indigo-700 font-bold">Subtotal: </span><span className="font-extrabold text-indigo-800 text-base">${fmt(subtotalSinIVA)}</span></div>
              </div>
              {utilidadRefacciones !== 0 && (
                <div className="text-xs text-slate-500 border-t border-indigo-100 pt-2 flex flex-wrap gap-4">
                  <span>Costo refacciones: <strong className="text-slate-700">${fmt(totalCostoRefacciones)}</strong></span>
                  <span>Margen en partes: <strong className={utilidadRefacciones >= 0 ? 'text-emerald-600' : 'text-rose-600'}>${fmt(utilidadRefacciones)}</strong></span>
                  <span>Utilidad total: <strong className="text-emerald-700">${fmt(totalManoDeObra + utilidadRefacciones)}</strong></span>
                </div>
              )}
            </div>
          )}

          {errorGuardado && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              ⚠️ {errorGuardado}
            </div>
          )}

          <Btn type="submit" variant="primary" fullWidth
            disabled={guardandoForm || !form.clienteId || !form.vehiculoId || !form.descripcion}>
            {guardandoForm ? '⏳ Guardando...' : '✓ Registrar Trabajo'}
          </Btn>
        </form>
      </div>

      {/* ── Historial ── */}
      <div>
        {/* Banner: trabajos pendientes */}
        {trabajosPendientes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-4 flex items-center gap-3 text-sm">
            <span className="text-2xl">🚛</span>
            <span className="text-amber-800 font-semibold">
              {trabajosPendientes.length} trabajo{trabajosPendientes.length !== 1 ? 's' : ''} en el taller — pendiente{trabajosPendientes.length !== 1 ? 's' : ''} de finalizar
            </span>
          </div>
        )}

        {/* Banner: trabajos pendientes de facturar */}
        {trabajosPendientesFacturar > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 mb-4 flex items-center gap-3 text-sm">
            <span className="text-2xl">🧾</span>
            <span className="text-indigo-800 font-semibold">
              {trabajosPendientesFacturar} trabajo{trabajosPendientesFacturar !== 1 ? 's' : ''} pendiente{trabajosPendientesFacturar !== 1 ? 's' : ''} de facturar — usa el botón 🧾 en la columna Descripción
            </span>
          </div>
        )}

        {/* Banner: trabajos pendientes de refacciones */}
        {trabajosSinRefacciones.length > 0 && (
          <button
            onClick={() => setFiltroPendienteRefacciones(f => !f)}
            className={`w-full text-left rounded-xl px-5 py-3 mb-4 flex items-center gap-3 text-sm border transition-all ${filtroPendienteRefacciones ? 'bg-orange-100 border-orange-400' : 'bg-orange-50 border-orange-200 hover:bg-orange-100'}`}
          >
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <span className="text-orange-800 font-semibold">
                {trabajosSinRefacciones.length} trabajo{trabajosSinRefacciones.length !== 1 ? 's' : ''} pendiente{trabajosSinRefacciones.length !== 1 ? 's' : ''} de refacciones — hay que comprar piezas para poder trabajar
              </span>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full transition-all ${filtroPendienteRefacciones ? 'bg-orange-500 text-white' : 'bg-orange-200 text-orange-700'}`}>
              {filtroPendienteRefacciones ? 'Ver todos' : 'Ver solo estos'}
            </span>
          </button>
        )}

        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-base font-bold text-slate-700">
            Historial de Trabajos
            {trabajosDelTab.length > 0 && <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{trabajosDelTab.length}</span>}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Ordenamiento */}
            {trabajosDelTab.length > 0 && (
              <button
                onClick={() => setOrdenHistorial(o => o === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-all"
              >
                {ordenHistorial === 'desc' ? '↓ Más reciente' : '↑ Más antiguo'}
              </button>
            )}
            {/* Filtro estado */}
            {trabajosDelTab.length > 0 && (
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                {([['todos', 'Todos'], ['pendiente', '🕐 En progreso'], ['completado', '✓ Terminados']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setFiltroEstado(val)}
                    className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${filtroEstado === val ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filtros estructurados */}
        {trabajosDelTab.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex gap-3 mb-4 flex-wrap items-end">
              <div className="min-w-44">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Cliente</label>
                <Select value={filtroClienteId} onChange={e => { setFiltroClienteId(e.target.value); setFiltroVehiculoId(''); }}>
                  <option value="">Todos los clientes</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </Select>
              </div>
              {filtroClienteId && (
                <div className="min-w-44">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Unidad</label>
                  <Select value={filtroVehiculoId} onChange={e => setFiltroVehiculoId(e.target.value)}>
                    <option value="">Todas las unidades</option>
                    {vehiculos.filter(v => v.clienteId === filtroClienteId).map(v => (
                      <option key={v.id} value={v.id}>{[v.anio, v.marca, v.modelo].filter(Boolean).join(' ')}</option>
                    ))}
                  </Select>
                </div>
              )}
              {(filtroClienteId || filtroVehiculoId) && (
                <button
                  type="button"
                  onClick={() => { setFiltroClienteId(''); setFiltroVehiculoId(''); }}
                  className="text-xs text-slate-500 hover:text-rose-600 font-medium self-end pb-2"
                >
                  ✕ Limpiar
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'todos',        label: 'Todos' },
                { key: 'con_factura',  label: 'Con Factura' },
                { key: 'sin_factura',  label: 'Sin Factura' },
              ] as const).map(({ key, label }) => (
                <Btn
                  key={key}
                  size="sm"
                  variant={filtroFacturacion === key ? 'primary' : 'ghost'}
                  onClick={() => setFiltroFacturacion(key)}
                >
                  {label}
                </Btn>
              ))}
            </div>
            {esAyuntamientoTab && (
              <div className="flex gap-2 flex-wrap">
                {([
                  { key: 'todos', label: 'Todos' },
                  { key: 'sin_tft', label: '❌ Sin TFT' },
                  { key: 'con_tft', label: '✅ Con TFT' },
                ] as const).map(({ key, label }) => (
                  <Btn
                    key={key}
                    size="sm"
                    variant={filtroTft === key ? 'primary' : 'ghost'}
                    onClick={() => setFiltroTft(key)}
                  >
                    {label}
                  </Btn>
                ))}
              </div>
            )}
            {esAyuntamientoTab && (
              <div className="flex gap-2 flex-wrap pt-1 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest self-center">📄 Reportes PDF:</span>
                {([
                  { filtro: 'sin_tft'          as FiltroAyuntamiento, label: 'Sin TFT' },
                  { filtro: 'con_tft_sin_pago' as FiltroAyuntamiento, label: 'Con TFT sin pago' },
                  { filtro: 'facturadas'       as FiltroAyuntamiento, label: 'Facturadas' },
                  { filtro: 'todos'            as FiltroAyuntamiento, label: 'Todos' },
                ]).map(({ filtro, label }) => (
                  <button
                    key={filtro}
                    type="button"
                    onClick={() => generarPDFAyuntamiento(trabajos, vehiculos, filtro)}
                    className="text-xs font-semibold text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                  >
                    📄 {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                {[
                  'No. Orden', 'Fecha', 'Estado', 'Cliente', 'Unidad', 'Placas', 'Kilometraje',
                  ...(esAyuntamientoTab ? ['Depto', 'Inv.'] : []),
                  'Descripción', 'Refacciones', 'Mano de Obra', 'Total',
                  ...(esAyuntamientoTab ? ['TFT'] : []),
                  '',
                ].map((h, i) => {
                  const alignRight = (!esAyuntamientoTab && i >= 8 && i <= 10) || (esAyuntamientoTab && i >= 10 && i <= 12);
                  return (
                    <th key={i} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${alignRight ? 'text-right' : 'text-left'}`}>{h}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trabajosFiltrados.map((trabajo, i) => {
                const cliente = getCliente(trabajo.clienteId);
                const vehiculo = getVehiculo(trabajo.vehiculoId);
                const isPendiente = trabajo.estado === 'pendiente';
                const tftEstado = trabajo.tftEstado ?? 'sin_tft';
                const esPendienteRefacciones = trabajo.pendienteRefacciones === true;
                const badgeEstado = trabajo.tipoDocumento === 'factura'
                  ? <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">🧾 Factura</span>
                  : trabajo.tipoDocumento === 'nota'
                    ? <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">📄 Nota</span>
                    : isPendiente
                      ? <span className="text-xs bg-amber-50 text-amber-600 font-semibold px-2 py-0.5 rounded-full border border-amber-200">🕐 En progreso</span>
                      : <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">✓ Terminado</span>;
                return (
                  <tr key={trabajo.id} className={`${esPendienteRefacciones ? 'bg-orange-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {trabajo.numeroOrden
                        ? <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{trabajo.numeroOrden}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                      {formatearFecha(trabajo.fecha)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{badgeEstado}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                      {vehiculo ? [vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {vehiculo?.placa
                        ? <span className="text-xs bg-slate-200 text-slate-700 font-mono font-semibold px-2 py-0.5 rounded">{vehiculo.placa}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {trabajo.kilometraje != null
                        ? <span className="text-xs font-semibold text-slate-700">{trabajo.kilometraje.toLocaleString('es-MX')} km</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    {esAyuntamientoTab && (
                      <>
                        <td className="px-4 py-3 text-slate-700">{trabajo.departamento ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">{trabajo.inventarioNum ?? <span className="text-slate-300">—</span>}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-slate-700">
                      {trabajo.descripcion}
                      {esPendienteRefacciones && (
                        <span className="ml-2 text-xs bg-orange-100 text-orange-700 font-semibold px-1.5 py-0.5 rounded-full border border-orange-200 whitespace-nowrap" title={(trabajo.refaccionesPendientesNombres ?? []).join(', ')}>
                          ⚠️ Sin refacciones
                        </span>
                      )}
                      {esPendienteRefacciones && (trabajo.refaccionesPendientesNombres ?? []).length > 0 && (
                        <div className="mt-1 text-xs text-orange-600 font-medium">
                          Falta: {(trabajo.refaccionesPendientesNombres ?? []).join(', ')}
                        </div>
                      )}
                      {trabajo.partes?.length > 0 && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded-full">
                          {trabajo.partes.length} pieza{trabajo.partes.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {trabajo.tipoDocumento !== 'nota' && (
                        trabajo.estadoFacturacion === 'facturado' ? (
                          <span className="ml-2 inline-flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full">✓ Facturado</span>
                            <button type="button"
                              onClick={() => onRefacturar(trabajo.id)}
                              title="Cancelar la factura actual y volver a facturar este trabajo"
                              className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors border border-amber-200">
                              🔄 Refacturar
                            </button>
                          </span>
                        ) : (
                          <button type="button"
                            onClick={() => onGenerarFactura(trabajo.id)}
                            className="ml-2 text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors">
                            🧾 Pendiente de facturar
                          </button>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      <div>${fmt(trabajo.refacciones)}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      <div>${fmt(trabajo.manoDeObra)}</div>
                      {trabajo.manoDeObraItems?.length > 1 && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {trabajo.manoDeObraItems.length} conceptos
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">${fmt(trabajo.total)}</td>
                    {esAyuntamientoTab && (
                      <td className="px-4 py-3 align-top">
                        {tftEstado === 'con_tft' ? (
                          <span className="inline-flex items-center text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                            ✅ TFT-{trabajo.tftNumero}
                          </span>
                        ) : (
                          <div className="space-y-2 min-w-36">
                            <span className="inline-flex items-center text-xs bg-rose-100 text-rose-700 font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                              ❌ SIN TFT
                            </span>
                            {!isPendiente && (
                              capturandoTftId === trabajo.id ? (
                                <div className="space-y-2">
                                  <Input
                                    type="text"
                                    placeholder="Número TFT"
                                    value={tftNumeroDraft}
                                    onChange={e => setTftNumeroDraft(e.target.value)}
                                  />
                                  <div className="flex gap-1">
                                    <Btn size="sm" variant="primary" onClick={() => guardarTft(trabajo.id)} disabled={!tftNumeroDraft.trim() || isSavingTft}>
                                      {isSavingTft ? 'Guardando…' : 'Guardar'}
                                    </Btn>
                                    <Btn size="sm" variant="ghost" onClick={() => { setCapturandoTftId(null); setTftNumeroDraft(''); setErrorTft(null); }}>
                                      Cancelar
                                    </Btn>
                                  </div>
                                  {errorTft && (
                                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">⚠️ {errorTft}</p>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setCapturandoTftId(trabajo.id); setTftNumeroDraft(''); setErrorTft(null); }}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                >
                                  + Registrar TFT
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col gap-1 items-center">
                        {isPendiente && (
                          <button
                            type="button"
                            onClick={() => finalizarDesdeFila(trabajo)}
                            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shadow-sm"
                          >
                            🏁 Finalizar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(trabajo)}
                          className="text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          ✏️ Editar
                        </button>
                        {confirmCancelarId === trabajo.id ? (
                          <div className="flex gap-1">
                            <button type="button" onClick={() => { onCancelarTrabajo(trabajo.id); setConfirmCancelarId(null); }}
                              className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded transition-colors">
                              ¿Sí?
                            </button>
                            <button type="button" onClick={() => setConfirmCancelarId(null)}
                              className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors">
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelarId(trabajo.id)}
                            className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                            title="Cancelar trabajo"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {trabajosFiltrados.length === 0 && <EmptyRow cols={esAyuntamientoTab ? 15 : 12} message={filtroClienteId || filtroVehiculoId || filtroEstado !== 'todos' || filtroFacturacion !== 'todos' || (esAyuntamientoTab && filtroTft !== 'todos') ? 'No se encontraron resultados.' : 'Sin trabajos registrados. Agrega el primero arriba.'} />}
            </tbody>
          </table>
        </div>

        {/* ── Trabajos cancelados ── */}
        {trabajosCanceladosDelTab.length > 0 && (
          <div className="mt-3">
            <button type="button" onClick={() => setVerCancelados(v => !v)}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors">
              {verCancelados ? '▲ Ocultar' : '▼ Ver'} cancelados ({trabajosCanceladosDelTab.length})
            </button>
            {verCancelados && (
              <div className="mt-2 space-y-1">
                {trabajosCanceladosDelTab.map(t => {
                  const cl = clientes.find(c => c.id === t.clienteId);
                  const vh = vehiculos.find(v => v.id === t.vehiculoId);
                  return (
                    <div key={t.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 opacity-60">
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="text-slate-500 line-through">{cl?.nombre ?? '—'}</span>
                        {vh && <span className="text-xs text-slate-400">{[vh.anio, vh.marca, vh.modelo].filter(Boolean).join(' ')}</span>}
                        <span className="text-xs text-slate-400">{formatearFecha(t.fecha)}</span>
                        <span className="text-xs bg-rose-100 text-rose-600 font-semibold px-2 py-0.5 rounded-full">Cancelado</span>
                      </div>
                      <button type="button" onClick={() => onReactivarTrabajo(t.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-4 flex-shrink-0">
                        ↩ Reactivar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}