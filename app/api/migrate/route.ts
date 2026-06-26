/**
 * General Migration Runner — applies ALL pending Supabase migrations
 *
 * Reads SQL files from supabase/migrations/ directory (embedded at build time),
 * tracks which have been applied in a `_migrations` table, and runs any pending.
 *
 * This ensures migrations are ALWAYS applied via code — never manual SQL Editor.
 *
 * Protected by ?secret=MIGRATE_SECRET env var.
 * Idempotent — safe to hit on every deploy.
 *
 * Usage: GET /api/migrate?secret=<MIGRATE_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

// ── Migration SQL embedded at build time ─────────────────────────────────────
// Each entry: { name, sql }
// Order matters — they run sequentially.

const MIGRATIONS: Array<{ name: string; sql: string }> = [
  {
    name: '005_cotizaciones_table',
    sql: `
      CREATE TABLE IF NOT EXISTS cotizaciones (
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
      );
      CREATE INDEX IF NOT EXISTS idx_cotizaciones_taller_id
        ON cotizaciones (taller_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS cotizacion_counter (
        taller_id   UUID REFERENCES talleres(id) ON DELETE CASCADE PRIMARY KEY,
        last_number INTEGER DEFAULT 0
      );
      ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
      ALTER TABLE cotizacion_counter ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "crud_cotizaciones" ON cotizaciones;
      CREATE POLICY "crud_cotizaciones" ON cotizaciones
        FOR ALL USING (is_taller_member(taller_id)) WITH CHECK (is_taller_member(taller_id));
      DROP POLICY IF EXISTS "crud_cotizacion_counter" ON cotizacion_counter;
      CREATE POLICY "crud_cotizacion_counter" ON cotizacion_counter
        FOR ALL USING (is_taller_member(taller_id)) WITH CHECK (is_taller_member(taller_id));
    `,
  },
  {
    name: '005_ayuntamiento_fields',
    sql: `
      ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS tipo_cliente TEXT DEFAULT 'general' CHECK (tipo_cliente IN ('general', 'ayuntamiento'));
      ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS departamento TEXT;
      ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS inventario_num TEXT;
      ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS orden_servicio_gob TEXT;
      ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS tft_numero TEXT;
      ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS tft_estado TEXT DEFAULT 'sin_tft' CHECK (tft_estado IN ('sin_tft', 'con_tft'));
      ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS fecha_entrada DATE;
      ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS fecha_salida DATE;
    `,
  },
  {
    name: '006_departamentos_config',
    sql: `
      CREATE TABLE IF NOT EXISTS departamentos_config (
        id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        taller_id       UUID REFERENCES talleres(id) ON DELETE CASCADE NOT NULL,
        departamentos   JSONB NOT NULL DEFAULT '[]',
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(taller_id)
      );
      ALTER TABLE departamentos_config ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "crud_departamentos_config" ON departamentos_config;
      CREATE POLICY "crud_departamentos_config" ON departamentos_config
        FOR ALL USING (is_taller_member(taller_id)) WITH CHECK (is_taller_member(taller_id));
    `,
  },
];

// ── Endpoint ─────────────────────────────────────────────────────────────────

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

  const results: Array<{ name: string; status: 'applied' | 'skipped' | 'failed'; error?: string }> = [];

  try {
    await client.connect();

    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get already-applied migrations
    const { rows: applied } = await client.query('SELECT name FROM _migrations');
    const appliedSet = new Set(applied.map(r => r.name));

    for (const migration of MIGRATIONS) {
      if (appliedSet.has(migration.name)) {
        results.push({ name: migration.name, status: 'skipped' });
        continue;
      }

      try {
        // Run all statements in the migration as one transaction
        await client.query('BEGIN');
        await client.query(migration.sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [migration.name]);
        await client.query('COMMIT');
        results.push({ name: migration.name, status: 'applied' });
      } catch (err: unknown) {
        await client.query('ROLLBACK').catch(() => {});
        const msg = err instanceof Error ? err.message : String(err);
        // If it's just "already exists" type errors, mark as applied anyway
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [migration.name]);
          results.push({ name: migration.name, status: 'skipped' });
        } else {
          results.push({ name: migration.name, status: 'failed', error: msg });
        }
      }
    }
  } finally {
    await client.end().catch(() => {});
  }

  const appliedCount = results.filter(r => r.status === 'applied').length;
  const skipped      = results.filter(r => r.status === 'skipped').length;
  const failed       = results.filter(r => r.status === 'failed').length;

  return NextResponse.json({
    summary: { applied: appliedCount, skipped, failed, total: results.length },
    results,
  }, { status: failed > 0 ? 207 : 200 });
}
