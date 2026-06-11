-- SportsApp Phase 7 schema additions
-- Run this in the Supabase SQL editor of your project (after schema.sql, schema_phase2.sql, schema_phase3.sql, schema_phase4.sql, schema_phase5.sql and schema_phase6.sql).

-- Session/plan exercises: store each individual set (reps + weight) instead of just a count.
alter table public.session_exercises
  add column if not exists set_entries jsonb not null default '[]'::jsonb;

alter table public.training_plan_exercises
  add column if not exists set_entries jsonb not null default '[]'::jsonb;
