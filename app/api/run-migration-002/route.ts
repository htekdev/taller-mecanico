/**
 * One-shot migration endpoint — 002_member_email_role_update
 *
 * Applies:
 *   - ALTER TABLE taller_members ADD COLUMN email TEXT
 *   - CREATE FUNCTION is_taller_owner()
 *   - CREATE POLICY owner_update_member_role on taller_members
 *
 * Protected by ?secret=MIGRATE_SECRET env var.
 * DELETE THIS FILE after migration is applied.
 *
 * Usage: GET /api/run-migration-002?secret=<MIGRATE_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

const MIGRATION_STATEMENTS = [
  // 1. Add email column for readable member display
  `ALTER TABLE taller_members ADD COLUMN IF NOT EXISTS email TEXT`,

  // 2. Helper function: is current user an owner?
  `CREATE OR REPLACE FUNCTION is_taller_owner(tid UUID)
   RETURNS BOOLEAN AS $$
     SELECT EXISTS (
       SELECT 1 FROM taller_members
       WHERE taller_id = tid AND user_id = auth.uid() AND role = 'owner'
     );
   $$ LANGUAGE sql SECURITY DEFINER`,

  // 3. Allow taller owners to update member roles (multiple owners supported)
  `DROP POLICY IF EXISTS "owner_update_member_role" ON taller_members`,

  `CREATE POLICY "owner_update_member_role" ON taller_members
   FOR UPDATE USING (is_taller_owner(taller_id))
   WITH CHECK (is_taller_owner(taller_id))`,
];

export async function GET(req: NextRequest) {
  const secret   = process.env.MIGRATE_SECRET;
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

  const ok      = results.filter(r => r.status === 'ok').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const failed  = results.filter(r => r.status === 'failed').length;

  return NextResponse.json({
    migration: '002_member_email_role_update',
    summary: { ok, skipped, failed, total: results.length },
    results,
  }, { status: failed > 0 ? 207 : 200 });
}
