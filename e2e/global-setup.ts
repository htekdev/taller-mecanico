import { type FullConfig } from '@playwright/test';

/**
 * E2E Global Setup -- Taller Mecanico
 *
 * Runs ONCE before the entire test suite.
 * 1. Provisions the E2E test user in the target environment
 * 2. Cleans up accumulated test data from previous CI runs (fixes slow cargarDatos())
 *
 * Why cleanup is critical: the shared Supabase test DB accumulates thousands of
 * records from many CI runs. cargarDatos() loads ALL records on startup, causing
 * tests to slow to 2-6 minutes just for initial load. Cleanup keeps the DB lean.
 */
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'sofia@test.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'Test1234!';

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';

  // -- 1. Provision test user ------------------------------------------------
  console.log(`[E2E Setup] Provisioning test user ${TEST_EMAIL} at ${baseURL}...`);
  try {
    const response = await fetch(`${baseURL}/api/e2e-setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      console.log('[E2E Setup] Test user ready', body);
    } else {
      console.warn(`[E2E Setup] Setup responded ${response.status}:`, body);
    }
  } catch (err) {
    console.warn('[E2E Setup] Could not reach setup endpoint:', String(err));
  }

  // -- 2. Clean accumulated test data ----------------------------------------
  // Without cleanup, cargarDatos() takes 2-6 minutes after hundreds of CI runs,
  // causing nearly every test to timeout. The cleanup removes records > 30 minutes
  // old so concurrent CI runs do not interfere with each other.
  console.log('[E2E Setup] Cleaning old test data...');
  try {
    const cleanupResponse = await fetch(`${baseURL}/api/e2e-cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL }),
    });
    const cleanupBody = await cleanupResponse.json().catch(() => ({}));
    if (cleanupResponse.ok) {
      const total = cleanupBody.total ?? 0;
      console.log(`[E2E Setup] Cleanup done: ${total} old records deleted`);
    } else {
      console.warn(`[E2E Setup] Cleanup responded ${cleanupResponse.status}:`, cleanupBody);
    }
  } catch (err) {
    // Non-fatal -- tests run even without cleanup (just slower with bloated DB)
    console.warn('[E2E Setup] Could not clean test data:', String(err));
  }

  // -- 3. Supabase warm-up ------------------------------------------------
  // Pre-warm the Supabase connection pool so the first test does not time out
  // waiting for cold-start DB queries. Without this, cargarDatos() can take
  // 30-60 s on the first call after a Vercel cold deploy, causing spurious failures.
  console.log('[E2E Setup] Warming up Supabase connection...');
  try {
    const warmupResponse = await fetch(`${baseURL}/api/e2e-warmup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const warmupBody = await warmupResponse.json().catch(() => ({}));
    if (warmupResponse.ok) {
      console.log(`[E2E Setup] Supabase warm: ${warmupBody.tables ?? 0}/${9} tables ready`);
    } else {
      console.warn(`[E2E Setup] Warm-up responded ${warmupResponse.status}:`, warmupBody);
    }
  } catch (err) {
    // Non-fatal — tests will run with Supabase cold, first test may be slow
    console.warn('[E2E Setup] Could not warm up Supabase:', String(err));
  }
}
