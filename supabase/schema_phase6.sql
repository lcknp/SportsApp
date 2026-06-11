-- SportsApp Phase 6 schema additions
-- Run this in the Supabase SQL editor of your project (after schema.sql, schema_phase2.sql, schema_phase3.sql, schema_phase4.sql and schema_phase5.sql).

-- Workout sessions: store how long a tracked training took.
alter table public.workout_sessions
  add column if not exists duration_minutes numeric;
