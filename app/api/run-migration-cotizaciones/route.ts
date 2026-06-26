/**
 * One-shot migration endpoint — create cotizaciones + cotizacion_counter tables
 *
 * The tables were defined in supabase/migrations/20260626020000_create_cotizaciones_table.sql
 * but never applied to production. This endpoint applies them.
 *
 * Protected by ?secret=MIGRATE_SECRET env var.
 * Uses POSTGRES_URL_NON_POOLING (direct connection with DDL rights).
 *
 * Usage: GET /api/run-migration-cotizaciones?secret=<MIGRATE_SECRET>
 *
 * After successful run, this endpoint can be removed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

const MIGRATION_STATEMENTS = [
  // Create cotizaciones table
  `CREATE TABLE IF NOT EXISTS cotizaciones (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    taller_id           UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
    numero_cotizacion   TEXT NOT NULL,
    plantilla           TEXT NOT NULL DEFAULT 'general'
                          CHECK (plantilla IN ('general', 'ayuntamiento', 'red_ambiental')),
    cliente             TEXT NOT NULL DEFAULT '',
    fecha               DATE,
    total               DECIMAL(12,2) DEFAULT 0,
    cancelada           BOOLEAN DEFAULT false,
    editada             BOOLEAN DEFAULT false,
    convertida          BOOLEAN DEFAULT false,
    form                JSONB NOT NULL DEFAULT '{}',
    saved_at            TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Index for fast taller-scoped queries
  `CREATE INDEX IF NOT EXISTS idx_cotizaciones_taller_id
    ON cotizaciones (taller_id, created_at DESC)`,

  // Counter table for sequential COT-### numbers
  `CREATE TABLE IF NOT EXISTS cotizacion_counter (
    taller_id   UUID REFERENCES talleres(id) ON DELETE CASCADE PRIMARY KEY,
    last_number INTEGER DEFAULT 0
  )`,

  // Enable RLS
  `ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE cotizacion_counter ENABLE ROW LEVEL SECURITY`,

  // RLS policies
  `DROP POLICY IF EXISTS "crud_cotizaciones" ON cotizaciones`,
  `CREATE POLICY "crud_cotizaciones" ON cotizaciones
    FOR ALL
    USING (is_taller_member(taller_id))
    WITH CHECK (is_taller_member(taller_id))`,

  `DROP POLICY IF EXISTS "crud_cotizacion_counter" ON cotizacion_counter`,
  `CREATE POLICY "crud_cotizacion_counter" ON cotizacion_counter
    FOR ALL
    USING (is_taller_member(taller_id))
    WITH CHECK (is_taller_member(taller_id))`,
];

export async function GET(req: NextRequest) {
  const secret   = process.env.MIGRATE_SECRET;
  const provided = req.nextUrl.searchParams.get('secret');

  if (!secret) {
    return NextResponse.json({ error: 'MIGRATE_SECRET not set on server' }, { status: 500 });
  }
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pgUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
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
    migration: 'cotizaciones + cotizacion_counter',
    summary: { ok, skipped, failed, total: results.length },
    results,
  }, { status: failed > 0 ? 207 : 200 });
}
