-- SportsApp — komplettes Datenbankschema (konsolidiert aus Phase 1–8)
--
-- Spiegelt den aktuellen Stand der Datenbank wider. Kann gefahrlos mehrfach
-- bzw. auf einer frischen Supabase-Instanz ausgeführt werden (idempotent).
-- Die globalen Übungen werden separat eingespielt: supabase/seed_exercises.sql
-- (generiert von scripts/generate-exercise-seed.mjs).

-- ---------------------------------------------------------------------------
-- Profiles: Tagesziele + Anzeigename, eine Zeile pro Account
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  daily_calories integer not null default 2000,
  daily_protein_g integer not null default 150,
  daily_carbs_g integer not null default 200,
  daily_fat_g integer not null default 70,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text;

alter table public.profiles enable row level security;

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Bei Registrierung automatisch eine Profilzeile mit Standardzielen anlegen
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Fehlende Profilzeilen für bestehende Accounts nachziehen
insert into public.profiles (id)
select id from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Workout sessions: ein Eintrag pro absolviertem Training (auch Läufe als 'Lauf')
-- ---------------------------------------------------------------------------
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  name text not null default 'Training',
  completed boolean not null default true,
  duration_minutes numeric
);

alter table public.workout_sessions add column if not exists duration_minutes numeric;

alter table public.workout_sessions enable row level security;

drop policy if exists "Users manage their own workout sessions" on public.workout_sessions;
create policy "Users manage their own workout sessions"
  on public.workout_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions (user_id, date);

-- ---------------------------------------------------------------------------
-- Exercises: Übungsbibliothek.
-- user_id null  = globale Standard-Übung, sichtbar für alle Accounts
-- user_id = uid = selbst erstellte Übung
-- ---------------------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  category text not null check (
    category in ('Rücken', 'Brust', 'Beine', 'Schultern', 'Arme', 'Bauch', 'Cardio', 'Sonstiges')
  ),
  video_url text,
  target text,
  created_at timestamptz not null default now()
);

alter table public.exercises alter column user_id drop not null;
alter table public.exercises add column if not exists video_url text;
alter table public.exercises add column if not exists target text;

alter table public.exercises enable row level security;

drop policy if exists "Users manage their own exercises" on public.exercises;
drop policy if exists "Read global and own exercises" on public.exercises;
drop policy if exists "Insert own exercises" on public.exercises;
drop policy if exists "Update own exercises" on public.exercises;
drop policy if exists "Delete own exercises" on public.exercises;
create policy "Read global and own exercises" on public.exercises
  for select using (user_id is null or auth.uid() = user_id);
create policy "Insert own exercises" on public.exercises
  for insert with check (auth.uid() = user_id);
create policy "Update own exercises" on public.exercises
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own exercises" on public.exercises
  for delete using (auth.uid() = user_id);

-- Eindeutiger Name für globale Übungen (macht das Seeding wiederholbar)
create unique index if not exists exercises_global_name_idx
  on public.exercises (name) where user_id is null;

-- ---------------------------------------------------------------------------
-- Session exercises: Übungen innerhalb eines Trainings, mit einzelnen Sätzen
-- ---------------------------------------------------------------------------
create table if not exists public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  sets integer not null default 0,
  reps integer not null default 0,
  weight_kg numeric not null default 0,
  order_index integer not null default 0,
  set_entries jsonb not null default '[]'::jsonb
);

alter table public.session_exercises
  add column if not exists set_entries jsonb not null default '[]'::jsonb;

alter table public.session_exercises enable row level security;

drop policy if exists "Users manage exercises of their own sessions" on public.session_exercises;
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

-- ---------------------------------------------------------------------------
-- Plan groups: bündeln mehrere Einheiten zu einem Split (z.B. Push/Pull/Beine)
-- ---------------------------------------------------------------------------
create table if not exists public.plan_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.plan_groups enable row level security;

drop policy if exists "Users manage their own plan groups" on public.plan_groups;
create policy "Users manage their own plan groups"
  on public.plan_groups
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Training plans: wiederverwendbare Einheiten ("Training erstellen")
-- ---------------------------------------------------------------------------
create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  group_id uuid references public.plan_groups (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.training_plans
  add column if not exists group_id uuid references public.plan_groups (id) on delete set null;

alter table public.training_plans enable row level security;

drop policy if exists "Users manage their own training plans" on public.training_plans;
create policy "Users manage their own training plans"
  on public.training_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.training_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.training_plans (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  sets integer not null default 0,
  reps integer not null default 0,
  weight_kg numeric not null default 0,
  order_index integer not null default 0,
  set_entries jsonb not null default '[]'::jsonb
);

alter table public.training_plan_exercises
  add column if not exists set_entries jsonb not null default '[]'::jsonb;

alter table public.training_plan_exercises enable row level security;

drop policy if exists "Users manage exercises of their own plans" on public.training_plan_exercises;
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

-- ---------------------------------------------------------------------------
-- Runs: Läufe mit Distanz und Dauer.
-- strava_id gesetzt = automatisch von Strava importiert (Duplikat-Schutz).
-- ---------------------------------------------------------------------------
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  distance_km numeric not null default 0,
  duration_minutes numeric not null default 0,
  strava_id bigint,
  created_at timestamptz not null default now()
);

alter table public.runs add column if not exists strava_id bigint;

-- Beim Sync befüllte Zusatzdaten aus der Aktivitäts-Übersicht (Höhenmeter, Puls,
-- Trittfrequenz, Startzeit, …). Kein zusätzlicher Strava-Request nötig.
alter table public.runs add column if not exists strava_stats jsonb;

-- Erst beim Aufklappen eines Laufs geladen: Splits, Bestzeiten, Kalorien und
-- Verlaufsdaten (Streams). Gecacht, damit ein erneutes Öffnen keinen API-Call kostet.
alter table public.runs add column if not exists strava_detail jsonb;

create unique index if not exists runs_strava_id_idx on public.runs (strava_id);

alter table public.runs enable row level security;

drop policy if exists "Users manage their own runs" on public.runs;
create policy "Users manage their own runs"
  on public.runs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists runs_user_date_idx
  on public.runs (user_id, date);

-- ---------------------------------------------------------------------------
-- Daily macros: ein Eintrag pro Tag (kcal werden in der App aus 4/4/9 berechnet)
-- ---------------------------------------------------------------------------
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

drop policy if exists "Users manage their own daily macros" on public.daily_macros;
create policy "Users manage their own daily macros"
  on public.daily_macros
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Weights: ein Gewichts-Eintrag pro Tag
-- ---------------------------------------------------------------------------
create table if not exists public.weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.weights enable row level security;

drop policy if exists "Users manage their own weights" on public.weights;
create policy "Users manage their own weights"
  on public.weights
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists weights_user_date_idx
  on public.weights (user_id, date);

-- ---------------------------------------------------------------------------
-- Strava: OAuth-Tokens pro Account (werden nur von den Edge Functions benutzt)
-- ---------------------------------------------------------------------------
create table if not exists public.strava_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  athlete_id bigint,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null default 0,
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.strava_accounts enable row level security;

drop policy if exists "Users manage their own strava account" on public.strava_accounts;
create policy "Users manage their own strava account"
  on public.strava_accounts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Hinweis: Die Tabelle food_logs aus Phase 1 wird von der App nicht mehr
-- benutzt. Falls sie in deiner Datenbank noch existiert und du die Daten
-- nicht brauchst, kannst du sie manuell entfernen:
--   drop table if exists public.food_logs;
-- ---------------------------------------------------------------------------
