import { vi, describe, it, expect, beforeEach } from 'vitest';

/**
 * /api/feedback — Route handler unit tests.
 *
 * Tests:
 * - POST validation: titulo required, descripcion required
 * - POST missing GITHUB_TOKEN returns 500
 * - GET missing GITHUB_TOKEN returns 500
 * - POST invalid JSON returns 400
 * - POST maps categoria to correct GitHub labels
 * - POST maps prioridad to priority labels
 * - GET maps GitHub issue state to Spanish estado
 *
 * Note: The route module captures GITHUB_TOKEN at module-load time:
 *   const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
 * We use vi.resetModules() + dynamic import per describe block so each
 * group tests a clean environment.
 */

// Mock global fetch before any module loads
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Helper: create a minimal NextRequest-like object for testing
async function makeNextRequest(body: unknown, method = 'POST') {
  const { NextRequest } = await import('next/server');
  return new NextRequest('http://localhost/api/feedback', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  });
}

// ─── POST — No GITHUB_TOKEN ───────────────────────────────────────────────────

describe('POST /api/feedback — no GITHUB_TOKEN', () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.GITHUB_TOKEN;
    vi.resetModules();
    const mod = await import('@/app/api/feedback/route');
    POST = mod.POST as unknown as (req: Request) => Promise<Response>;
  });

  it('returns 500 with Spanish error message', async () => {
    const req = await makeNextRequest({ titulo: 'Test', descripcion: 'Test desc', categoria: 'bug' });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/token|configurado/i);
  });
});

// ─── GET — No GITHUB_TOKEN ────────────────────────────────────────────────────

describe('GET /api/feedback — no GITHUB_TOKEN', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.GITHUB_TOKEN;
    vi.resetModules();
    const mod = await import('@/app/api/feedback/route');
    GET = mod.GET as unknown as () => Promise<Response>;
  });

  it('returns 500 with Spanish error message', async () => {
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/token|configurado/i);
  });
});

// ─── POST — With GITHUB_TOKEN ─────────────────────────────────────────────────

describe('POST /api/feedback — with GITHUB_TOKEN', () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.GITHUB_TOKEN = 'fake-test-token';
    vi.resetModules();
    const mod = await import('@/app/api/feedback/route');
    POST = mod.POST as unknown as (req: Request) => Promise<Response>;
  });

  it('returns 400 when titulo is empty', async () => {
    const req = await makeNextRequest({ titulo: '', descripcion: 'Test description', categoria: 'bug' });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/título|titulo|requerido/i);
  });

  it('returns 400 when titulo is whitespace only', async () => {
    const req = await makeNextRequest({ titulo: '   ', descripcion: 'Test description', categoria: 'bug' });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(400);
  });

  it('returns 400 when descripcion is empty', async () => {
    const req = await makeNextRequest({ titulo: 'Bug title', descripcion: '', categoria: 'bug' });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/descripción|descripcion|requerido/i);
  });

  it('returns 400 when request body is invalid JSON', async () => {
    const { NextRequest } = await import('next/server');
    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json {{',
    });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(400);
  });

  it('maps categoria bug to bug + feedback GitHub labels', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        number: 42,
        html_url: 'https://github.com/htekdev/taller-mecanico/issues/42',
        title: '[Error] Test bug',
      }),
    });

    const req = await makeNextRequest({
      titulo: 'Un bug real',
      descripcion: 'Descripcion completa del bug',
      categoria: 'bug',
    });
    const res = await POST(req as unknown as Request);

    expect(mockFetch).toHaveBeenCalledOnce();
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.labels).toContain('bug');
    expect(body.labels).toContain('feedback');
  });

  it('maps categoria mejora to enhancement + feedback labels', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        number: 43,
        html_url: 'https://github.com/htekdev/taller-mecanico/issues/43',
        title: '[Mejora] Feature request',
      }),
    });

    const req = await makeNextRequest({
      titulo: 'Una mejora',
      descripcion: 'Seria mejor si...',
      categoria: 'mejora',
    });
    await POST(req as unknown as Request);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.labels).toContain('enhancement');
  });

  it('adds prioridad-alta label when prioridad is alta', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        number: 44,
        html_url: 'https://github.com/htekdev/taller-mecanico/issues/44',
        title: '[Error] Urgent bug',
      }),
    });

    const req = await makeNextRequest({
      titulo: 'Bug urgente',
      descripcion: 'Descripcion del bug urgente',
      categoria: 'bug',
      prioridad: 'alta',
    });
    await POST(req as unknown as Request);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.labels).toContain('prioridad-alta');
  });

  it('returns 201 with numero and url on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        number: 99,
        html_url: 'https://github.com/htekdev/taller-mecanico/issues/99',
        title: '[Error] Test',
      }),
    });

    const req = await makeNextRequest({
      titulo: 'Bug con titulo',
      descripcion: 'Descripcion suficiente',
      categoria: 'bug',
    });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.numero).toBe(99);
    expect(json.url).toContain('issues/99');
  });

  it('issue title includes categoria label in brackets', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        number: 50,
        html_url: 'https://github.com/htekdev/taller-mecanico/issues/50',
        title: '[Error] My bug',
      }),
    });

    const req = await makeNextRequest({
      titulo: 'My bug',
      descripcion: 'Bug description',
      categoria: 'bug',
    });
    await POST(req as unknown as Request);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.title).toContain('My bug');
    expect(body.title).toMatch(/\[/); // wrapped in brackets
  });
});

// ─── GET — With GITHUB_TOKEN ──────────────────────────────────────────────────

describe('GET /api/feedback — with GITHUB_TOKEN', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.GITHUB_TOKEN = 'fake-test-token';
    vi.resetModules();
    const mod = await import('@/app/api/feedback/route');
    GET = mod.GET as unknown as () => Promise<Response>;
  });

  it('returns 200 with array of reportes on success', async () => {
    const mockIssue = {
      number: 1,
      title: '[Error] Test bug',
      state: 'open',
      labels: [{ name: 'bug' }, { name: 'feedback' }],
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      html_url: 'https://github.com/htekdev/taller-mecanico/issues/1',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockIssue],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json[0].numero).toBe(1);
    expect(json[0].estado).toBe('pendiente'); // open issue without in-progress label
    expect(json[0].categoria).toBe('bug');
  });

  it('maps closed issue to estado resuelto', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{
        number: 2,
        title: '[Error] Fixed bug',
        state: 'closed',
        labels: [{ name: 'bug' }],
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-02T00:00:00Z',
        html_url: 'https://github.com/htekdev/taller-mecanico/issues/2',
      }],
    });

    const res = await GET();
    const json = await res.json();
    expect(json[0].estado).toBe('resuelto');
  });

  it('maps in-progress label to estado en_progreso', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{
        number: 3,
        title: '[Mejora] In progress feature',
        state: 'open',
        labels: [{ name: 'enhancement' }, { name: 'feedback' }, { name: 'in-progress' }],
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-03T00:00:00Z',
        html_url: 'https://github.com/htekdev/taller-mecanico/issues/3',
      }],
    });

    const res = await GET();
    const json = await res.json();
    expect(json[0].estado).toBe('en_progreso');
  });

  it('returns 200 with empty array when no issues found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });
});
