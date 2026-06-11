-- SportsApp Phase 3 schema additions
-- Run this in the Supabase SQL editor of your project (after schema.sql and schema_phase2.sql).

-- Fix for accounts where the profile row is missing (e.g. after deleting and
-- recreating the auth user before this trigger existed). Safe to re-run.
insert into public.profiles (id)
select id from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;

-- Daily macros: one row per user per day with manually entered totals.
-- Calories are derived in the app from protein/carbs/fat (4/4/9 kcal per g).
create table if not exists public.daily_macros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.daily_macros enable row level security;

create policy "Users manage their own daily macros"
  on public.daily_macros
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Weights: one row per user per day with the body weight.
create table if not exists public.weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.weights enable row level security;

create policy "Users manage their own weights"
  on public.weights
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists weights_user_date_idx
  on public.weights (user_id, date);

-- The food_logs table from Phase 1 is no longer used by the app and can be
-- dropped if you don't need the data anymore:
-- drop table if exists public.food_logs;
