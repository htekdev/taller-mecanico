'use client';

import { useState, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
}

interface Vehiculo {
  id: string;
  clienteId: string;
  marca: string;
  modelo: string;
  anio: string;
  placa: string;
}

interface Refaccion {
  id: string;
  nombre: string;        // "Filtro de aceite Fram PH3614"
  codigo: string;        // Optional SKU/código de parte
  categoria: string;     // "Filtros" | "Aceites" | "Frenos" | "Motor" | "Eléctrico" | "Otros"
  unidad: string;        // "pza" | "lt" | "par" | "kg" | "metro"
  precioCompra: number;  // precio de compra por unidad
  stock: number;         // existencias actuales
  stockMinimo: number;   // alerta cuando stock <= esto
  vehiculoId?: string;   // opcional: pieza comprada para una unidad específica
}

interface TrabajoRefaccion {
  refaccionId: string;    // referencia al id de la Refaccion
  nombre: string;         // SNAPSHOT en el momento del trabajo
  codigo: string;         // SNAPSHOT
  cantidad: number;
  precioUnitario: number; // SNAPSHOT — no cambia si el precio de la pieza cambia después
  subtotal: number;       // cantidad × precioUnitario
}

interface ManoDeObraItem {
  id: string;
  concepto: string;  // "Arreglo de frenos"
  precio: number;    // 350.00
}

interface Trabajo {
  id: string;
  clienteId: string;
  vehiculoId: string;
  fecha: string;
  descripcion: string;
  manoDeObra: number;              // DERIVADO: suma de manoDeObraItems
  manoDeObraItems: ManoDeObraItem[]; // líneas de mano de obra (vacío en trabajos anteriores)
  refacciones: number;             // suma de partes (o manual para trabajos anteriores)
  total: number;
  partes: TrabajoRefaccion[];      // vacío en trabajos anteriores
  estado: 'pendiente' | 'completado' | 'pagado';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function labelVehiculo(v: Vehiculo) {
  const base = [v.anio, v.marca, v.modelo].filter(Boolean).join(' ');
  return v.placa ? `${base} — ${v.placa}` : base;
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-sm ${props.className ?? ''}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  const { children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-sm ${rest.className ?? ''}`}
    >
      {children}
    </select>
  );
}

function Btn({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  type = 'button',
  onClick,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
}) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm' };
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500 shadow-sm',
    ghost:   'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400',
    danger:  'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 focus:ring-rose-400',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center">
        <div className="text-slate-400 text-sm">{message}</div>
      </td>
    </tr>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function TallerMecanico() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [inventario, setInventario] = useState<Refaccion[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [vista, setVista] = useState<'clientes' | 'inventario' | 'trabajos' | 'resumen'>('clientes');
  const [mesActual, setMesActual] = useState(new Date().toISOString().slice(0, 7));

  // ── Cargar datos con migración de formatos anteriores ──
  useEffect(() => {
    const rawClientes   = localStorage.getItem('clientes');
    const rawVehiculos  = localStorage.getItem('vehiculos');
    const rawInventario = localStorage.getItem('inventario');
    const rawTrabajos   = localStorage.getItem('trabajos');

    type ClienteViejo = Cliente & { vehiculo?: string };
    let parsedClientes: ClienteViejo[]  = rawClientes   ? JSON.parse(rawClientes)   : [];
    let parsedVehiculos: Vehiculo[]     = rawVehiculos  ? JSON.parse(rawVehiculos)  : [];
    const parsedInventario: Refaccion[] = rawInventario ? JSON.parse(rawInventario) : [];

    // Migrar: Cliente tenía campo `vehiculo` (string)
    const necesitaMigracion = parsedClientes.some(c => 'vehiculo' in c && c.vehiculo);
    if (necesitaMigracion) {
      const migrados: Vehiculo[] = [];
      parsedClientes = parsedClientes.map(({ vehiculo, ...c }) => {
        if (vehiculo) migrados.push({ id: `mig_${c.id}`, clienteId: c.id, marca: vehiculo, modelo: '', anio: '', placa: '' });
        return c;
      });
      parsedVehiculos = [...parsedVehiculos, ...migrados];
      localStorage.setItem('clientes',  JSON.stringify(parsedClientes));
      localStorage.setItem('vehiculos', JSON.stringify(parsedVehiculos));
    }

    // Migrar: Trabajo no tenía campos `partes` ni `manoDeObraItems`
    const parsedTrabajos: Trabajo[] = (rawTrabajos ? JSON.parse(rawTrabajos) : [])
      .map((t: Trabajo & { manoDeObra: number }) => ({
        ...t,
        partes: t.partes ?? [],
        manoDeObraItems: t.manoDeObraItems ?? (
          t.manoDeObra > 0
            ? [{ id: `mig_${t.id}`, concepto: 'Mano de obra', precio: t.manoDeObra }]
            : []
        ),
      }));

    setClientes(parsedClientes);
    setVehiculos(parsedVehiculos);
    setInventario(parsedInventario);
    setTrabajos(parsedTrabajos);
  }, []);

  // ── Handlers ──

  const guardarCliente = (data: Omit<Cliente, 'id'>) => {
    const nuevo: Cliente = { ...data, id: Date.now().toString() };
    const nuevos = [...clientes, nuevo];
    setClientes(nuevos);
    localStorage.setItem('clientes', JSON.stringify(nuevos));
  };

  const guardarVehiculo = (data: Omit<Vehiculo, 'id'>) => {
    const nuevo: Vehiculo = { ...data, id: Date.now().toString() };
    const nuevos = [...vehiculos, nuevo];
    setVehiculos(nuevos);
    localStorage.setItem('vehiculos', JSON.stringify(nuevos));
  };

  const guardarRefaccion = (data: Omit<Refaccion, 'id'>) => {
    const nuevo: Refaccion = { ...data, id: Date.now().toString() };
    const nuevos = [...inventario, nuevo];
    setInventario(nuevos);
    localStorage.setItem('inventario', JSON.stringify(nuevos));
  };

  const recibirStock = (refaccionId: string, cantidad: number) => {
    const nuevos = inventario.map(r =>
      r.id === refaccionId ? { ...r, stock: r.stock + cantidad } : r
    );
    setInventario(nuevos);
    localStorage.setItem('inventario', JSON.stringify(nuevos));
  };

  const guardarTrabajo = (data: Omit<Trabajo, 'id' | 'total'>) => {
    const total = data.manoDeObra + data.refacciones;
    const nuevo: Trabajo = { ...data, id: Date.now().toString(), total };

    // Descontar del inventario las piezas usadas
    if (data.partes.length > 0) {
      const nuevoInv = inventario.map(r => {
        const usada = data.partes.find(p => p.refaccionId === r.id);
        return usada ? { ...r, stock: r.stock - usada.cantidad } : r;
      });
      setInventario(nuevoInv);
      localStorage.setItem('inventario', JSON.stringify(nuevoInv));
    }

    const nuevos = [...trabajos, nuevo];
    setTrabajos(nuevos);
    localStorage.setItem('trabajos', JSON.stringify(nuevos));
  };

  const calcularResumen = () => {
    const mes = trabajos.filter(t => t.fecha.startsWith(mesActual));
    const totalCobrado     = mes.reduce((s, t) => s + t.total, 0);
    const totalRefacciones = mes.reduce((s, t) => s + t.refacciones, 0);
    const totalManoObra    = mes.reduce((s, t) => s + t.manoDeObra, 0);
    const ganancia         = totalCobrado - totalRefacciones;
    return { totalCobrado, totalRefacciones, totalManoObra, ganancia, cantidad: mes.length };
  };

  const stockBajo = inventario.filter(r => r.stock <= r.stockMinimo).length;

  const tabs = [
    { key: 'clientes',   icon: '👥', label: 'Clientes',   count: clientes.length },
    { key: 'inventario', icon: '📦', label: 'Inventario', count: stockBajo > 0 ? `⚠ ${stockBajo}` : inventario.length > 0 ? inventario.length : null },
    { key: 'trabajos',   icon: '🔧', label: 'Trabajos',   count: trabajos.length },
    { key: 'resumen',    icon: '📊', label: 'Resumen',    count: null },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0">🔧</div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Taller Mecánico</h1>
            <p className="text-slate-400 text-sm font-medium">Sistema de Gestión</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Nav tabs ── */}
        <nav className="flex gap-1 mb-6 bg-white rounded-xl p-1.5 shadow-sm border border-slate-200 overflow-x-auto">
          {tabs.map(({ key, icon, label, count }) => (
            <button
              key={key}
              onClick={() => setVista(key)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-150 whitespace-nowrap ${
                vista === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {count !== null && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  vista === key ? 'bg-indigo-400 text-white' : (typeof count === 'string' && count.startsWith('⚠') ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600')
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ── Content ── */}
        <Card className="p-6 sm:p-8">
          {vista === 'clientes' && (
            <VistaClientes clientes={clientes} vehiculos={vehiculos}
              onGuardarCliente={guardarCliente} onGuardarVehiculo={guardarVehiculo} />
          )}
          {vista === 'inventario' && (
            <VistaInventario inventario={inventario} clientes={clientes} vehiculos={vehiculos}
              onGuardarRefaccion={guardarRefaccion} onRecibirStock={recibirStock} />
          )}
          {vista === 'trabajos' && (
            <VistaTrabajo clientes={clientes} vehiculos={vehiculos} inventario={inventario}
              trabajos={trabajos} onGuardar={guardarTrabajo}
              onIrAInventario={() => setVista('inventario')} />
          )}
          {vista === 'resumen' && (
            <VistaResumen mesActual={mesActual} setMesActual={setMesActual}
              resumen={calcularResumen()}
              trabajos={trabajos.filter(t => t.fecha.startsWith(mesActual))}
              clientes={clientes} vehiculos={vehiculos} />
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── VistaClientes ────────────────────────────────────────────────────────────

function VistaClientes({
  clientes,
  vehiculos,
  onGuardarCliente,
  onGuardarVehiculo,
}: {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  onGuardarCliente: (c: Omit<Cliente, 'id'>) => void;
  onGuardarVehiculo: (v: Omit<Vehiculo, 'id'>) => void;
}) {
  const [formCliente, setFormCliente] = useState({ nombre: '', telefono: '' });
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null);
  const [formVehiculo, setFormVehiculo] = useState({ marca: '', modelo: '', anio: '', placa: '' });

  const handleSubmitCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (formCliente.nombre && formCliente.telefono) {
      onGuardarCliente(formCliente);
      setFormCliente({ nombre: '', telefono: '' });
    }
  };

  const handleSubmitVehiculo = (e: React.FormEvent, clienteId: string) => {
    e.preventDefault();
    if (formVehiculo.marca && formVehiculo.modelo) {
      onGuardarVehiculo({ ...formVehiculo, clienteId });
      setFormVehiculo({ marca: '', modelo: '', anio: '', placa: '' });
    }
  };

  const toggleCliente = (id: string) => {
    setClienteExpandido(clienteExpandido === id ? null : id);
    setFormVehiculo({ marca: '', modelo: '', anio: '', placa: '' });
  };

  return (
    <div>
      <SectionTitle
        title="Registro de Clientes"
        subtitle="Registra al cliente y toca su nombre para gestionar sus unidades (vehículos)."
      />

      {/* ── Formulario nuevo cliente ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Nuevo Cliente</h3>
        <form onSubmit={handleSubmitCliente} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Nombre</Label>
            <Input type="text" placeholder="Nombre completo" value={formCliente.nombre}
              onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })} required />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input type="tel" placeholder="Ej. 555-123-4567" value={formCliente.telefono}
              onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })} required />
          </div>
          <div className="flex items-end">
            <Btn type="submit" variant="primary" fullWidth>+ Agregar Cliente</Btn>
          </div>
        </form>
      </div>

      {/* ── Lista de clientes ── */}
      {clientes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-medium text-slate-500">Sin clientes registrados</p>
          <p className="text-sm mt-1">Agrega el primer cliente arriba.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientes.map(cliente => {
            const unidades = vehiculos.filter(v => v.clienteId === cliente.id);
            const expandido = clienteExpandido === cliente.id;
            return (
              <div key={cliente.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => toggleCliente(cliente.id)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{cliente.nombre}</div>
                      <div className="text-slate-500 text-xs">{cliente.telefono}</div>
                    </div>
                    <span className={`ml-2 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      unidades.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {unidades.length > 0 ? `${unidades.length} unidad${unidades.length !== 1 ? 'es' : ''}` : '⚠ Sin unidades'}
                    </span>
                  </div>
                  <span className="text-slate-400 text-xs font-medium ml-4 flex-shrink-0">
                    {expandido ? '▲ Cerrar' : '▼ Gestionar unidades'}
                  </span>
                </button>

                {expandido && (
                  <div className="px-5 pb-5 pt-4 bg-slate-50 border-t border-slate-200">
                    {unidades.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Unidades registradas</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {unidades.map(v => (
                            <div key={v.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
                              <span className="text-2xl flex-shrink-0">🚗</span>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800 text-sm truncate">
                                  {[v.anio, v.marca, v.modelo].filter(Boolean).join(' ') || '(sin datos)'}
                                </div>
                                {v.placa && (
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    Placa: <span className="font-mono font-semibold text-slate-700">{v.placa}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar nueva unidad</p>
                    <form onSubmit={e => handleSubmitVehiculo(e, cliente.id)}
                      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div><Label>Marca *</Label>
                        <Input type="text" placeholder="Ej. Ford" value={formVehiculo.marca}
                          onChange={e => setFormVehiculo({ ...formVehiculo, marca: e.target.value })} required /></div>
                      <div><Label>Modelo *</Label>
                        <Input type="text" placeholder="Ej. F-150" value={formVehiculo.modelo}
                          onChange={e => setFormVehiculo({ ...formVehiculo, modelo: e.target.value })} required /></div>
                      <div><Label>Año</Label>
                        <Input type="text" placeholder="Ej. 2020" value={formVehiculo.anio}
                          onChange={e => setFormVehiculo({ ...formVehiculo, anio: e.target.value })} maxLength={4} /></div>
                      <div><Label>Placa</Label>
                        <Input type="text" placeholder="Ej. ABC-123" value={formVehiculo.placa}
                          onChange={e => setFormVehiculo({ ...formVehiculo, placa: e.target.value.toUpperCase() })}
                          className="font-mono" /></div>
                      <div className="col-span-2 sm:col-span-1 flex items-end">
                        <Btn type="submit" variant="success" fullWidth>+ Agregar</Btn>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── VistaInventario ──────────────────────────────────────────────────────────

const CATEGORIAS = ['Filtros', 'Aceites', 'Frenos', 'Motor', 'Eléctrico', 'Transmisión', 'Suspensión', 'Otros'];
const UNIDADES   = ['pza', 'lt', 'par', 'kg', 'metro', 'rollo', 'caja'];

function VistaInventario({
  inventario,
  clientes,
  vehiculos,
  onGuardarRefaccion,
  onRecibirStock,
}: {
  inventario: Refaccion[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  onGuardarRefaccion: (r: Omit<Refaccion, 'id'>) => void;
  onRecibirStock: (id: string, cantidad: number) => void;
}) {
  const [form, setForm] = useState({
    nombre: '', codigo: '', categoria: 'Filtros', unidad: 'pza',
    precioCompra: 0, stock: 0, stockMinimo: 1, vehiculoId: '',
  });
  const [formClienteId, setFormClienteId] = useState('');  // UI only — cascades to vehiculoId
  const [expandido, setExpandido] = useState<string | null>(null);
  const [recibirCantidad, setRecibirCantidad] = useState<Record<string, number>>({});

  const vehiculosDelCliente = vehiculos.filter(v => v.clienteId === formClienteId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || form.precioCompra <= 0) return;
    onGuardarRefaccion(form);
    setForm({ nombre: '', codigo: '', categoria: 'Filtros', unidad: 'pza', precioCompra: 0, stock: 0, stockMinimo: 1, vehiculoId: '' });
    setFormClienteId('');
  };

  const handleClienteChange = (clienteId: string) => {
    setFormClienteId(clienteId);
    setForm(f => ({ ...f, vehiculoId: '' }));  // reset vehicle when client changes
  };

  const handleRecibir = (id: string) => {
    const cant = recibirCantidad[id] ?? 0;
    if (cant > 0) {
      onRecibirStock(id, cant);
      setRecibirCantidad(prev => ({ ...prev, [id]: 0 }));
      setExpandido(null);
    }
  };

  const stockStatus = (r: Refaccion) => {
    if (r.stock <= 0)             return { label: 'Sin stock',           cls: 'bg-rose-100 text-rose-700' };
    if (r.stock <= r.stockMinimo) return { label: `Stock bajo (${r.stock})`, cls: 'bg-amber-100 text-amber-700' };
    return { label: `${r.stock} ${r.unidad}`, cls: 'bg-emerald-100 text-emerald-700' };
  };

  // Resolve vehiculo label for display in table
  const vehiculoLabel = (vehiculoId?: string) => {
    if (!vehiculoId) return null;
    const v = vehiculos.find(x => x.id === vehiculoId);
    if (!v) return null;
    const c = clientes.find(x => x.id === v.clienteId);
    return `${c?.nombre ?? '?'} · ${[v.anio, v.marca, v.modelo].filter(Boolean).join(' ')}`;
  };

  return (
    <div>
      <SectionTitle
        title="Inventario de Refacciones"
        subtitle="Registra las piezas en stock. Puedes vincular una pieza a una unidad específica si fue comprada para esa reparación."
      />

      {/* ── Formulario nueva refacción ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Agregar Refacción al Inventario</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre + Código + Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Label>Nombre de la refacción *</Label>
              <Input type="text" placeholder="Ej. Filtro de aceite Fram PH3614"
                value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
            </div>
            <div>
              <Label>Código / SKU</Label>
              <Input type="text" placeholder="Ej. FRAM-PH3614" value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} className="font-mono" />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </Select>
            </div>
          </div>

          {/* Unidad + Precio + Stock + Stock mínimo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label>Unidad</Label>
              <Select value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </Select>
            </div>
            <div>
              <Label>Precio de compra ($) *</Label>
              <Input type="number" placeholder="0.00" min="0.01" step="0.01"
                value={form.precioCompra || ''}
                onChange={e => setForm(f => ({ ...f, precioCompra: Number(e.target.value) }))} required />
            </div>
            <div>
              <Label>Stock inicial</Label>
              <Input type="number" placeholder="0" min="0" step="1"
                value={form.stock || ''}
                onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Stock mínimo</Label>
              <Input type="number" placeholder="1" min="0" step="1"
                value={form.stockMinimo || ''}
                onChange={e => setForm(f => ({ ...f, stockMinimo: Number(e.target.value) }))} />
            </div>
          </div>

          {/* ── Vincular a unidad (opcional) ── */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              🎯 Vincular a una unidad específica <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Si compraste esta pieza específicamente para la reparación de una unidad, selecciónala aquí.
              Aparecerá destacada cuando registres un trabajo para esa unidad.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Cliente</Label>
                <Select value={formClienteId} onChange={e => handleClienteChange(e.target.value)}>
                  <option value="">Sin vincular (stock general)</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </Select>
              </div>
              <div>
                <Label>Unidad del cliente</Label>
                <Select
                  value={form.vehiculoId}
                  onChange={e => setForm(f => ({ ...f, vehiculoId: e.target.value }))}
                  disabled={!formClienteId || vehiculosDelCliente.length === 0}
                >
                  <option value="">Seleccionar unidad...</option>
                  {vehiculosDelCliente.map(v => (
                    <option key={v.id} value={v.id}>{labelVehiculo(v)}</option>
                  ))}
                </Select>
                {formClienteId && vehiculosDelCliente.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Este cliente no tiene unidades registradas.</p>
                )}
              </div>
            </div>
          </div>

          <Btn type="submit" variant="primary" disabled={!form.nombre || form.precioCompra <= 0}>
            + Agregar al Inventario
          </Btn>
        </form>
      </div>

      {/* ── Lista de refacciones ── */}
      {inventario.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">📦</div>
          <p className="font-medium text-slate-500">Inventario vacío</p>
          <p className="text-sm mt-1">Agrega las piezas que tienes en stock arriba.</p>
        </div>
      ) : (
        <div>
          <h3 className="text-base font-bold text-slate-700 mb-3">
            Piezas en Inventario
            <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{inventario.length}</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  {['Código','Nombre / Unidad vinculada','Categoría','Precio Compra','Stock','Acciones'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i >= 3 ? 'text-right' : 'text-left'} ${i === 5 ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventario.map((r, i) => {
                  const status  = stockStatus(r);
                  const isExp   = expandido === r.id;
                  const vLabel  = vehiculoLabel(r.vehiculoId);
                  return (
                    <>
                      <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{r.codigo || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{r.nombre}</div>
                          {vLabel && (
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">
                                🎯 {vLabel}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded-full">{r.categoria}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">${fmt(r.precioCompra)} / {r.unidad}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Btn size="sm" variant={isExp ? 'ghost' : 'success'}
                            onClick={() => setExpandido(isExp ? null : r.id)}>
                            {isExp ? '✕ Cerrar' : '+ Existencias'}
                          </Btn>
                        </td>
                      </tr>
                      {isExp && (
                        <tr key={`${r.id}-recibir`} className="bg-emerald-50 border-t border-emerald-200">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-sm font-semibold text-emerald-800">Recibir existencias de <em>{r.nombre}</em>:</span>
                              <div className="flex items-center gap-2">
                                <Input type="number" placeholder="Cantidad" min="1" step="1"
                                  value={recibirCantidad[r.id] || ''}
                                  onChange={e => setRecibirCantidad(prev => ({ ...prev, [r.id]: Number(e.target.value) }))}
                                  className="w-28" />
                                <span className="text-sm text-emerald-700 font-medium">{r.unidad}</span>
                                <Btn size="sm" variant="success"
                                  disabled={!recibirCantidad[r.id] || recibirCantidad[r.id] <= 0}
                                  onClick={() => handleRecibir(r.id)}>
                                  ✓ Confirmar
                                </Btn>
                              </div>
                              <span className="text-xs text-emerald-600">Stock actual: {r.stock} {r.unidad}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VistaTrabajo ─────────────────────────────────────────────────────────────

function VistaTrabajo({
  clientes,
  vehiculos,
  inventario,
  trabajos,
  onGuardar,
  onIrAInventario,
}: {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  inventario: Refaccion[];
  trabajos: Trabajo[];
  onGuardar: (t: Omit<Trabajo, 'id' | 'total'>) => void;
  onIrAInventario: () => void;
}) {
  const emptyForm = {
    clienteId: '', vehiculoId: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    estado: 'pendiente' as Trabajo['estado'],
  };
  const [form, setForm] = useState(emptyForm);
  const [laborItems, setLaborItems] = useState<ManoDeObraItem[]>([]);
  const [laborConcepto, setLaborConcepto] = useState('');
  const [laborPrecio, setLaborPrecio]     = useState(0);
  const [partesSeleccionadas, setPartesSeleccionadas] = useState<TrabajoRefaccion[]>([]);
  const [pickerRefId, setPickerRefId]   = useState('');
  const [pickerCantidad, setPickerCantidad] = useState(1);

  const vehiculosDelCliente = vehiculos.filter(v => v.clienteId === form.clienteId);
  const totalManoDeObra  = laborItems.reduce((s, l) => s + l.precio, 0);
  const totalRefacciones = partesSeleccionadas.reduce((s, p) => s + p.subtotal, 0);

  const handleClienteChange = (clienteId: string) =>
    setForm(f => ({ ...f, clienteId, vehiculoId: '' }));

  const agregarLabor = () => {
    if (!laborConcepto.trim() || laborPrecio <= 0) return;
    setLaborItems(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      concepto: laborConcepto.trim(),
      precio: laborPrecio,
    }]);
    setLaborConcepto('');
    setLaborPrecio(0);
  };

  const removerLabor = (id: string) =>
    setLaborItems(prev => prev.filter(l => l.id !== id));

  const agregarParte = () => {
    const ref = inventario.find(r => r.id === pickerRefId);
    if (!ref || pickerCantidad <= 0) return;
    setPartesSeleccionadas(prev => {
      const existente = prev.find(p => p.refaccionId === ref.id);
      if (existente) {
        const nuevaCantidad = existente.cantidad + pickerCantidad;
        return prev.map(p => p.refaccionId === ref.id
          ? { ...p, cantidad: nuevaCantidad, subtotal: nuevaCantidad * p.precioUnitario } : p);
      }
      return [...prev, {
        refaccionId: ref.id, nombre: ref.nombre, codigo: ref.codigo,
        cantidad: pickerCantidad, precioUnitario: ref.precioCompra,
        subtotal: pickerCantidad * ref.precioCompra,
      }];
    });
    setPickerRefId('');
    setPickerCantidad(1);
  };

  const removerParte = (refaccionId: string) =>
    setPartesSeleccionadas(prev => prev.filter(p => p.refaccionId !== refaccionId));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteId || !form.vehiculoId || !form.descripcion) return;
    onGuardar({
      ...form,
      manoDeObra: totalManoDeObra,
      manoDeObraItems: laborItems,
      refacciones: totalRefacciones,
      partes: partesSeleccionadas,
    });
    setForm(emptyForm);
    setLaborItems([]);
    setLaborConcepto('');
    setLaborPrecio(0);
    setPartesSeleccionadas([]);
    setPickerRefId('');
    setPickerCantidad(1);
  };

  const getCliente  = (id: string) => clientes.find(c => c.id === id);
  const getVehiculo = (id: string) => vehiculos.find(v => v.id === id);
  const pickerRef   = inventario.find(r => r.id === pickerRefId);

  return (
    <div>
      <SectionTitle title="Registro de Trabajos" subtitle="Selecciona cliente, unidad y las refacciones usadas del inventario." />

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Nuevo Trabajo</h3>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ① Cliente + ② Unidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>① Cliente</Label>
              <Select value={form.clienteId} onChange={e => handleClienteChange(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
            </div>
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

          {/* Fecha + Descripción (2-col, mano de obra moved to its own section) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
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
                        <tr key={l.id} className="bg-white">
                          <td className="px-3 py-2 text-slate-800 font-medium">{l.concepto}</td>
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
                {/* Picker */}
                <div className="flex gap-2 flex-wrap items-end">
                  <div className="flex-1 min-w-48">
                    <Label>Refacción</Label>
                    <Select value={pickerRefId} onChange={e => setPickerRefId(e.target.value)}>
                      <option value="">Seleccionar pieza...</option>
                      {/* Parts bought for this specific vehicle — shown first */}
                      {form.vehiculoId && inventario.some(r => r.vehiculoId === form.vehiculoId) && (
                        <optgroup label="🎯 Compradas para esta unidad">
                          {inventario
                            .filter(r => r.vehiculoId === form.vehiculoId)
                            .map(r => (
                              <option key={r.id} value={r.id}>
                                {r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock
                              </option>
                            ))}
                        </optgroup>
                      )}
                      {/* General stock and parts for other vehicles */}
                      <optgroup label="📦 Stock general">
                        {inventario
                          .filter(r => !r.vehiculoId)
                          .map(r => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock
                            </option>
                          ))}
                      </optgroup>
                      {/* Parts for other vehicles — available but de-prioritized */}
                      {inventario.some(r => r.vehiculoId && r.vehiculoId !== form.vehiculoId) && (
                        <optgroup label="🔧 Piezas de otras unidades">
                          {inventario
                            .filter(r => r.vehiculoId && r.vehiculoId !== form.vehiculoId)
                            .map(r => (
                              <option key={r.id} value={r.id}>
                                {r.nombre}{r.codigo ? ` (${r.codigo})` : ''} — {r.stock} {r.unidad} en stock
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </Select>
                  </div>
                  <div className="w-28">
                    <Label>Cantidad</Label>
                    <Input type="number" min="1" step="1" placeholder="1"
                      value={pickerCantidad || ''}
                      onChange={e => setPickerCantidad(Number(e.target.value))} />
                  </div>
                  <div className="flex items-end">
                    <Btn variant="primary" disabled={!pickerRefId || pickerCantidad <= 0} onClick={agregarParte}>
                      + Agregar
                    </Btn>
                  </div>
                  {pickerRef && (
                    <div className="text-xs text-slate-500 flex items-end pb-2.5">
                      ${fmt(pickerRef.precioCompra)} / {pickerRef.unidad}
                      {pickerCantidad > 0 && ` · subtotal $${fmt(pickerRef.precioCompra * pickerCantidad)}`}
                      {pickerRef.stock < pickerCantidad && (
                        <span className="ml-2 text-amber-600 font-semibold">⚠ solo {pickerRef.stock} en stock</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Lista de partes seleccionadas */}
                {partesSeleccionadas.length > 0 && (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Refacción</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Cant.</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">P. Unit.</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Subtotal</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {partesSeleccionadas.map(p => (
                          <tr key={p.refaccionId} className="bg-white">
                            <td className="px-3 py-2 text-slate-800 font-medium">
                              {p.nombre}
                              {p.codigo && <span className="ml-1.5 text-xs font-mono text-slate-400">{p.codigo}</span>}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700">{p.cantidad}</td>
                            <td className="px-3 py-2 text-right text-slate-600">${fmt(p.precioUnitario)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(p.subtotal)}</td>
                            <td className="px-3 py-2 text-center">
                              <Btn size="sm" variant="danger" onClick={() => removerParte(p.refaccionId)}>✕</Btn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-sm font-bold text-slate-700 text-right">Total Refacciones:</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(totalRefacciones)}</td>
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

          {/* Resumen del trabajo */}
          {(totalManoDeObra > 0 || totalRefacciones > 0) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-indigo-500 font-semibold">Mano de obra</span>
                {laborItems.length > 0 && <span className="text-indigo-400 ml-1">({laborItems.length} concepto{laborItems.length !== 1 ? 's' : ''})</span>}
                {': '}<span className="font-bold text-slate-800">${fmt(totalManoDeObra)}</span>
              </div>
              <div><span className="text-indigo-500 font-semibold">Refacciones:</span> <span className="font-bold text-slate-800">${fmt(totalRefacciones)}</span></div>
              <div><span className="text-indigo-700 font-bold">Total trabajo: </span><span className="font-extrabold text-indigo-800 text-base">${fmt(totalManoDeObra + totalRefacciones)}</span></div>
            </div>
          )}

          <Btn type="submit" variant="primary" fullWidth
            disabled={!form.clienteId || !form.vehiculoId || !form.descripcion}>
            ✓ Registrar Trabajo
          </Btn>
        </form>
      </div>

      {/* ── Historial ── */}
      <div>
        <h3 className="text-base font-bold text-slate-700 mb-3">
          Historial de Trabajos
          {trabajos.length > 0 && <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{trabajos.length}</span>}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['Fecha','Cliente','Unidad','Descripción','Refacciones','Mano de Obra','Total'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trabajos.map((trabajo, i) => {
                const cliente  = getCliente(trabajo.clienteId);
                const vehiculo = getVehiculo(trabajo.vehiculoId);
                return (
                  <tr key={trabajo.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                      {new Date(trabajo.fecha).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      {vehiculo ? (
                        <span>
                          <span className="text-slate-700 font-medium">{[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')}</span>
                          {vehiculo.placa && <span className="ml-1.5 text-xs bg-slate-200 text-slate-600 font-mono font-semibold px-1.5 py-0.5 rounded">{vehiculo.placa}</span>}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {trabajo.descripcion}
                      {trabajo.partes?.length > 0 && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded-full">
                          {trabajo.partes.length} pieza{trabajo.partes.length !== 1 ? 's' : ''}
                        </span>
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
                  </tr>
                );
              })}
              {trabajos.length === 0 && <EmptyRow cols={7} message="Sin trabajos registrados. Agrega el primero arriba." />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── VistaResumen ─────────────────────────────────────────────────────────────

function VistaResumen({
  mesActual,
  setMesActual,
  resumen,
  trabajos,
  clientes,
  vehiculos,
}: {
  mesActual: string;
  setMesActual: (m: string) => void;
  resumen: { totalCobrado: number; totalRefacciones: number; totalManoObra: number; ganancia: number; cantidad: number };
  trabajos: Trabajo[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
}) {
  const getCliente = (id: string) => clientes.find(c => c.id === id);
  const getVehiculo = (id: string) => vehiculos.find(v => v.id === id);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <SectionTitle title="Resumen Mensual" />
        <div className="flex-shrink-0">
          <Label>Periodo</Label>
          <Input type="month" value={mesActual} onChange={e => setMesActual(e.target.value)} className="w-auto" />
        </div>
      </div>

      {/* ── Tarjetas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md">
          <div className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-2">Total Cobrado</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.totalCobrado)}</div>
          <div className="text-indigo-200 text-xs mt-2">{resumen.cantidad} trabajo{resumen.cantidad !== 1 ? 's' : ''} en el mes</div>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 text-white shadow-md">
          <div className="text-rose-200 text-xs font-bold uppercase tracking-widest mb-2">Gastos Refacciones</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.totalRefacciones)}</div>
          <div className="text-rose-200 text-xs mt-2">Costo de materiales</div>
        </div>
        <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl p-5 text-white shadow-md">
          <div className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-2">Mano de Obra</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.totalManoObra)}</div>
          <div className="text-slate-300 text-xs mt-2">Cobrado por servicio</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-md">
          <div className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-2">Ganancia Neta</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.ganancia)}</div>
          <div className="text-emerald-200 text-xs mt-2">
            {resumen.totalCobrado > 0 ? `${((resumen.ganancia / resumen.totalCobrado) * 100).toFixed(1)}% margen` : 'Sin movimientos'}
          </div>
        </div>
      </div>

      {/* ── Tabla detalle ── */}
      <div>
        <h3 className="text-base font-bold text-slate-700 mb-3">
          Detalle de Trabajos del Mes
          {trabajos.length > 0 && <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{trabajos.length}</span>}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['Fecha','Cliente','Unidad','Trabajo','Cobrado','Refacciones','Ganancia'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trabajos.map((trabajo, i) => {
                const cliente = getCliente(trabajo.clienteId);
                const vehiculo = getVehiculo(trabajo.vehiculoId);
                const ganancia = trabajo.total - trabajo.refacciones;
                return (
                  <tr key={trabajo.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">{new Date(trabajo.fecha).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{vehiculo ? [vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') : '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{trabajo.descripcion}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">${fmt(trabajo.total)}</td>
                    <td className="px-4 py-3 text-right text-rose-600 font-medium">${fmt(trabajo.refacciones)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">${fmt(ganancia)}</td>
                  </tr>
                );
              })}
              {trabajos.length === 0 && <EmptyRow cols={7} message="No hay trabajos registrados en este mes." />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
