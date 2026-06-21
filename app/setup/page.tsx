'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/auth';

export default function SetupPage() {
  const { crearTaller, talleres, selectTaller, user, loading } = useAuth();
  const router = useRouter();

  const [nombre,    setNombre]    = useState('');
  const [creando,   setCreando]   = useState(false);
  const [error,     setError]     = useState('');
  const [modoCrear, setModoCrear] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Cargando...</div>
      </div>
    );
  }

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCreando(true);
    setError('');
    const result = await crearTaller(nombre.trim());
    setCreando(false);

    // null = user not logged in
    if (!result) { setError('No estás autenticado. Recarga la página.'); return; }

    // { error } = Supabase error with code
    if ('error' in result) {
      if (result.error === 'PGRST205' || result.error === '42P01') {
        setError('⚠️ Base de datos no configurada. Pide al administrador que ejecute el esquema SQL en Supabase.');
      } else {
        setError(`Error del servidor (${result.error}). Intenta de nuevo.`);
      }
      return;
    }

    router.push('/');
  };

  const handleSeleccionar = (id: string) => {
    selectTaller(id);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">🏪</div>
          <h1 className="text-2xl font-bold text-slate-900">Selecciona tu Taller</h1>
          <p className="text-slate-500 text-sm mt-1">{user?.email}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-4">

          {/* Existing talleres */}
          {talleres.length > 0 && !modoCrear && (
            <>
              <p className="text-sm font-medium text-slate-600 mb-3">Tus talleres:</p>
              {talleres.map(t => (
                <button key={t.id} onClick={() => handleSeleccionar(t.id)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group">
                  <span className="text-2xl">🔧</span>
                  <div>
                    <div className="font-semibold text-slate-800 group-hover:text-indigo-700">{t.nombre}</div>
                    <div className="text-xs text-slate-400">Entrar al sistema</div>
                  </div>
                  <span className="ml-auto text-slate-300 group-hover:text-indigo-400">→</span>
                </button>
              ))}

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                <div className="relative text-center text-xs text-slate-400 bg-white px-3 mx-auto w-fit">o</div>
              </div>

              <button onClick={() => setModoCrear(true)}
                className="w-full py-2.5 border border-dashed border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 rounded-xl text-sm font-medium transition-all">
                + Crear nuevo taller
              </button>
            </>
          )}

          {/* Create taller form */}
          {(talleres.length === 0 || modoCrear) && (
            <form onSubmit={handleCrear} className="space-y-4">
              {talleres.length > 0 && (
                <button type="button" onClick={() => setModoCrear(false)}
                  className="text-sm text-slate-400 hover:text-slate-600">
                  ← Volver
                </button>
              )}

              <div>
                <p className="text-sm font-medium text-slate-600 mb-4">
                  {talleres.length === 0
                    ? 'Bienvenido. Registra tu taller para comenzar:'
                    : 'Nombre del nuevo taller:'}
                </p>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nombre del taller
                </label>
                <input
                  type="text" required autoFocus
                  value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Taller Mecánico González"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm"
                />
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button type="submit" disabled={creando || !nombre.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm">
                {creando ? 'Creando taller...' : 'Crear Taller'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
