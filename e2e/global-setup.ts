import { type FullConfig } from '@playwright/test';

/**
 * E2E Global Setup — Taller Mecánico
 *
 * Runs ONCE before the entire test suite.
 * Provisions the E2E test user in the target environment so all
 * auth-dependent tests can sign in reliably.
 *
 * Flow:
 * 1. Calls POST /api/e2e-setup on the BASE_URL (preview or localhost)
 * 2. The endpoint uses Supabase admin API to create the user with email pre-confirmed
 * 3. Idempotent — safe to call even if user already exists
 * 4. Non-fatal — if it fails (e.g. production block), tests run anyway
 *    (auth tests will fail, which is the correct signal)
 */
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'sofia@test.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'Test1234!';

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';

  console.log(`[E2E Setup] Provisioning test user ${TEST_EMAIL} at ${baseURL}...`);

  try {
    const response = await fetch(`${baseURL}/api/e2e-setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      console.log(`[E2E Setup] ✅ Test user ready`, body);
    } else {
      console.warn(`[E2E Setup] ⚠️ Setup responded ${response.status}:`, body);
    }
  } catch (err) {
    // Non-fatal — tests will still run (auth tests will fail if no user)
    console.warn('[E2E Setup] ⚠️ Could not reach setup endpoint:', String(err));
  }
}
