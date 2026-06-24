# Database Schema & Migrations

This project uses **Supabase** for database management and migrations.

## Workflow

1. **Create a migration file** in `supabase/migrations/` using sequential naming:
   - e.g. `004_my_new_feature.sql`
2. **Write the SQL** with `IF NOT EXISTS` / `DROP IF EXISTS` for safety
3. **Supabase Branching** auto-applies new migration files to the PR preview branch
4. **On merge to main**, Supabase applies the migration to the production database automatically

## Migration file naming convention

Use sequential 3-digit prefixes to avoid version conflicts:
```
supabase/migrations/
  000_initial_schema.sql
  001_fix_invite_rls.sql
  002_member_email_role_update.sql
  003_email_clientes_iva_ordenes.sql
  004_...
```

⚠️ **Never use date-based prefixes** (e.g. `20260624_...`) — they can conflict if two migrations share the same date.

## Schema reference

The canonical schema definition is in `supabase/schema.sql`. It reflects the full current state of the database.

## Why Drizzle was removed

Drizzle ORM was previously used for schema management (`src/db/`, `drizzle.config.ts`, `drizzle/` migrations). It was removed because:

1. The app uses the Supabase client (`app/lib/db.ts`) for all data access — Drizzle was only used for migrations
2. Drizzle's migration runner requires DDL-level database permissions that the `DATABASE_URL` connection string doesn't have in Supabase
3. Supabase Branching already handles migrations correctly — having two systems caused production deployment failures

The `supabase/migrations/` approach is the correct and only migration system for this project.


## Environment

Set `DATABASE_URL` in `.env.local` (already configured in Vercel):

```
DATABASE_URL=postgresql://user:[password]@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

## Important Notes

- **Never edit migration files** after they've been applied to production
- **Always commit migration files** — they are the deploy history
- `src/db/schema.ts` is the single source of truth for table definitions
- RLS policies remain in `supabase/schema.sql` (Supabase-specific, not managed by Drizzle)
