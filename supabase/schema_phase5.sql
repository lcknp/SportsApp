-- SportsApp Phase 5 schema additions
-- Run this in the Supabase SQL editor of your project (after schema.sql, schema_phase2.sql, schema_phase3.sql and schema_phase4.sql).

-- Profiles: store the user's display name.
alter table public.profiles
  add column if not exists full_name text;
