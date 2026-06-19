-- SportsApp — Backfill der RepCount-Trainings + Pläne
-- ---------------------------------------------------------------------------
-- Quelle: RepCount-Screenshots (Tagebuch Mai–Juni 2026 + die 4 aktuellen Pläne).
-- Einmalig im Supabase SQL-Editor ausführen (Voraussetzung: schema.sql und
-- seed_exercises.sql wurden bereits eingespielt).
--
-- Verhalten:
--   * Übungen werden per Namen mit der bestehenden Bibliothek VERKNÜPFT
--     (globale oder eigene) — sonst als eigene Übung neu angelegt.
--   * Pläne und Trainings werden nur angelegt, wenn sie noch nicht existieren
--     (Plan per Name, Training per Datum). Mehrfaches Ausführen dupliziert nichts.
--   * Gewicht/Wiederholungen sind nicht in den Screenshots enthalten und werden
--     auf 0 gesetzt — die Satz-ANZAHL stammt aus den Screenshots. In der App
--     anpassbar.
-- ---------------------------------------------------------------------------

-- Übung holen-oder-anlegen: bevorzugt eine vorhandene (eigene vor globaler),
-- sonst neue eigene Übung mit gegebener Kategorie.
create or replace function pg_temp.ex(p_name text, p_category text, p_uid uuid)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id
    from public.exercises
   where lower(name) = lower(p_name)
     and (user_id is null or user_id = p_uid)
   order by case when user_id = p_uid then 0 else 1 end
   limit 1;
  if v_id is null then
    insert into public.exercises (user_id, name, category)
    values (p_uid, p_name, p_category)
    returning id into v_id;
  end if;
  return v_id;
end $$;

-- N leere Sätze als set_entries-JSON (reps/weight 0), damit beim Bearbeiten
-- bereits N Satz-Zeilen zum Ausfüllen bereitstehen.
create or replace function pg_temp.zero_sets(n int)
returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object('reps', 0, 'weight_kg', 0)), '[]'::jsonb)
    from generate_series(1, greatest(n, 0));
$$;

-- Plan anlegen (falls noch nicht vorhanden) inkl. Übungen + Satz-Anzahl.
create or replace function pg_temp.make_plan(p_uid uuid, p_name text, p_ex uuid[], p_sets int[])
returns void language plpgsql as $$
declare v_pid uuid; i int;
begin
  if exists (select 1 from public.training_plans where user_id = p_uid and name = p_name) then
    return;
  end if;
  insert into public.training_plans (user_id, name)
  values (p_uid, p_name) returning id into v_pid;
  for i in 1 .. array_length(p_ex, 1) loop
    insert into public.training_plan_exercises
      (plan_id, exercise_id, sets, reps, weight_kg, order_index, set_entries)
    values
      (v_pid, p_ex[i], p_sets[i], 0, 0, i - 1, pg_temp.zero_sets(p_sets[i]));
  end loop;
end $$;

-- Training (Session) anlegen, falls an dem Tag noch kein gleichnamiges Training
-- existiert. Wichtig: nur auf NAME prüfen, nicht nur aufs Datum — sonst würde
-- ein Strava-Lauf ("Lauf") am selben Tag das Krafttraining blockieren.
create or replace function pg_temp.make_session(
  p_uid uuid, p_date date, p_name text, p_dur numeric, p_ex uuid[], p_sets int[])
returns void language plpgsql as $$
declare v_sid uuid; i int;
begin
  if exists (
    select 1 from public.workout_sessions
     where user_id = p_uid and date = p_date and name = p_name
  ) then
    return;
  end if;
  insert into public.workout_sessions (user_id, date, name, completed, duration_minutes)
  values (p_uid, p_date, p_name, true, p_dur) returning id into v_sid;
  for i in 1 .. array_length(p_ex, 1) loop
    insert into public.session_exercises
      (session_id, exercise_id, sets, reps, weight_kg, order_index, set_entries)
    values
      (v_sid, p_ex[i], p_sets[i], 0, 0, i - 1, pg_temp.zero_sets(p_sets[i]));
  end loop;
end $$;

do $$
declare
  v_uid uuid;
  ok_ex uuid[];   ok_sets   int[] := array[4,2,2,2,2,2,2,3];
  legs_ex uuid[]; legs_sets int[] := array[3,3,2,2,2,2,2,2];
  push_ex uuid[]; push_sets int[] := array[3,2,3,2,2,3,3];
  pull_ex uuid[]; pull_sets int[] := array[2,2,2,2,3,3,2];
begin
  select id into v_uid from auth.users where email = 'knapp.luca@gmx.de';
  if v_uid is null then
    raise exception 'Kein Benutzer mit E-Mail knapp.luca@gmx.de gefunden — bitte zuerst registrieren/anmelden.';
  end if;

  -- ---- Übungen auflösen (verknüpfen oder neu anlegen) --------------------
  -- OK (Oberkörper)
  ok_ex := array[
    pg_temp.ex('DB Side Raise',              'Schultern', v_uid), -- exakt
    pg_temp.ex('Gym80 Highrow Lat',          'Rücken',    v_uid), -- = "Gym80 High Row"
    pg_temp.ex('Teres Pulldown',             'Rücken',    v_uid), -- exakt
    pg_temp.ex('Low Incline DB Press',       'Brust',     v_uid), -- = "DB Low Incline Press"
    pg_temp.ex('Close Grip Latrow',          'Rücken',    v_uid), -- exakt
    pg_temp.ex('DIP',                        'Brust',     v_uid), -- = "Dip"
    pg_temp.ex('Chest Supported TBar Row',   'Rücken',    v_uid), -- exakt
    pg_temp.ex('Reverse Pecdeck',            'Schultern', v_uid)  -- exakt
  ];

  -- Legs
  legs_ex := array[
    pg_temp.ex('DB Preachercurl',                            'Arme',  v_uid), -- exakt
    pg_temp.ex('Seated Dumbbell Tricep Overhead Extension',  'Arme',  v_uid), -- = "Seated Tricep Overhead Extension"
    pg_temp.ex('Seated Legcurl',                             'Beine', v_uid), -- exakt
    pg_temp.ex('Barbell Squat',                              'Beine', v_uid), -- exakt
    pg_temp.ex('Quad Dominant 45 Degree Legpress',           'Beine', v_uid), -- = "Legpress Quaddominant"
    pg_temp.ex('Leg Extension',                              'Beine', v_uid), -- exakt
    pg_temp.ex('Adductor Machine',                           'Beine', v_uid), -- exakt
    pg_temp.ex('Standing Calveraise',                        'Beine', v_uid)  -- = "Standing Calverais"
  ];

  -- Push
  push_ex := array[
    pg_temp.ex('Gym80 Sidedelt (bilateral)',               'Schultern', v_uid), -- NEU (kein Match)
    pg_temp.ex('Incline Smith Press',                      'Brust',     v_uid), -- exakt
    pg_temp.ex('Gym Leco Seated Chestpress',               'Brust',     v_uid), -- = "GymLeco Seated Chestpress"
    pg_temp.ex('Seated Cable Fly',                         'Brust',     v_uid), -- NEU (mehrere ähnliche – zur Sicherheit neu)
    pg_temp.ex('Behinde Body Cable Side Raises (Cuffed)',  'Schultern', v_uid), -- = "Behinde Body Cable Side Raises"
    pg_temp.ex('Standing Pushdown',                        'Arme',      v_uid), -- = "Standing Trizep Pushdown"
    pg_temp.ex('Bilateral Dumbbell Overhead Extension',    'Arme',      v_uid)  -- = "Overhead Extension (bilateral)"
  ];

  -- Pull-FB
  pull_ex := array[
    pg_temp.ex('Neutral Grip Pulldown',     'Rücken',    v_uid), -- = "Neutral Grip Latpulldown"
    pg_temp.ex('Unilateral Cable Latrow',   'Rücken',    v_uid), -- = "Seated Unilateral Latrow" (prüfen)
    pg_temp.ex('RDL',                       'Beine',     v_uid), -- NEU (BB/DB unklar)
    pg_temp.ex('Upper Back Cable Row',      'Rücken',    v_uid), -- = "Upper Back Row" (prüfen)
    pg_temp.ex('Rear Delt Fly',             'Schultern', v_uid), -- NEU (viele Varianten)
    pg_temp.ex('Cable Bizeps Curl',         'Arme',      v_uid), -- NEU (mehrere ähnliche)
    pg_temp.ex('Lying Hammer Curl (Cable)', 'Arme',      v_uid)  -- = "Lying Cable Hammercurl"
  ];

  -- ---- Pläne anlegen ------------------------------------------------------
  perform pg_temp.make_plan(v_uid, 'OK',      ok_ex,   ok_sets);
  perform pg_temp.make_plan(v_uid, 'Legs',    legs_ex, legs_sets);
  perform pg_temp.make_plan(v_uid, 'Push',    push_ex, push_sets);
  perform pg_temp.make_plan(v_uid, 'Pull-FB', pull_ex, pull_sets);

  -- ---- Trainings (Tagebuch) nachtragen -----------------------------------
  -- Juni 2026 (11 Trainings)
  perform pg_temp.make_session(v_uid, '2026-06-18', 'Legs',    110, legs_ex, legs_sets);
  perform pg_temp.make_session(v_uid, '2026-06-16', 'Push',     73, push_ex, push_sets);
  perform pg_temp.make_session(v_uid, '2026-06-15', 'Pull-FB', 101, pull_ex, pull_sets);
  perform pg_temp.make_session(v_uid, '2026-06-12', 'OK',      111, ok_ex,   ok_sets);
  perform pg_temp.make_session(v_uid, '2026-06-11', 'Legs',    145, legs_ex, legs_sets);
  perform pg_temp.make_session(v_uid, '2026-06-09', 'Push',     91, push_ex, push_sets);
  perform pg_temp.make_session(v_uid, '2026-06-08', 'Pull-FB',  98, pull_ex, pull_sets);
  perform pg_temp.make_session(v_uid, '2026-06-05', 'OK',      108, ok_ex,   ok_sets);
  perform pg_temp.make_session(v_uid, '2026-06-04', 'Legs',    142, legs_ex, legs_sets);
  perform pg_temp.make_session(v_uid, '2026-06-02', 'Push',     90, push_ex, push_sets);
  perform pg_temp.make_session(v_uid, '2026-06-01', 'Pull-FB', 111, pull_ex, pull_sets);

  -- Mai 2026 (3 Trainings)
  perform pg_temp.make_session(v_uid, '2026-05-30', 'OK',      110, ok_ex,   ok_sets);
  perform pg_temp.make_session(v_uid, '2026-05-28', 'Legs',    120, legs_ex, legs_sets);
  perform pg_temp.make_session(v_uid, '2026-05-27', 'Push',     71, push_ex, push_sets);

  raise notice 'RepCount-Backfill fertig für %', v_uid;
end $$;
