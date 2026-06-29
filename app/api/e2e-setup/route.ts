import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/e2e-setup — Provisions a test user for E2E tests.
 *
 * Uses the Supabase service role key to create a user with
 * email pre-confirmed. Idempotent — safe to call repeatedly.
 *
 * Only works in non-production environments (checks VERCEL_ENV).
 */
export async function POST(request: NextRequest) {
  // Block in production
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV;
  if (env === 'production' && !process.env.E2E_ALLOW_PRODUCTION) {
    return NextResponse.json(
      { error: 'E2E setup blocked in production' },
      { status: 403 }
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

  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: 'email and password required' },
      { status: 400 }
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Try to create user (idempotent — returns existing if already exists)
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === email);

  if (existing) {
    // User exists — ensure password is set correctly
    await adminClient.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    return NextResponse.json({ status: 'existing', userId: existing.id });
  }

  // Create new user
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also ensure the user has a taller assigned
  if (data.user) {
    // Check if taller exists for this user
    const { data: talleres } = await adminClient
      .from('talleres')
      .select('id')
      .limit(1);

    if (talleres && talleres.length > 0) {
      // Add user as member of first taller
      await adminClient.from('taller_members').upsert(
        { taller_id: talleres[0].id, user_id: data.user.id, role: 'owner' },
        { onConflict: 'taller_id,user_id' }
      );
    }
  }

  return NextResponse.json({ status: 'created', userId: data.user?.id });
}
