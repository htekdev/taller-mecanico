import { vi, describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit tests for /api/e2e-warmup route.
 *
 * Tests:
 * - Returns 403 in production unless E2E_ALLOW_PRODUCTION is set
 * - Returns 500 when Supabase env vars are missing
 * - Returns 200 with { status, tables, failed, total } when Supabase responds
 * - total matches the number of tables queried
 */

// Mock Supabase client — route uses from(t).select(...) with head:true
const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({ select: mockSelect }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

// Helper: create a minimal NextRequest-like object
async function makeNextRequest() {
  const { NextRequest } = await import('next/server');
  return new NextRequest('http://localhost/api/e2e-warmup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}

// ── Blocked in production ──────────────────────────────────────────────────

describe('POST /api/e2e-warmup — production environment', () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    process.env.VERCEL_ENV = 'production';
    delete process.env.E2E_ALLOW_PRODUCTION;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    const mod = await import('@/app/api/e2e-warmup/route');
    POST = mod.POST as unknown as typeof POST;
  });

  it('returns 403 in production', async () => {
    const req = await makeNextRequest();
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/blocked/i);
  });

  it('returns 200 in production when E2E_ALLOW_PRODUCTION is set', async () => {
    process.env.E2E_ALLOW_PRODUCTION = '1';
    // Make Supabase queries resolve successfully
    mockSelect.mockResolvedValue({ data: null, error: null, count: 0 });
    const req = await makeNextRequest();
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(200);
  });
});

// ── Missing env vars ───────────────────────────────────────────────────────

describe('POST /api/e2e-warmup — missing env vars', () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'test';
    delete process.env.E2E_ALLOW_PRODUCTION;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const mod = await import('@/app/api/e2e-warmup/route');
    POST = mod.POST as unknown as typeof POST;
  });

  it('returns 500 when Supabase credentials are missing', async () => {
    const req = await makeNextRequest();
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/SUPABASE/i);
  });
});

// ── Happy path ─────────────────────────────────────────────────────────────

describe('POST /api/e2e-warmup — happy path', () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'test';
    delete process.env.E2E_ALLOW_PRODUCTION;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockSelect.mockResolvedValue({ data: null, error: null, count: 0 });
    const mod = await import('@/app/api/e2e-warmup/route');
    POST = mod.POST as unknown as typeof POST;
  });

  it('returns 200 with status warmed', async () => {
    const req = await makeNextRequest();
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('warmed');
  });

  it('response includes tables, failed, and total', async () => {
    const req = await makeNextRequest();
    const res = await POST(req as unknown as Request);
    const body = await res.json();
    expect(body).toHaveProperty('tables');
    expect(body).toHaveProperty('failed');
    expect(body).toHaveProperty('total');
  });

  it('total equals tables + failed', async () => {
    const req = await makeNextRequest();
    const res = await POST(req as unknown as Request);
    const body = await res.json();
    expect(body.tables + body.failed).toBe(body.total);
  });
});
