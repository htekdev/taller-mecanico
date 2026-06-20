import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// GET /api/run-schema?secret=XXX
// Runs supabase/schema.sql against the live Postgres database.
// Protected by MIGRATE_SECRET env var (required).
// Safe to run multiple times — schema uses IF NOT EXISTS throughout.

export async function GET(req: NextRequest) {
  const secret = process.env.MIGRATE_SECRET;
  const provided = req.nextUrl.searchParams.get('secret');

  if (!secret) {
    return NextResponse.json(
      { error: 'MIGRATE_SECRET env var is not set. Set it in Vercel to use this endpoint.' },
      { status: 500 }
    );
  }
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized — wrong secret' }, { status: 401 });
  }

  const pgUrl = process.env.POSTGRES_URL_NON_POOLING;
  if (!pgUrl) {
    return NextResponse.json({ error: 'POSTGRES_URL_NON_POOLING not available' }, { status: 500 });
  }

  // Read schema.sql — in Vercel, the project root is /var/task
  // In the repo the file is at supabase/schema.sql
  let schema: string;
  try {
    schema = readFileSync(resolve(process.cwd(), 'supabase', 'schema.sql'), 'utf-8');
  } catch {
    return NextResponse.json({ error: 'Could not read supabase/schema.sql' }, { status: 500 });
  }

  // Split SQL into individual statements
  const statements = schema
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  const client = new Client({
    connectionString: pgUrl,
    ssl: { rejectUnauthorized: false },
  });

  const results: Array<{ stmt: string; status: 'ok' | 'skipped' | 'failed'; error?: string }> = [];

  try {
    await client.connect();

    for (const stmt of statements) {
      const preview = stmt.slice(0, 100).replace(/\s+/g, ' ');
      try {
        await client.query(stmt);
        results.push({ stmt: preview, status: 'ok' });
      } catch (err: any) {
        if (
          err.message?.includes('already exists') ||
          err.message?.includes('duplicate')
        ) {
          results.push({ stmt: preview, status: 'skipped' });
        } else {
          results.push({ stmt: preview, status: 'failed', error: err.message });
        }
      }
    }
  } finally {
    await client.end().catch(() => {});
  }

  const ok      = results.filter((r) => r.status === 'ok').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed  = results.filter((r) => r.status === 'failed').length;

  return NextResponse.json({
    summary: { ok, skipped, failed, total: results.length },
    results,
  }, { status: failed > 0 ? 207 : 200 });
}
