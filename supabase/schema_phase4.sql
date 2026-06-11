-- SportsApp Phase 4 schema additions
-- Run this in the Supabase SQL editor of your project (after schema.sql, schema_phase2.sql and schema_phase3.sql).

-- Training plans: reusable templates (e.g. "Oberkörpertraining") that can be
-- loaded when creating a new training session.
create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.training_plans enable row level security;

create policy "Users manage their own training plans"
  on public.training_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Exercises within a training plan, with default sets/reps/weight.
create table if not exists public.training_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.training_plans (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  sets integer not null default 0,
  reps integer not null default 0,
  weight_kg numeric not null default 0,
  order_index integer not null default 0
);

alter table public.training_plan_exercises enable row level security;

create policy "Users manage exercises of their own plans"
  on public.training_plan_exercises
  for all
  using (
    exists (
      select 1 from public.training_plans
      where training_plans.id = training_plan_exercises.plan_id
      and training_plans.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.training_plans
      where training_plans.id = training_plan_exercises.plan_id
      and training_plans.user_id = auth.uid()
    )
  );

create index if not exists training_plan_exercises_plan_idx
  on public.training_plan_exercises (plan_id);
