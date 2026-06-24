/**
 * One-shot migration endpoint — 003_email_clientes_iva_ordenes
 *
 * Applies:
 *   - ALTER TABLE clientes ADD COLUMN email TEXT (optional)
 *   - ALTER TABLE clientes ADD COLUMN email2 TEXT (optional)
 *   - ALTER TABLE ordenes_compra ADD COLUMN subtotal_sin_iva DECIMAL
 *   - ALTER TABLE ordenes_compra ADD COLUMN iva_amount DECIMAL
 *   - ALTER TABLE ordenes_compra ADD COLUMN con_iva BOOLEAN
 *
 * Protected by ?secret=MIGRATE_SECRET env var.
 * Uses POSTGRES_URL_NON_POOLING (superuser — has DDL rights).
 *
 * Usage: GET /api/run-migration-003?secret=<MIGRATE_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

const MIGRATION_STATEMENTS = [
  `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL`,
  `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email2 TEXT DEFAULT NULL`,
  `ALTER TABLE ordenes_compra ADD COLUMN IF NOT EXISTS subtotal_sin_iva DECIMAL(12,2) DEFAULT 0`,
  `ALTER TABLE ordenes_compra ADD COLUMN IF NOT EXISTS iva_amount DECIMAL(12,2) DEFAULT 0`,
  `ALTER TABLE ordenes_compra ADD COLUMN IF NOT EXISTS con_iva BOOLEAN DEFAULT false`,
  // Backfill: existing orders get subtotal_sin_iva = total (no IVA breakdown before)
  `UPDATE ordenes_compra SET subtotal_sin_iva = total, iva_amount = 0, con_iva = false WHERE subtotal_sin_iva IS NULL OR subtotal_sin_iva = 0`,
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
    migration: '003_email_clientes_iva_ordenes',
    summary: { ok, skipped, failed, total: results.length },
    results,
  }, { status: failed > 0 ? 207 : 200 });
}
