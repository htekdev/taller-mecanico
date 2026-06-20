/**
 * scripts/run-schema.mjs
 * One-time schema runner — connects directly to Supabase Postgres
 * and executes supabase/schema.sql
 *
 * Usage:
 *   node scripts/run-schema.mjs
 *
 * Reads POSTGRES_URL_NON_POOLING from .env.production.local
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Load env ────────────────────────────────────────────────────────────────

function parseEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = {
  ...parseEnv(resolve(ROOT, '.env.local')),
  ...parseEnv(resolve(ROOT, '.env.production.local')),
  ...process.env,
};

const pgUrl = env.POSTGRES_URL_NON_POOLING;
if (!pgUrl) {
  console.error('POSTGRES_URL_NON_POOLING not found in env files');
  process.exit(1);
}

// ── Load schema ─────────────────────────────────────────────────────────────

const schemaFile = resolve(ROOT, 'supabase', 'schema.sql');
if (!existsSync(schemaFile)) {
  console.error('supabase/schema.sql not found');
  process.exit(1);
}
const schema = readFileSync(schemaFile, 'utf-8');

// Split into individual statements on semicolons
const statements = schema
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

// ── Connect and run ─────────────────────────────────────────────────────────

const client = new Client({
  connectionString: pgUrl,
  ssl: { rejectUnauthorized: false },
});

console.log('Connecting to Supabase Postgres...');
await client.connect();
console.log('Connected\n');

let ok = 0;
let skip = 0;
let fail = 0;

for (const stmt of statements) {
  const preview = stmt.slice(0, 80).replace(/\n/g, ' ');
  try {
    await client.query(stmt);
    ok++;
    console.log(`OK: ${preview}`);
  } catch (err) {
    if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
      skip++;
      console.log(`SKIP (exists): ${preview}`);
    } else {
      fail++;
      console.error(`FAIL: ${preview}`);
      console.error(`  -> ${err.message}`);
    }
  }
}

await client.end();
console.log(`\nDone: ${ok} executed, ${skip} skipped, ${fail} failed`);
if (fail > 0) process.exit(1);
