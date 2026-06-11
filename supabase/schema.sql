-- SportsApp Phase 1 schema
-- Run this in the Supabase SQL editor of your project.

-- Profiles: per-user daily nutrition goals
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  daily_calories integer not null default 2000,
  daily_protein_g integer not null default 150,
  daily_carbs_g integer not null default 200,
  daily_fat_g integer not null default 70,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users manage their own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Automatically create a profile row with default goals on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Food logs: manually entered meals
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_at timestamptz not null default now(),
  name text not null,
  calories integer not null default 0,
  protein_g integer not null default 0,
  carbs_g integer not null default 0,
  fat_g integer not null default 0,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack'))
);

alter table public.food_logs enable row level security;

create policy "Users manage their own food logs"
  on public.food_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists food_logs_user_logged_at_idx
  on public.food_logs (user_id, logged_at);

-- Workout sessions: minimal record used for the dashboard training calendar.
-- Full workout plan management arrives in a later phase.
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  name text not null default 'Training',
  completed boolean not null default true
);

alter table public.workout_sessions enable row level security;

create policy "Users manage their own workout sessions"
  on public.workout_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions (user_id, date);
