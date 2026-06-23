# Database Schema & Migrations

This project uses **Drizzle ORM** for type-safe database schema management and migrations with Supabase Postgres.

## Workflow

1. **Edit the schema** in `src/db/schema.ts`
2. **Generate a migration**: `npm run db:generate`
3. **Review the generated SQL** in `drizzle/`
4. **Push to Supabase** (dev): `npm run db:push`
5. **Run migrations** (production): `npm run db:migrate`

## Commands

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate migration SQL from schema changes |
| `npm run db:push` | Push schema directly to database (dev) |
| `npm run db:migrate` | Run pending migrations (production) |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |

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
