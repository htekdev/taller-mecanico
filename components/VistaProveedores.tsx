'use client';

import { useState } from 'react';
import type { Proveedor, Refaccion } from '../lib/types';
import { Label, Input, Select, Btn, SectionTitle } from '../components/ui';

export default function VistaProveedores({
  proveedores,
  inventario,
  onGuardarProveedor,
}: {
  proveedores: Proveedor[];
  inventario: Refaccion[];
  onGuardarProveedor: (p: Omit<Proveedor, 'id'>) => void;
}) {
  const [form, setForm] = useState({ nombre: '', telefono: '', contacto: '', notas: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre) return;
    onGuardarProveedor(form);
    setForm({ nombre: '', telefono: '', contacto: '', notas: '' });
  };

  return (
    <div>
      <SectionTitle
        title="Proveedores"
        subtitle="Registra tus proveedores de refacciones para vincularlos al inventario y rastrear lo que les debes."
      />

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Nuevo Proveedor</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Nombre *</Label>
            <Input type="text" placeholder="Ej. Refacciones García" value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input type="tel" placeholder="Ej. 555-100-2000" value={form.telefono}
              onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
          </div>
          <div>
            <Label>Contacto</Label>
            <Input type="text" placeholder="Nombre del vendedor" value={form.contacto}
              onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <Btn type="submit" variant="primary" fullWidth disabled={!form.nombre}>+ Agregar Proveedor</Btn>
          </div>
        </form>
      </div>

      {proveedores.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <div className="text-5xl mb-3">🏪</div>
          <p className="font-medium text-slate-500">Sin proveedores registrados</p>
          <p className="text-sm mt-1">Agrega el primero arriba. Después podrás vincularlo a tus refacciones.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['Proveedor','Teléfono','Contacto','Piezas en inventario'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proveedores.map((p, i) => {
                const piezas = inventario.filter(r => r.proveedorId === p.id);
                return (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{p.telefono || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.contacto || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {piezas.length > 0 ? (
                        <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                          {piezas.length} pieza{piezas.length !== 1 ? 's' : ''}
                        </span>
                      ) : <span className="text-slate-400 text-xs">Sin piezas</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
