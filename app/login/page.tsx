'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/auth';

export default function LoginPage() {
  const { signIn, signUp, authLoading } = useAuth();

  const [mode,     setMode]     = useState<'login' | 'registro'>('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [mensaje,  setMensaje]  = useState('');
  const [redirecting, setRedirecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (mode === 'login') {
      const err = await signIn(email, password);
      if (err) { setError(err); return; }
      // Show loading while AuthGate handles the redirect — avoids competing
      // router.push + replace that causes ERR_FAILED in mobile browsers.
      setRedirecting(true);
    } else {
      const err = await signUp(email, password);
      if (err) { setError(err); return; }
      setMensaje('¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">🔧</div>
          <h1 className="text-2xl font-bold text-slate-900">Taller Mecánico</h1>
          <p className="text-slate-500 text-sm mt-1">Sistema de Gestión</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {/* Mode tabs */}
          <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1">
            {(['login', 'registro'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setMensaje(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {m === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <input
                type="password" required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm"
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {mensaje && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                {mensaje}
              </div>
            )}

            <button
              type="submit" disabled={authLoading || redirecting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm"
            >
              {(authLoading || redirecting) ? 'Procesando...' : mode === 'login' ? 'Entrar al Sistema' : 'Crear Cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Taller Mecánico · Sistema privado para uso del taller
        </p>
      </div>
    </div>
  );
}
