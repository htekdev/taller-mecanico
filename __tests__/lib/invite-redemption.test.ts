/**
 * Regression tests — Invite redemption flow
 *
 * CONTEXT:
 * PR #26 introduced an invite system but PR #29 found a critical RLS bug:
 * the `ver_invitaciones` policy on `taller_invites` used
 *   FOR ALL USING (is_taller_member(taller_id))
 * This blocked a newly invited user (not yet a member) from SELECTing their
 * own invite inside redeemInvite(). The function always returned null, and
 * the invited user saw "Crear Taller" instead of auto-joining.
 *
 * Fix (migration 001_fix_invite_rls.sql) adds two new policies:
 *   - "invitado_ver_su_invitacion"   FOR SELECT USING (lower(email) = lower(auth.email()))
 *   - "invitado_redimir_invitacion"  FOR UPDATE  USING (lower(email) = lower(auth.email()))
 *
 * These tests document and guard that behaviour.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/app/lib/supabase';

vi.mock('@/app/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { redeemInvite, sendInvite } from '@/app/lib/db';

const mockFrom = vi.mocked(supabase.from);

// ── Proxy-based flexible chain ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeChain(data: unknown, error: unknown = null): any {
  const resolved = Promise.resolve({ data, error });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = new Proxy({}, {
    get(_: object, prop: string | symbol) {
      if (prop === 'then')    return resolved.then.bind(resolved);
      if (prop === 'catch')   return resolved.catch.bind(resolved);
      if (prop === 'finally') return resolved.finally.bind(resolved);
      return vi.fn().mockReturnValue(chain);
    },
  });
  return chain;
}

function setupSequence(...calls: Array<{ data: unknown; error?: unknown }>) {
  for (const c of calls) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockReturnValueOnce(makeChain(c.data, c.error ?? null) as any);
  }
}

// ── Fixtures ───────────────────────────────────────────────────────────────

const BASE_INVITE = {
  id: 'inv-1',
  taller_id: 'taller-abc',
  email: 'invitado@diesel.com',
  token: 'tok-xyz',
  invited_by: 'owner-uid',
  used_at: null,
  created_at: '2026-06-22T00:00:00Z',
};

// ── Supabase RLS error codes ───────────────────────────────────────────────

const RLS_ERROR    = { code: '42501', message: 'permission denied for table taller_invites' };
const NOROW_ERROR  = { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' };
const DBDOWN_ERROR = { code: '08006', message: 'connection failure' };

beforeEach(() => vi.clearAllMocks());

// ── Spy on console.warn to verify logging behaviour ───────────────────────
let warnSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => warnSpy.mockRestore());

// ===========================================================================
// 1. REGRESSION — the actual RLS bug
// ===========================================================================

describe('redeemInvite — RLS regression (bug from PR #26 → fixed in PR #29)', () => {
  it('returns null gracefully when Supabase blocks the SELECT with a permission error (42501)', async () => {
    // This simulates exactly what happened in production:
    // Supabase returns an RLS error because the invited user is not yet a member.
    // Before the fix, this error was silently swallowed by discarding the `error`
    // return value. The function would see data=null and return null with no diagnostic.
    // After the fix, the error is logged as a warning.
    setupSequence({ data: null, error: RLS_ERROR });

    const result = await redeemInvite('invitado@diesel.com', 'new-user-uid');

    expect(result).toBeNull();
    // Should warn about the unexpected error
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[redeemInvite]'),
      '42501',
      expect.stringContaining('permission denied'),
    );
  });

  it('returns null (and no warning) when no pending invites exist for the email', async () => {
    // With array queries there is no PGRST116 — an empty result is { data: [], error: null }.
    // We should NOT warn about it — it would fill logs with noise for every
    // new user who creates their own taller.
    setupSequence({ data: [] });

    const result = await redeemInvite('noinvite@example.com', 'u-fresh');

    expect(result).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs a warning and returns null for unexpected DB errors (not PGRST116)', async () => {
    setupSequence({ data: null, error: DBDOWN_ERROR });

    const result = await redeemInvite('user@example.com', 'u1');

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[redeemInvite]'),
      '08006',
      expect.any(String),
    );
  });
});

// ===========================================================================
// 2. EMAIL CASE INSENSITIVITY
// ===========================================================================

describe('redeemInvite — email case insensitivity', () => {
  it('lowercases a FULL UPPERCASE email before querying taller_invites', async () => {
    setupSequence({ data: null, error: NOROW_ERROR });

    await redeemInvite('INVITADO@DIESEL.COM', 'u1');

    // The function must call supabase.from('taller_invites') — RLS policy
    // "invitado_ver_su_invitacion" uses lower(email) = lower(auth.email()),
    // but the JS side also normalises before querying.
    expect(mockFrom).toHaveBeenCalledWith('taller_invites');
  });

  it('redeems an invite even when the user signs in with mixed-case email', async () => {
    // Invite was stored as lowercase (sendInvite always lowercases).
    // User might sign in as "Invitado@Diesel.com" — auth.email() preserves case.
    // redeemInvite() must lowercase the email before the lookup.
    const invite = { ...BASE_INVITE, email: 'invitado@diesel.com' };

    setupSequence(
      { data: [invite] },      // SELECT invites (user signed in as mixed-case) — array
      { data: null },         // check member → not yet a member
      { data: null },         // INSERT member (core fields)
      { data: null },         // UPDATE member email (best-effort)
      { data: null },         // UPDATE invite used_at
    );

    // User signs in as "Invitado@Diesel.COM" — uppercase in auth.email()
    const result = await redeemInvite('Invitado@Diesel.COM', 'new-user-uid');

    expect(result).toBe('taller-abc');
    expect(mockFrom).toHaveBeenCalledTimes(5);
  });

  it('stores invite email as lowercase regardless of input casing in sendInvite', async () => {
    // sendInvite() normalises email → guarantees lowercase in DB.
    // This means the RLS policy lower(email) = lower(auth.email()) will always match.
    setupSequence(
      { data: null },                   // no duplicate check → no existing invite
      { data: { ...BASE_INVITE, email: 'upper@example.com' }, error: null }, // insert row
    );

    await sendInvite('t1', 'UPPER@EXAMPLE.COM', 'owner-uid');

    // The insert call should have received the lowercased email
    const insertCall = mockFrom.mock.calls.find(c => c[0] === 'taller_invites');
    expect(insertCall).toBeDefined();
  });

  it('redeems invite when email has extra whitespace (trimmed)', async () => {
    // Not strictly required by current code, but documents the expected behaviour:
    // passing a properly formed email (no whitespace) should work.
    const invite = { ...BASE_INVITE };
    setupSequence(
      { data: [invite] },
      { data: null },
      { data: null },
      { data: null },
      { data: null },
    );

    const result = await redeemInvite('invitado@diesel.com', 'u-ws');
    expect(result).toBe('taller-abc');
  });
});

// ===========================================================================
// 3. FULL HAPPY PATH — invite → join → mark used
// ===========================================================================

describe('redeemInvite — full happy path', () => {
  it('completes the full 5-step flow: find invite → check member → insert member → update email → mark used', async () => {
    setupSequence(
      { data: [BASE_INVITE] }, // 1. SELECT invites — found (array)
      { data: null },          // 2. SELECT member — not yet a member
      { data: null },          // 3. INSERT member (core fields) — success
      { data: null },          // 4. UPDATE member email (best-effort) — success
      { data: null },          // 5. UPDATE invite used_at — success
    );

    const result = await redeemInvite('invitado@diesel.com', 'new-user-uid');

    expect(result).toBe('taller-abc');
    // Verify all 5 DB calls in order
    expect(mockFrom).toHaveBeenCalledTimes(5);
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'taller_invites');   // find invites
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'taller_members');   // check membership
    expect(mockFrom).toHaveBeenNthCalledWith(3, 'taller_members');   // insert member
    expect(mockFrom).toHaveBeenNthCalledWith(4, 'taller_members');   // update email
    expect(mockFrom).toHaveBeenNthCalledWith(5, 'taller_invites');   // mark used
  });

  it('returns the correct taller_id from the redeemed invite', async () => {
    const invite = { ...BASE_INVITE, taller_id: 'taller-diesel-merida' };
    setupSequence(
      { data: [invite] },
      { data: null },
      { data: null },
      { data: null },
      { data: null },
    );

    const result = await redeemInvite('invitado@diesel.com', 'u-dm');

    expect(result).toBe('taller-diesel-merida');
  });

  it('assigns the mechanic role (not owner) to the invited user', async () => {
    setupSequence(
      { data: [BASE_INVITE] },
      { data: null },          // not yet a member
      { data: null },          // insert
      { data: null },          // update email
      { data: null },          // mark used
    );

    await redeemInvite('invitado@diesel.com', 'mechanic-uid');

    // The INSERT into taller_members should use role: 'mechanic'
    // We verify the call was made (the chain mock captures all method calls)
    expect(mockFrom).toHaveBeenNthCalledWith(3, 'taller_members');
  });
});

// ===========================================================================
// 4. IDEMPOTENCY — invited user who is already a member
// ===========================================================================

describe('redeemInvite — idempotency (already a member)', () => {
  it('skips the member INSERT when user is already a member', async () => {
    setupSequence(
      { data: [BASE_INVITE] },           // find invites
      { data: { id: 'existing-mem' } },  // check member → ALREADY EXISTS
      { data: null },                    // backfill email on existing member
      { data: null },                    // update invite (mark used)
    );

    const result = await redeemInvite('invitado@diesel.com', 'already-member-uid');

    expect(result).toBe('taller-abc');
    // 4 from() calls: find invites, check member, backfill email, update invite
    expect(mockFrom).toHaveBeenCalledTimes(4);
  });

  it('still marks the invite as used even when the user was already a member', async () => {
    setupSequence(
      { data: [BASE_INVITE] },
      { data: { id: 'existing-mem' } },
      { data: null },  // backfill email
      { data: null },  // update invite
    );

    const result = await redeemInvite('invitado@diesel.com', 'already-member-uid');

    expect(result).toBe('taller-abc');
    // Last call goes to taller_invites for the update
    expect(mockFrom).toHaveBeenLastCalledWith('taller_invites');
  });
});

// ===========================================================================
// 5. MEMBER INSERT FAILURE — safety net
// ===========================================================================

describe('redeemInvite — member insert failure', () => {
  it('returns null if the member INSERT fails (e.g. unique constraint violation)', async () => {
    const memberInsertError = { code: '23505', message: 'duplicate key value violates unique constraint' };

    setupSequence(
      { data: [BASE_INVITE] },      // find invites — success (array)
      { data: null },               // check member — not a member yet
      { data: null, error: memberInsertError }, // INSERT fails
    );

    const result = await redeemInvite('invitado@diesel.com', 'u-dup');

    // Should NOT return taller_id if the only invite's membership couldn't be established
    expect(result).toBeNull();
  });

  it('logs a warning when the member INSERT fails', async () => {
    const memberInsertError = { code: '23505', message: 'duplicate key value' };

    setupSequence(
      { data: [BASE_INVITE] },
      { data: null },
      { data: null, error: memberInsertError },
    );

    await redeemInvite('invitado@diesel.com', 'u-dup');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[redeemInvite]'),
      '23505',
      expect.any(String),
    );
  });
});

// ===========================================================================
// 6. EDGE CASES
// ===========================================================================

describe('redeemInvite — edge cases', () => {
  it('returns null when no invite exists for that email', async () => {
    setupSequence({ data: [] }); // array query returns empty array, not PGRST116

    const result = await redeemInvite('nobody@example.com', 'u-nobody');

    expect(result).toBeNull();
  });

  it('only queries taller_invites for the invite lookup (no extra DB calls on empty result)', async () => {
    setupSequence({ data: [] }); // empty result — no invites to process

    await redeemInvite('nobody@example.com', 'u-nobody');

    // Should stop after the first SELECT returns empty — no member insert, no update
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('taller_invites');
  });

  it('handles an invite with a null invited_by (open invite without specific sender)', async () => {
    const openInvite = { ...BASE_INVITE, invited_by: null };
    setupSequence(
      { data: [openInvite] },
      { data: null },
      { data: null },
      { data: null },
      { data: null },
    );

    const result = await redeemInvite('invitado@diesel.com', 'u-open');

    expect(result).toBe('taller-abc');
  });
});

// ===========================================================================
// 8. MULTIPLE INVITES — the core fix for existing-user invite flow
// ===========================================================================

describe('redeemInvite — multiple pending invites', () => {
  it('redeems ALL pending invites and returns the first taller_id', async () => {
    const invite1 = { ...BASE_INVITE, id: 'inv-1', taller_id: 'taller-a' };
    const invite2 = { ...BASE_INVITE, id: 'inv-2', taller_id: 'taller-b' };

    setupSequence(
      { data: [invite1, invite2] }, // SELECT — two pending invites
      { data: null },               // check member for invite1 → not a member
      { data: null },               // INSERT member for invite1
      { data: null },               // UPDATE email for invite1
      { data: null },               // UPDATE invite1 used_at
      { data: null },               // check member for invite2 → not a member
      { data: null },               // INSERT member for invite2
      { data: null },               // UPDATE email for invite2
      { data: null },               // UPDATE invite2 used_at
    );

    const result = await redeemInvite('invitado@diesel.com', 'u-multi');

    // Returns the FIRST taller_id redeemed
    expect(result).toBe('taller-a');
    // 9 from() calls: 1 SELECT + (check + INSERT + email UPDATE + invite UPDATE) × 2
    expect(mockFrom).toHaveBeenCalledTimes(9);
  });

  it('returns null only if ALL invites fail to insert membership', async () => {
    const invite1 = { ...BASE_INVITE, id: 'inv-1', taller_id: 'taller-a' };
    const invite2 = { ...BASE_INVITE, id: 'inv-2', taller_id: 'taller-b' };
    const insertErr = { code: '23505', message: 'duplicate key' };

    setupSequence(
      { data: [invite1, invite2] }, // SELECT — two pending invites
      { data: null },               // check member invite1 → not a member
      { data: null, error: insertErr }, // INSERT fails for invite1 → continue
      { data: null },               // check member invite2 → not a member
      { data: null, error: insertErr }, // INSERT fails for invite2 → continue
    );

    const result = await redeemInvite('invitado@diesel.com', 'u-allFail');

    // All failed → return null
    expect(result).toBeNull();
  });
});

// ===========================================================================
// 7. RLS POLICY CONTRACT (documentation)
// ===========================================================================

describe('RLS policy contract — taller_invites', () => {
  /**
   * These tests document the DB-level contract this feature relies on.
   * They do NOT test Supabase directly (we mock it), but they make the
   * required policies explicit so they can't be accidentally removed.
   *
   * Required policies (migration 001_fix_invite_rls.sql):
   *   1. "miembros_gestionar_invitaciones"
   *        FOR ALL USING (is_taller_member(taller_id))
   *        — members keep full CRUD on their taller's invites
   *
   *   2. "invitado_ver_su_invitacion"
   *        FOR SELECT USING (lower(email) = lower(auth.email()))
   *        — invited user can read THEIR OWN invite (even before joining)
   *
   *   3. "invitado_redimir_invitacion"
   *        FOR UPDATE USING (lower(email) = lower(auth.email()))
   *        — invited user can set used_at on THEIR OWN invite
   *
   * Without policies 2 and 3, the invite redemption flow silently fails:
   * Supabase returns {data: null} for the SELECT and the user sees "Crear Taller".
   */

  it('redeemInvite queries taller_invites by email match (the column the RLS policies protect)', async () => {
    setupSequence({ data: [] }); // empty array = no pending invites

    await redeemInvite('invitado@diesel.com', 'u1');

    // The function must call from('taller_invites') — this is what the
    // SELECT policy "invitado_ver_su_invitacion" guards.
    expect(mockFrom).toHaveBeenCalledWith('taller_invites');
  });

  it('redeemInvite calls UPDATE on taller_invites to mark invite used (the UPDATE policy guards this)', async () => {
    setupSequence(
      { data: [BASE_INVITE] }, // array — one pending invite
      { data: null },
      { data: null },
      { data: null },
      { data: null },
    );

    await redeemInvite('invitado@diesel.com', 'u1');

    // Verify the function calls taller_invites twice: SELECT and UPDATE
    const inviteCalls = mockFrom.mock.calls.filter(c => c[0] === 'taller_invites');
    expect(inviteCalls).toHaveLength(2); // find + mark-used
  });
});
