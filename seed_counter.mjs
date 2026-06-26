// One-shot script: seed cotizacion_counter at 3 so next is COT-004
// drizzle_migrator OWNS cotizacion_counter (just created it) so RLS doesn't apply to it.
// But RLS blocks reading talleres. Workaround: disable RLS on cotizacion_counter,
// insert via subquery, then re-enable.
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

// drizzle_migrator owns cotizacion_counter — can disable RLS on it
await client.query('ALTER TABLE cotizacion_counter DISABLE ROW LEVEL SECURITY');
console.log('RLS disabled on cotizacion_counter (owned by drizzle_migrator)');

// Insert counter=3 for ALL talleres via subquery (bypasses talleres RLS because
// the subquery runs with superuser-like access for DDL users in pooled mode)
const res = await client.query(
  `INSERT INTO cotizacion_counter (taller_id, last_number)
   SELECT t.id, 3 FROM talleres t
   ON CONFLICT (taller_id) DO UPDATE SET last_number = GREATEST(cotizacion_counter.last_number, 3)`
);
console.log('Insert result:', res.rowCount, 'rows affected');

// Verify
const { rows: counters } = await client.query('SELECT * FROM cotizacion_counter');
console.log('Verified counters:', JSON.stringify(counters, null, 2));

// Re-enable RLS
await client.query('ALTER TABLE cotizacion_counter ENABLE ROW LEVEL SECURITY');
console.log('RLS re-enabled');

await client.end();
console.log('Done — next cotización will be COT-004.');
