-- SportsApp Phase 2 schema additions
-- Run this in the Supabase SQL editor of your project (after schema.sql).

-- Exercises: reusable exercise library per user
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null check (
    category in ('Rücken', 'Brust', 'Beine', 'Schultern', 'Arme', 'Bauch', 'Cardio', 'Sonstiges')
  ),
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "Users manage their own exercises"
  on public.exercises
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Session exercises: exercises performed within a workout session, with sets/reps/weight
create table if not exists public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  sets integer not null default 0,
  reps integer not null default 0,
  weight_kg numeric not null default 0,
  order_index integer not null default 0
);

alter table public.session_exercises enable row level security;

create policy "Users manage exercises of their own sessions"
  on public.session_exercises
  for all
  using (
    exists (
      select 1 from public.workout_sessions
      where workout_sessions.id = session_exercises.session_id
      and workout_sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions
      where workout_sessions.id = session_exercises.session_id
      and workout_sessions.user_id = auth.uid()
    )
  );

create index if not exists session_exercises_session_idx
  on public.session_exercises (session_id);

-- Runs: jogging sessions with distance and duration
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  distance_km numeric not null default 0,
  duration_minutes numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.runs enable row level security;

create policy "Users manage their own runs"
  on public.runs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists runs_user_date_idx
  on public.runs (user_id, date);
