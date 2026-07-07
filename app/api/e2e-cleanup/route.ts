import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/e2e-cleanup — Deletes accumulated test data before each CI run.
 *
 * The shared Supabase test DB accumulates data across many CI runs, causing
 * cargarDatos() to slow down significantly. This endpoint cleans up data older
 * than 30 minutes so concurrent CI runs don't interfere with each other.
 *
 * Called by e2e/global-setup.ts before each test suite run.
 */
export async function POST(request: NextRequest) {
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

  const { email } = await request.json().catch(() => ({}));
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find user by email
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const user = usersData?.users?.find((u: { email?: string }) => u.email === email);
  if (!user) {
    return NextResponse.json({ status: 'no_user', deleted: 0 });
  }

  // Find taller for this user
  const { data: members } = await adminClient
    .from('taller_members')
    .select('taller_id')
    .eq('user_id', user.id)
    .limit(1);

  if (!members?.length) {
    return NextResponse.json({ status: 'no_taller', deleted: 0 });
  }

  const tallerId = members[0].taller_id;

  // Only delete data older than 30 minutes — avoids wiping data from concurrent CI runs
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Deletion order respects FK constraints (SET NULL allows any order, but explicit is safer)
  const tables = [
    'facturas',        // refs trabajos/clientes/vehiculos (SET NULL)
    'trabajos',        // refs clientes/vehiculos (SET NULL)
    'cotizaciones',    // refs taller (CASCADE)
    'ordenes_compra',  // refs proveedores (SET NULL)
    'gastos',          // refs taller (CASCADE)
    'vehiculos',       // refs clientes (CASCADE) — deleted before clientes
    'refacciones',     // refs taller (CASCADE)
    'proveedores',     // refs taller (CASCADE)
    'clientes',        // refs taller (CASCADE) — cascades vehiculos
  ];

  const results: Record<string, number> = {};
  for (const table of tables) {
    try {
      const { count, error } = await adminClient
        .from(table)
        .delete({ count: 'exact' })
        .eq('taller_id', tallerId)
        .lt('created_at', cutoff);
      results[table] = count ?? 0;
      if (error) console.warn(`[E2E Cleanup] ${table} error:`, error.message);
    } catch (err) {
      results[table] = -1;
      console.warn(`[E2E Cleanup] ${table} threw:`, String(err));
    }
  }

  const totalDeleted = Object.values(results).filter(n => n > 0).reduce((a, b) => a + b, 0);
  console.log(`[E2E Cleanup] Deleted ${totalDeleted} records for taller ${tallerId} (cutoff: ${cutoff})`);

  return NextResponse.json({
    status: 'cleaned',
    tallerId,
    cutoff,
    deleted: results,
    total: totalDeleted,
  });
}
