'use client';

import type { Trabajo, Cliente, Vehiculo } from '@/app/types';
import { SectionTitle, EmptyRow } from '@/app/components/ui';
import { fmt } from '@/app/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResumenData = {
  facturadoMes: number; ingresoNeto: number;
  totalVentaRef: number; totalCostoRef: number; totalManoObra: number;
  costoServiciosExternos: number; totalCostos: number; margenRef: number;
  utilidadBruta: number; pctUtilidadBruta: number;
  gastosOperativos: number; utilidadNeta: number; pctUtilidadNeta: number;
  ganancia: number; gananciaCobrada: number; cantidad: number;
  cobradoEnMes: number; porCobrarDelMes: number; pendientePorCobrar: number;
  totalOrdenes: number; porPagarOrdenes: number;
  totalIVA: number; ingresoConIVA: number; ingresoSinIVA: number;
  pagadoAProveedoresMes: number; porPagarTotal: number;
  topClientes: { nombre: string; total: number }[];
};

// ─── P&L Row ─────────────────────────────────────────────────────────────────

function PLRow({
  label, amount, sub, bold, color = 'default', indent = false, pct,
}: {
  label: string; amount: number; sub?: string; bold?: boolean;
  color?: 'default' | 'green' | 'red' | 'blue'; indent?: boolean; pct?: number;
}) {
  const amtColor = color === 'green' ? 'text-emerald-700' : color === 'red' ? 'text-rose-600' : color === 'blue' ? 'text-indigo-700' : 'text-slate-800';
  const prefix = color === 'red' ? '−' : color === 'green' ? '+' : '';
  return (
    <div className={`flex items-center justify-between py-2.5 ${indent ? 'pl-5' : ''} border-b border-slate-100 last:border-0`}>
      <div>
        <span className={`text-sm ${bold ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{label}</span>
        {sub && <span className="block text-xs text-slate-400 mt-0.5">{sub}</span>}
      </div>
      <div className="flex items-center gap-2">
        {pct !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
            {pct}%
          </span>
        )}
        <span className={`text-sm tabular-nums ${bold ? 'font-bold text-base' : 'font-medium'} ${amtColor}`}>
          {prefix}${fmt(Math.abs(amount))}
        </span>
      </div>
    </div>
  );
}

// ─── Cashflow Card ────────────────────────────────────────────────────────────

function CashCard({ emoji, label, amount, tint }: {
  emoji: string; label: string; amount: number; tint: string;
}) {
  return (
    <div className={`rounded-xl p-4 border ${tint}`}>
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">{label}</div>
      <div className="text-xl font-extrabold text-slate-800">${fmt(amount)}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VistaResumen({
  mesActual,
  setMesActual,
  resumen,
  trabajos,
  clientes,
  vehiculos,
}: {
  mesActual: string;
  setMesActual: (m: string) => void;
  resumen: ResumenData;
  trabajos: Trabajo[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
}) {
  const getCliente = (id: string) => clientes.find(c => c.id === id);
  const flujoCaja = resumen.cobradoEnMes - resumen.pagadoAProveedoresMes;

  // Month nav
  const prevMes = () => {
    const [y, m] = mesActual.split('-').map(Number);
    const d = new Date(y, m - 2);
    setMesActual(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMes = () => {
    const [y, m] = mesActual.split('-').map(Number);
    const d = new Date(y, m);
    setMesActual(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const mesLabel = new Date(mesActual + '-15').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
  const maxClienteTotal = resumen.topClientes[0]?.total ?? 1;

  return (
    <div className="space-y-6">

      {/* ── Header with month nav ── */}
      <div className="flex items-center justify-between">
        <SectionTitle title="Resumen Financiero" subtitle={`${resumen.cantidad} trabajo${resumen.cantidad !== 1 ? 's' : ''} en el mes`} />
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <button onClick={prevMes} className="text-slate-500 hover:text-slate-800 font-bold px-1 transition-colors">‹</button>
          <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">{mesLabel}</span>
          <button onClick={nextMes} className="text-slate-500 hover:text-slate-800 font-bold px-1 transition-colors">›</button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SECCIÓN 1 — ESTADO DE RESULTADOS
      ══════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-800 px-5 py-3">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest">📊 Estado de Resultados</h2>
        </div>
        <div className="px-5 py-2">

          {/* Ingresos */}
          <PLRow
            label="💰 Ingresos (Facturado)"
            amount={resumen.facturadoMes}
            sub={resumen.totalIVA > 0 ? `incluye $${fmt(resumen.totalIVA)} IVA` : undefined}
            bold
          />

          {/* Costos */}
          <PLRow
            label="📦 Costo de Refacciones"
            amount={resumen.totalCostoRef}
            sub="Precio pagado a proveedores"
            color="red" indent
          />
          {resumen.costoServiciosExternos > 0 && (
            <PLRow
              label="🏭 Mano de Obra Externa"
              amount={resumen.costoServiciosExternos}
              sub="Servicios subcontratados"
              color="red" indent
            />
          )}

          {/* Utilidad Bruta */}
          <div className="my-1 border-t-2 border-slate-200" />
          <PLRow
            label="📈 Utilidad Bruta"
            amount={resumen.utilidadBruta}
            color={resumen.utilidadBruta >= 0 ? 'green' : 'red'}
            bold pct={resumen.pctUtilidadBruta}
          />

          {/* Gastos operativos */}
          <PLRow
            label="💸 Gastos Operativos"
            amount={resumen.gastosOperativos}
            sub={resumen.gastosOperativos === 0 ? 'Próximamente — módulo de Gastos' : undefined}
            color="red" indent
          />

          {/* Utilidad Neta */}
          <div className="my-1 border-t-2 border-indigo-100" />
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl mt-2 mb-1 ${resumen.utilidadNeta >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
            <div>
              <div className={`font-bold text-sm ${resumen.utilidadNeta >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                ✅ Utilidad Neta del Mes
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Después de costos y gastos</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${resumen.utilidadNeta >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {resumen.pctUtilidadNeta}%
              </span>
              <span className={`text-2xl font-extrabold tabular-nums ${resumen.utilidadNeta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                ${fmt(resumen.utilidadNeta)}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SECCIÓN 2 — FLUJO DE EFECTIVO
      ══════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-700 px-5 py-3">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest">💵 Flujo de Efectivo Real</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <CashCard emoji="💵" label="Cobrado Real" amount={resumen.cobradoEnMes} tint="bg-emerald-50 border-emerald-200" />
            <CashCard emoji="💳" label="Pagado Proveedores" amount={resumen.pagadoAProveedoresMes} tint="bg-rose-50 border-rose-200" />
            <CashCard emoji="⏳" label="Por Cobrar (CxC)" amount={resumen.pendientePorCobrar} tint="bg-amber-50 border-amber-200" />
            <CashCard emoji="🔴" label="Por Pagar (CxP)" amount={resumen.porPagarTotal} tint="bg-violet-50 border-violet-200" />
          </div>

          {/* Posición de efectivo */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${flujoCaja >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-rose-50 border-rose-200'}`}>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5">🏦 Flujo Neto del Mes</div>
              <div className="text-xs text-slate-400">Cobrado − Pagado a proveedores</div>
            </div>
            <div className={`text-2xl font-extrabold tabular-nums ${flujoCaja >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
              {flujoCaja >= 0 ? '+' : ''}${fmt(flujoCaja)}
            </div>
          </div>

          {/* IVA breakdown — only show if relevant */}
          {resumen.totalIVA > 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-0.5">🧾 IVA Cobrado</div>
                <div className="text-xs text-amber-600">A entregar al SAT</div>
              </div>
              <div className="text-xl font-extrabold text-amber-700">${fmt(resumen.totalIVA)}</div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SECCIÓN 3 — TOP CLIENTES
      ══════════════════════════════════════════════ */}
      {resumen.topClientes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-600 px-5 py-3">
            <h2 className="text-white font-bold text-sm uppercase tracking-widest">🏆 Top Clientes del Mes</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {resumen.topClientes.map((c, i) => {
              const pct = Math.round((c.total / maxClienteTotal) * 100);
              const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
              return (
                <div key={c.nombre}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{medals[i]}</span>
                      <span className="text-sm font-semibold text-slate-700">{c.nombre}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">${fmt(c.total)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          SECCIÓN 4 — DETALLE DE TRABAJOS (collapsible)
      ══════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-500 px-5 py-3">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest">
            📋 Detalle de Trabajos del Mes
            <span className="ml-2 bg-slate-400 text-white text-xs px-2 py-0.5 rounded-full">{trabajos.length}</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Fecha','Cliente','Trabajo','Total','IVA','Utilidad'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider text-slate-500 ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trabajos.map((trabajo, i) => {
                const cliente   = getCliente(trabajo.clienteId);
                const costoPartes = trabajo.costoRefacciones ?? trabajo.refacciones;
                const costoExt  = (trabajo.manoDeObraItems ?? [])
                  .filter(m => m.tipo === 'externo')
                  .reduce((s, m) => s + (m.costoTaller ?? 0), 0);
                const utilidad  = trabajo.manoDeObra + (trabajo.refacciones - costoPartes) - costoExt;
                const iva       = trabajo.iva ?? 0;
                return (
                  <tr key={trabajo.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 text-xs">{new Date(trabajo.fecha).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium text-sm">{cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      <span className="line-clamp-1">{trabajo.descripcion}</span>
                      {trabajo.requiereFactura && (
                        <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">fiscal</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">${fmt(trabajo.total)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{iva > 0 ? `$${fmt(iva)}` : '—'}</td>
                    <td className={`px-4 py-3 text-right font-bold ${utilidad >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>${fmt(utilidad)}</td>
                  </tr>
                );
              })}
              {trabajos.length === 0 && <EmptyRow cols={6} message="No hay trabajos registrados en este mes." />}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
