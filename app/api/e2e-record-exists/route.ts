import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/e2e-record-exists?table=refacciones&name=PartName&email=test@test.com
 *
 * Checks whether a named record exists in the given table for the test user's taller.
 * Uses the service-role key to bypass RLS — confirms the DB write has committed
 * independently of the app's Supabase auth client.
 *
 * Used by E2E tests via waitForDbRecord() to confirm an INSERT reached Supabase
 * before asserting in the UI. This decouples the "did the DB commit?" check from
 * the "did the app fetch succeed?" check, eliminating false negatives on Vercel
 * preview cold starts where the app-level auth session is not yet warm.
 *
 * Only works in non-production environments (guarded by VERCEL_ENV / NODE_ENV).
 */

// Allowlisted tables — prevents arbitrary DB reads via this endpoint.
const ALLOWED_TABLES = ['refacciones', 'clientes', 'proveedores', 'gastos'] as const;
type AllowedTable = typeof ALLOWED_TABLES[number];

export async function GET(request: NextRequest) {
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV;
  if (env === 'production' && !process.env.E2E_ALLOW_PRODUCTION) {
    return NextResponse.json({ error: 'Blocked in production' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');
  const name = searchParams.get('name');
  const email = searchParams.get('email');

  if (!table || !name || !email) {
    return NextResponse.json(
      { error: 'table, name, and email query parameters are required' },
      { status: 400 }
    );
  }

  if (!(ALLOWED_TABLES as readonly string[]).includes(table)) {
    return NextResponse.json(
      { error: `table must be one of: ${ALLOWED_TABLES.join(', ')}` },
      { status: 400 }
    );
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

  // Resolve user by email. The Supabase Admin API does not support server-side
  // email filtering in listUsers(), so we fetch and filter client-side. This is
  // acceptable for E2E test endpoints: the test DB holds at most a handful of
  // users (typically 1–2 per environment), so perPage: 1000 never incurs
  // meaningful overhead and pagination is unnecessary in practice.
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const user = usersData?.users?.find((u: { email?: string }) => u.email === email);
  if (!user) {
    return NextResponse.json({ exists: false, reason: 'user_not_found' });
  }

  // Resolve the taller for this user
  const { data: members } = await adminClient
    .from('taller_members')
    .select('taller_id')
    .eq('user_id', user.id)
    .limit(1);

  if (!members?.length) {
    return NextResponse.json({ exists: false, reason: 'no_taller' });
  }

  const tallerId = members[0].taller_id;

  // Check whether the named record exists in the taller's data
  const { data, error } = await adminClient
    .from(table as AllowedTable)
    .select('id')
    .eq('taller_id', tallerId)
    .ilike('nombre', name)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ exists: (data?.length ?? 0) > 0 });
}
