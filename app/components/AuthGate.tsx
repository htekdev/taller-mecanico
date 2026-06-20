'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/auth';

const PUBLIC_PATHS = ['/login', '/setup'];

/**
 * AuthGate — wraps the entire app.
 * - Not logged in → redirect to /login
 * - Logged in, no taller → redirect to /setup
 * - Logged in + taller → render children
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, taller, loading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

    if (!user && !isPublic) {
      router.replace('/login');
      return;
    }

    if (user && !taller && pathname !== '/setup') {
      router.replace('/setup');
      return;
    }

    if (user && taller && isPublic) {
      router.replace('/');
    }
  }, [user, taller, loading, pathname, router]);

  // Loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-2xl">🔧</div>
          <div className="text-slate-400 text-sm">Cargando sistema...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
