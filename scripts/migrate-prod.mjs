/**
 * Production-only database migration script.
 *
 * Runs Drizzle migrations ONLY on Vercel production deploys.
 * Preview deploys and local dev skip migrations automatically.
 *
 * NOTE: Schema DDL changes (ALTER TABLE, etc.) are handled by Supabase
 * branching via supabase/migrations/*.sql files. The Drizzle migration
 * here handles any additional data migrations. If it fails due to
 * permissions or "already exists" errors, we log a warning and continue —
 * the build should never abort because Supabase branching already applied
 * the DDL changes to the production database.
 *
 * Called from the build command: node scripts/migrate-prod.mjs && next build
 */

import { execSync } from 'child_process';

const env = process.env.VERCEL_ENV;

if (env === 'production') {
  console.log('🔄 Production deploy detected — running database migrations...');
  try {
    execSync('npx tsx src/db/migrate.ts', { stdio: 'inherit' });
    console.log('✅ Database migrations complete');
  } catch (err) {
    // Migration may fail if:
    // 1. The DB user lacks DDL permissions (Supabase anon/service_role can't ALTER TABLE)
    // 2. Columns were already added by Supabase branching migrations
    // In both cases the schema is already correct — do NOT abort the build.
    console.warn('⚠️  Drizzle migration skipped:', err.message?.split('\n')[0] ?? String(err));
    console.warn('   Schema DDL is managed by supabase/migrations/*.sql via Supabase branching.');
    console.warn('   Continuing build...');
  }
} else {
  console.log(`⏭️  Skipping database migrations (VERCEL_ENV: ${env ?? 'not set'})`);
}
