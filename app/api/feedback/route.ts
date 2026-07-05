import { NextRequest, NextResponse } from 'next/server';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = 'htekdev/taller-mecanico';
const GITHUB_API = 'https://api.github.com';

function githubHeaders() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// ─── POST /api/feedback — Create a new GitHub Issue ──────────────────────────
export async function POST(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return NextResponse.json(
      { error: 'GitHub token no configurado. Contacta al administrador.' },
      { status: 500 }
    );
  }

  let body: {
    titulo: string;
    descripcion: string;
    categoria: 'bug' | 'mejora' | 'sugerencia';
    prioridad?: 'alta' | 'media' | 'baja';
    screenshot?: string; // base64 data URI (optional)
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const { titulo, descripcion, categoria, prioridad, screenshot } = body;

  if (!titulo?.trim() || !descripcion?.trim()) {
    return NextResponse.json({ error: 'Título y descripción son requeridos' }, { status: 400 });
  }

  // Map categoria to GitHub label names
  const labelMap: Record<string, string> = {
    bug: 'bug',
    mejora: 'enhancement',
    sugerencia: 'feedback',
  };

  const labels = ['feedback', labelMap[categoria] ?? 'feedback'];
  if (prioridad === 'alta') labels.push('prioridad-alta');
  else if (prioridad === 'media') labels.push('prioridad-media');
  else if (prioridad === 'baja') labels.push('prioridad-baja');

  // Build issue body in Markdown
  const categoriaLabel = { bug: '🐛 Error', mejora: '✨ Mejora', sugerencia: '💡 Sugerencia' }[categoria] ?? categoria;
  const prioridadLabel = prioridad
    ? { alta: '🔴 Alta', media: '🟡 Media', baja: '🟢 Baja' }[prioridad]
    : null;

  let issueBody = `## Descripción\n\n${descripcion}\n\n---\n\n`;
  issueBody += `**Categoría:** ${categoriaLabel}\n`;
  if (prioridadLabel) issueBody += `**Prioridad:** ${prioridadLabel}\n`;
  issueBody += `\n_Reporte enviado desde la app Taller Mecánico_`;

  if (screenshot) {
    // Include note about screenshot (data URIs don't render in GitHub, but we note it was attached)
    issueBody += `\n\n---\n\n📷 _Se adjuntó una captura de pantalla al momento del reporte._`;
  }

  const githubRes = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: githubHeaders(),
    body: JSON.stringify({
      title: `[${categoriaLabel}] ${titulo.trim()}`,
      body: issueBody,
      labels,
    }),
  });

  if (!githubRes.ok) {
    let errMsg = 'Error al crear el reporte en GitHub';
    try {
      const err = await githubRes.json();
      errMsg = err.message ?? errMsg;
    } catch { /* ignore */ }
    return NextResponse.json({ error: errMsg }, { status: githubRes.status });
  }

  const issue = await githubRes.json();
  return NextResponse.json(
    { numero: issue.number, url: issue.html_url, titulo: issue.title },
    { status: 201 }
  );
}

// ─── GET /api/feedback — List GitHub Issues with 'feedback' label ─────────────
export async function GET() {
  if (!GITHUB_TOKEN) {
    return NextResponse.json(
      { error: 'GitHub token no configurado. Contacta al administrador.' },
      { status: 500 }
    );
  }

  const url = `${GITHUB_API}/repos/${GITHUB_REPO}/issues?state=all&labels=feedback&per_page=50&sort=created&direction=desc`;

  const githubRes = await fetch(url, {
    headers: githubHeaders(),
    next: { revalidate: 60 }, // revalidate every minute
  });

  if (!githubRes.ok) {
    return NextResponse.json(
      { error: 'Error al cargar los reportes desde GitHub' },
      { status: githubRes.status }
    );
  }

  const issues: GitHubIssue[] = await githubRes.json();

  // Map to simplified shape
  const reportes = issues.map((issue) => ({
    numero: issue.number,
    titulo: issue.title,
    estado: resolveEstado(issue),
    categoria: resolveCategoria(issue.labels),
    prioridad: resolvePrioridad(issue.labels),
    fechaCreacion: issue.created_at,
    fechaActualizacion: issue.updated_at,
    url: issue.html_url,
  }));

  return NextResponse.json(reportes);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface GitHubLabel {
  name: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: GitHubLabel[];
  created_at: string;
  updated_at: string;
  html_url: string;
  pull_request?: unknown; // present on PRs — filter these out
}

type EstadoReporte = 'pendiente' | 'en_progreso' | 'resuelto';

function resolveEstado(issue: GitHubIssue): EstadoReporte {
  if (issue.state === 'closed') return 'resuelto';
  const labelNames = issue.labels.map(l => l.name.toLowerCase());
  if (labelNames.includes('in-progress') || labelNames.includes('en-progreso')) return 'en_progreso';
  return 'pendiente';
}

function resolveCategoria(labels: GitHubLabel[]): string {
  const names = labels.map(l => l.name.toLowerCase());
  if (names.includes('bug')) return 'bug';
  if (names.includes('enhancement')) return 'mejora';
  return 'sugerencia';
}

function resolvePrioridad(labels: GitHubLabel[]): string | null {
  const names = labels.map(l => l.name.toLowerCase());
  if (names.includes('prioridad-alta')) return 'alta';
  if (names.includes('prioridad-media')) return 'media';
  if (names.includes('prioridad-baja')) return 'baja';
  return null;
}
