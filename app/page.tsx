'use client';

import { useState, useEffect } from 'react';

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  vehiculo: string;
}

interface Trabajo {
  id: string;
  clienteId: string;
  fecha: string;
  descripcion: string;
  manoDeObra: number;
  refacciones: number;
  total: number;
  estado: 'pendiente' | 'completado' | 'pagado';
}

export default function TallerMecanico() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [vista, setVista] = useState<'clientes' | 'trabajos' | 'resumen'>('clientes');
  const [mesActual, setMesActual] = useState(new Date().toISOString().slice(0, 7));

  // Cargar datos del localStorage
  useEffect(() => {
    const clientesGuardados = localStorage.getItem('clientes');
    const trabajosGuardados = localStorage.getItem('trabajos');
    
    if (clientesGuardados) setClientes(JSON.parse(clientesGuardados));
    if (trabajosGuardados) setTrabajos(JSON.parse(trabajosGuardados));
  }, []);

  // Guardar clientes
  const guardarCliente = (cliente: Omit<Cliente, 'id'>) => {
    const nuevo: Cliente = { ...cliente, id: Date.now().toString() };
    const nuevosClientes = [...clientes, nuevo];
    setClientes(nuevosClientes);
    localStorage.setItem('clientes', JSON.stringify(nuevosClientes));
  };

  // Guardar trabajo
  const guardarTrabajo = (trabajo: Omit<Trabajo, 'id' | 'total'>) => {
    const total = trabajo.manoDeObra + trabajo.refacciones;
    const nuevo: Trabajo = { ...trabajo, id: Date.now().toString(), total };
    const nuevosTrabajos = [...trabajos, nuevo];
    setTrabajos(nuevosTrabajos);
    localStorage.setItem('trabajos', JSON.stringify(nuevosTrabajos));
  };

  // Calcular resumen mensual
  const calcularResumen = () => {
    const trabajosMes = trabajos.filter(t => t.fecha.startsWith(mesActual));
    const totalCobrado = trabajosMes.reduce((sum, t) => sum + t.total, 0);
    const totalRefacciones = trabajosMes.reduce((sum, t) => sum + t.refacciones, 0);
    const totalManoObra = trabajosMes.reduce((sum, t) => sum + t.manoDeObra, 0);
    const ganancia = totalCobrado - totalRefacciones;
    
    return { totalCobrado, totalRefacciones, totalManoObra, ganancia, cantidad: trabajosMes.length };
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="bg-blue-600 text-white p-6 rounded-lg mb-6 shadow-lg">
          <h1 className="text-3xl font-bold">🔧 Taller Mecánico</h1>
          <p className="text-blue-100 mt-1">Sistema de Gestión</p>
        </header>

        <nav className="flex gap-2 mb-6">
          <button
            onClick={() => setVista('clientes')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              vista === 'clientes'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-blue-50'
            }`}
          >
            👥 Clientes
          </button>
          <button
            onClick={() => setVista('trabajos')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              vista === 'trabajos'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-blue-50'
            }`}
          >
            🔧 Trabajos
          </button>
          <button
            onClick={() => setVista('resumen')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              vista === 'resumen'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-blue-50'
            }`}
          >
            📊 Resumen Mensual
          </button>
        </nav>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {vista === 'clientes' && (
            <VistaClientes clientes={clientes} onGuardar={guardarCliente} />
          )}
          {vista === 'trabajos' && (
            <VistaTrabajo clientes={clientes} trabajos={trabajos} onGuardar={guardarTrabajo} />
          )}
          {vista === 'resumen' && (
            <VistaResumen 
              mesActual={mesActual} 
              setMesActual={setMesActual}
              resumen={calcularResumen()} 
              trabajos={trabajos.filter(t => t.fecha.startsWith(mesActual))}
              clientes={clientes}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function VistaClientes({ clientes, onGuardar }: { clientes: Cliente[]; onGuardar: (c: Omit<Cliente, 'id'>) => void }) {
  const [form, setForm] = useState({ nombre: '', telefono: '', vehiculo: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nombre && form.telefono && form.vehiculo) {
      onGuardar(form);
      setForm({ nombre: '', telefono: '', vehiculo: '' });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Registro de Clientes</h2>
      
      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="text"
          placeholder="Nombre del cliente"
          value={form.nombre}
          onChange={e => setForm({ ...form, nombre: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <input
          type="tel"
          placeholder="Teléfono"
          value={form.telefono}
          onChange={e => setForm({ ...form, telefono: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <input
          type="text"
          placeholder="Vehículo (marca/modelo)"
          value={form.vehiculo}
          onChange={e => setForm({ ...form, vehiculo: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold">
          + Agregar Cliente
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Teléfono</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vehículo</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clientes.map(cliente => (
              <tr key={cliente.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{cliente.nombre}</td>
                <td className="px-4 py-3">{cliente.telefono}</td>
                <td className="px-4 py-3">{cliente.vehiculo}</td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  No hay clientes registrados. Agrega el primero arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VistaTrabajo({ 
  clientes, 
  trabajos, 
  onGuardar 
}: { 
  clientes: Cliente[]; 
  trabajos: Trabajo[]; 
  onGuardar: (t: Omit<Trabajo, 'id' | 'total'>) => void 
}) {
  const [form, setForm] = useState({
    clienteId: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    manoDeObra: 0,
    refacciones: 0,
    estado: 'pendiente' as Trabajo['estado']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.clienteId && form.descripcion) {
      onGuardar(form);
      setForm({
        clienteId: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '',
        manoDeObra: 0,
        refacciones: 0,
        estado: 'pendiente'
      });
    }
  };

  const getClienteNombre = (id: string) => {
    return clientes.find(c => c.id === id)?.nombre || 'Cliente desconocido';
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Registro de Trabajos</h2>
      
      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <select
          value={form.clienteId}
          onChange={e => setForm({ ...form, clienteId: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Seleccionar cliente</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <input
          type="date"
          value={form.fecha}
          onChange={e => setForm({ ...form, fecha: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="text"
          placeholder="Descripción del trabajo"
          value={form.descripcion}
          onChange={e => setForm({ ...form, descripcion: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 md:col-span-2"
          required
        />
        <input
          type="number"
          placeholder="Mano de obra ($)"
          value={form.manoDeObra || ''}
          onChange={e => setForm({ ...form, manoDeObra: Number(e.target.value) })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          min="0"
          step="0.01"
        />
        <input
          type="number"
          placeholder="Refacciones ($)"
          value={form.refacciones || ''}
          onChange={e => setForm({ ...form, refacciones: Number(e.target.value) })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          min="0"
          step="0.01"
        />
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold md:col-span-3 lg:col-span-6">
          + Agregar Trabajo
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Fecha</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Cliente</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Descripción</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Mano de Obra</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Refacciones</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {trabajos.map(trabajo => (
              <tr key={trabajo.id} className="hover:bg-gray-50">
                <td className="px-3 py-3">{new Date(trabajo.fecha).toLocaleDateString('es-MX')}</td>
                <td className="px-3 py-3">{getClienteNombre(trabajo.clienteId)}</td>
                <td className="px-3 py-3">{trabajo.descripcion}</td>
                <td className="px-3 py-3 text-right">${trabajo.manoDeObra.toFixed(2)}</td>
                <td className="px-3 py-3 text-right">${trabajo.refacciones.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-semibold">${trabajo.total.toFixed(2)}</td>
              </tr>
            ))}
            {trabajos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No hay trabajos registrados. Agrega el primero arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VistaResumen({ 
  mesActual, 
  setMesActual, 
  resumen, 
  trabajos,
  clientes 
}: { 
  mesActual: string; 
  setMesActual: (m: string) => void;
  resumen: { totalCobrado: number; totalRefacciones: number; totalManoObra: number; ganancia: number; cantidad: number };
  trabajos: Trabajo[];
  clientes: Cliente[];
}) {
  const getClienteNombre = (id: string) => {
    return clientes.find(c => c.id === id)?.nombre || 'Cliente desconocido';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Resumen Mensual</h2>
        <input
          type="month"
          value={mesActual}
          onChange={e => setMesActual(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="text-blue-600 text-sm font-semibold mb-1">Total Cobrado</div>
          <div className="text-3xl font-bold text-blue-700">${resumen.totalCobrado.toFixed(2)}</div>
          <div className="text-xs text-blue-500 mt-1">{resumen.cantidad} trabajos</div>
        </div>
        
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="text-red-600 text-sm font-semibold mb-1">Gastos Refacciones</div>
          <div className="text-3xl font-bold text-red-700">${resumen.totalRefacciones.toFixed(2)}</div>
        </div>
        
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="text-green-600 text-sm font-semibold mb-1">Mano de Obra</div>
          <div className="text-3xl font-bold text-green-700">${resumen.totalManoObra.toFixed(2)}</div>
        </div>
        
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4">
          <div className="text-emerald-600 text-sm font-semibold mb-1">Ganancia Neta</div>
          <div className="text-3xl font-bold text-emerald-700">${resumen.ganancia.toFixed(2)}</div>
          <div className="text-xs text-emerald-500 mt-1">
            {resumen.totalCobrado > 0 ? `${((resumen.ganancia / resumen.totalCobrado) * 100).toFixed(1)}% margen` : ''}
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-3">Detalle de Trabajos del Mes</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Fecha</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Cliente</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Trabajo</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Cobrado</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Refacciones</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Ganancia</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {trabajos.map(trabajo => (
              <tr key={trabajo.id} className="hover:bg-gray-50">
                <td className="px-3 py-3">{new Date(trabajo.fecha).toLocaleDateString('es-MX')}</td>
                <td className="px-3 py-3">{getClienteNombre(trabajo.clienteId)}</td>
                <td className="px-3 py-3">{trabajo.descripcion}</td>
                <td className="px-3 py-3 text-right">${trabajo.total.toFixed(2)}</td>
                <td className="px-3 py-3 text-right text-red-600">${trabajo.refacciones.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-semibold text-green-600">
                  ${(trabajo.total - trabajo.refacciones).toFixed(2)}
                </td>
              </tr>
            ))}
            {trabajos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No hay trabajos en este mes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
