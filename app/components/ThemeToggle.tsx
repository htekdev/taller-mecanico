'use client';

import { useTheme } from '@/app/context/theme';

/**
 * ThemeToggle — sun/moon button for the app header.
 * Shows ☀️ when in dark mode (click → switch to light) and 🌙 in light mode (click → dark).
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      data-testid="theme-toggle"
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      className="text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-2 rounded-lg transition-colors text-base leading-none min-h-[44px] min-w-[44px] flex items-center justify-center"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
