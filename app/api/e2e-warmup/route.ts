import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/e2e-warmup — Pre-warms Supabase connections before the E2E suite.
 *
 * Called once from e2e/global-setup.ts to avoid cold-start timeouts during tests.
 * Runs lightweight HEAD queries on each core table so the DB connection pool is
 * ready by the time the first test executes.
 *
 * Root cause: Supabase projects may enter a low-activity state between deploys.
 * The first authenticated query after a cold start can take 30-60 s, causing
 * test timeouts that have nothing to do with the application logic.
 */
export async function POST(_request: NextRequest) {
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV;
  if (env === 'production' && !process.env.E2E_ALLOW_PRODUCTION) {
    return NextResponse.json({ error: 'Blocked in production' }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 }
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Issue lightweight HEAD queries on each table that cargarDatos() fetches.
  // count: 'exact' with head: true is the cheapest way to wake a Supabase table.
  const tables = [
    'talleres',
    'clientes',
    'vehiculos',
    'refacciones',
    'trabajos',
    'proveedores',
    'ordenes_compra',
    'facturas',
    'gastos',
  ];

  const results = await Promise.allSettled(
    tables.map(t =>
      adminClient.from(t).select('id', { count: 'exact', head: true }).limit(1)
    )
  );

  const warmed = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`[E2E Warmup] ${warmed}/${tables.length} tables warmed, ${failed} failed`);

  // Note: production access is blocked by the VERCEL_ENV check above plus the
  // requirement for SUPABASE_SERVICE_ROLE_KEY — consistent with all other /api/e2e-*
  // routes. Additionally, this endpoint only performs read-only SELECT queries with
  // head:true (no rows are returned, only counts).
  return NextResponse.json({ status: 'warmed', tables: warmed, failed, total: tables.length });
}
