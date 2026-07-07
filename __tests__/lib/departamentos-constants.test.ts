import { describe, it, expect } from 'vitest';
import {
  DEPTOS_KEY,
  DEFAULT_DEPTOS,
} from '@/app/lib/departamentos-constants';

/**
 * departamentos-constants — Unit tests
 *
 * These constants are shared by both Trabajos and Cotizaciones modules
 * to keep their department lists in sync via a single localStorage key.
 * A regression here would cause silent desync between the two modules.
 */

describe('DEPTOS_KEY', () => {
  it('is a non-empty string', () => {
    expect(typeof DEPTOS_KEY).toBe('string');
    expect(DEPTOS_KEY.length).toBeGreaterThan(0);
  });

  it('has the expected stable value (changing this breaks existing localStorage)', () => {
    // This value is stored in the user browser's localStorage.
    // Changing it would silently wipe all existing department data on refresh.
    expect(DEPTOS_KEY).toBe('taller_departamentos_ayuntamiento');
  });

  it('contains "taller" prefix (consistent with other taller localStorage keys)', () => {
    expect(DEPTOS_KEY).toMatch(/^taller_/);
  });

  it('contains "departamentos" (descriptive key)', () => {
    expect(DEPTOS_KEY).toContain('departamentos');
  });
});

describe('DEFAULT_DEPTOS', () => {
  it('is an array', () => {
    expect(Array.isArray(DEFAULT_DEPTOS)).toBe(true);
  });

  it('has exactly 3 default departments', () => {
    expect(DEFAULT_DEPTOS).toHaveLength(3);
  });

  it('all items are non-empty strings', () => {
    DEFAULT_DEPTOS.forEach(depto => {
      expect(typeof depto).toBe('string');
      expect(depto.trim().length).toBeGreaterThan(0);
    });
  });

  it('contains the expected municipality departments (changing breaks ayuntamiento workflow)', () => {
    // These are real departments used by the mechanic shop's government client.
    // They must be stable to avoid breaking existing data.
    expect(DEFAULT_DEPTOS).toContain('Obras públicas mantenimiento vial');
    expect(DEFAULT_DEPTOS).toContain('Servicios públicos aseo urbano poniente');
    expect(DEFAULT_DEPTOS).toContain('Servicios públicos aseo urbano oriente');
  });

  it('does not contain duplicate departments', () => {
    const unique = new Set(DEFAULT_DEPTOS);
    expect(unique.size).toBe(DEFAULT_DEPTOS.length);
  });

  it('does not contain empty strings or whitespace-only entries', () => {
    DEFAULT_DEPTOS.forEach(depto => {
      expect(depto).not.toBe('');
      expect(depto.trim()).not.toBe('');
    });
  });
});