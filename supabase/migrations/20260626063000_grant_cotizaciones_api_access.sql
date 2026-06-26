-- Grant Data API (PostgREST) access to cotizaciones tables.
--
-- These tables were created by drizzle_migrator (not postgres), so Supabase's
-- default privileges did not apply. Without these grants, supabase.from('cotizaciones')
-- returns 404/401 — the Data API can't see the tables at all.
--
-- This grant was applied to production live on 2026-06-26. This migration file
-- persists the fix so it applies automatically on new environments / branches.

GRANT ALL ON public.cotizaciones TO anon, authenticated, service_role;
GRANT ALL ON public.cotizacion_counter TO anon, authenticated, service_role;
