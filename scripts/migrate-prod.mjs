/**
 * Production-only database migration script.
 *
 * Runs Drizzle migrations ONLY on Vercel production deploys.
 * Preview deploys and local dev skip migrations automatically.
 *
 * Called from the build command: node scripts/migrate-prod.mjs && next build
 */

import { execSync } from 'child_process';

const env = process.env.VERCEL_ENV;

if (env === 'production') {
  console.log('🔄 Production deploy detected — running database migrations...');
  execSync('npx tsx src/db/migrate.ts', { stdio: 'inherit' });
  console.log('✅ Database migrations complete');
} else {
  console.log(`⏭️  Skipping database migrations (VERCEL_ENV: ${env ?? 'not set'})`);
}
