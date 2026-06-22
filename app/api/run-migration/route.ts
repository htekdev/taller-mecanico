/**
 * One-shot RLS migration endpoint — 001_fix_invite_rls
 * Uses POSTGRES_URL_NON_POOLING + pg to run DDL directly.
 * Protected by MIGRATE_SECRET. DELETE THIS FILE after migration is applied.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

// Migration SQL inlined (avoids filesystem path issues in Vercel)
const MIGRATION_STATEMENTS = [
  `DROP POLICY IF EXISTS "ver_invitaciones" ON taller_invites`,
  `CREATE POLICY "miembros_gestionar_invitaciones" ON taller_invites
    FOR ALL USING (is_taller_member(taller_id))`,
  `CREATE POLICY "invitado_ver_su_invitacion" ON taller_invites
    FOR SELECT USING (lower(email) = lower(auth.email()))`,
  `CREATE POLICY "invitado_redimir_invitacion" ON taller_invites
    FOR UPDATE USING (lower(email) = lower(auth.email()))`,
];

export async function GET(req: NextRequest) {
  // Auth check via ?secret= query param (matching run-schema pattern)
  const secret = process.env.MIGRATE_SECRET;
  const provided = req.nextUrl.searchParams.get('secret');

  if (!secret) {
    return NextResponse.json({ error: 'MIGRATE_SECRET not set' }, { status: 500 });
  }
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pgUrl = process.env.POSTGRES_URL_NON_POOLING;
  if (!pgUrl) {
    return NextResponse.json({ error: 'POSTGRES_URL_NON_POOLING not available' }, { status: 500 });
  }

  const client = new Client({
    connectionString: pgUrl,
    ssl: { rejectUnauthorized: false },
  });

  const results: Array<{ stmt: string; status: 'ok' | 'skipped' | 'failed'; error?: string }> = [];

  try {
    await client.connect();

    for (const stmt of MIGRATION_STATEMENTS) {
      const preview = stmt.slice(0, 80).replace(/\s+/g, ' ');
      try {
        await client.query(stmt);
        results.push({ stmt: preview, status: 'ok' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          results.push({ stmt: preview, status: 'skipped' });
        } else {
          results.push({ stmt: preview, status: 'failed', error: msg });
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
    migration: '001_fix_invite_rls',
    summary: { ok, skipped, failed, total: results.length },
    results,
  }, { status: failed > 0 ? 207 : 200 });
}
