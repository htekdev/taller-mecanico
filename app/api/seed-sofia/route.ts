/**
 * One-shot endpoint — seed sofia@test.com in production Supabase.
 *
 * Creates:
 *   1. auth user  — sofia@test.com / Test1234! (email confirmed)
 *   2. talleres   — "Taller Diesel Mérida" with fixed UUID
 *   3. taller_members — sofia as owner
 *
 * Protected by ?secret=MIGRATE_SECRET env var.
 * DELETE THIS FILE after seeding is confirmed.
 *
 * Usage: GET /api/seed-sofia?secret=<MIGRATE_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TALLER_ID = 'b0000000-0000-0000-0000-000000000001';
const MEMBER_ID = 'c0000000-0000-0000-0000-000000000001';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.SEED_SOFIA_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var' },
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Record<string, string> = {};

  // ── 1. Auth user ─────────────────────────────────────────────────────────
  // Check if sofia@test.com already exists.
  const { data: userList } = await admin.auth.admin.listUsers();
  const existing = userList?.users?.find(u => u.email === 'sofia@test.com');

  let sofiaId: string;
  if (existing) {
    sofiaId = existing.id;
    results.auth_user = `already_exists (${sofiaId})`;
  } else {
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email:         'sofia@test.com',
      password:      'Test1234!',
      email_confirm: true,
      user_metadata: { nombre: 'Sofía' },
    });
    if (authErr || !created?.user) {
      return NextResponse.json({ error: `auth.createUser: ${authErr?.message}`, results }, { status: 500 });
    }
    sofiaId = created.user.id;
    results.auth_user = `created (${sofiaId})`;
  }

  // ── 2. Taller ─────────────────────────────────────────────────────────────
  const { error: tallerErr } = await admin
    .from('talleres')
    .upsert({ id: TALLER_ID, nombre: 'Taller Diesel Mérida', created_by: sofiaId }, { onConflict: 'id' });
  results.taller = tallerErr ? `error: ${tallerErr.message}` : 'ok';

  // ── 3. Member ──────────────────────────────────────────────────────────────
  const { error: memberErr } = await admin
    .from('taller_members')
    .upsert(
      { id: MEMBER_ID, taller_id: TALLER_ID, user_id: sofiaId, role: 'owner', email: 'sofia@test.com' },
      { onConflict: 'id' },
    );
  results.member = memberErr ? `error: ${memberErr.message}` : 'ok';

  return NextResponse.json({ ok: true, sofia_id: sofiaId, results });
}
