// Generiert supabase/schema_phase8.sql aus den Seed-JSONs in supabase/seed/.
// Ausführen mit: node scripts/generate-exercise-seed.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Feine Muskelgruppe (Target) -> grobe App-Kategorie (Filter-Chips)
const CATEGORY_BY_GROUP = {
  PRIMINGS: 'Sonstiges',
  BAUCH: 'Bauch',
  ABS: 'Bauch',
  TRAPS: 'Rücken',
  LAT: 'Rücken',
  BACK: 'Rücken',
  'LOWER BACK': 'Rücken',
  BIZEPS: 'Arme',
  TRIZEPS: 'Arme',
  ARMS: 'Arme',
  CHEST: 'Brust',
  'FRONT DELTS': 'Schultern',
  'SIDE DELTS': 'Schultern',
  'REAR DELTS': 'Schultern',
  'FRONT-DELT': 'Schultern',
  'SIDE-DELT': 'Schultern',
  'REAR-DELT': 'Schultern',
  QUADS: 'Beine',
  HAMS: 'Beine',
  WADEN: 'Beine',
  ADDUCTORS: 'Beine',
  LEGS: 'Beine',
};

const files = ['supabase/seed/exercises.json', 'supabase/seed/exercises_glofft.json'];
const byName = new Map();

for (const file of files) {
  const entries = JSON.parse(readFileSync(join(root, file), 'utf8'));
  for (const entry of entries) {
    const name = entry.name.trim();
    const existing = byName.get(name);
    if (existing) {
      for (const group of entry.muscle_groups) {
        if (!existing.muscle_groups.includes(group)) existing.muscle_groups.push(group);
      }
      if (!existing.video_url && entry.video_url) existing.video_url = entry.video_url;
    } else {
      byName.set(name, { name, video_url: entry.video_url, muscle_groups: [...entry.muscle_groups] });
    }
  }
}

const esc = (text) => text.replace(/'/g, "''");

const lines = [];
lines.push('-- SportsApp Phase 8 schema additions');
lines.push('-- Generiert von scripts/generate-exercise-seed.mjs — nicht von Hand editieren.');
lines.push('-- Im Supabase SQL-Editor ausführen (mehrfach ausführbar, überschreibt nur globale Übungen).');
lines.push('');
lines.push('-- 1) Globale Übungen erlauben (user_id null = für alle Accounts sichtbar)');
lines.push('alter table public.exercises alter column user_id drop not null;');
lines.push('');
lines.push('-- 2) Neue Spalten: Video-Link und Target (feine Muskelgruppe)');
lines.push('alter table public.exercises add column if not exists video_url text;');
lines.push('alter table public.exercises add column if not exists target text;');
lines.push('');
lines.push('-- 3) Zugriffsregeln: globale Übungen lesbar für alle, schreib-/löschbar nur eigene');
lines.push('drop policy if exists "Users manage their own exercises" on public.exercises;');
lines.push('drop policy if exists "Read global and own exercises" on public.exercises;');
lines.push('drop policy if exists "Insert own exercises" on public.exercises;');
lines.push('drop policy if exists "Update own exercises" on public.exercises;');
lines.push('drop policy if exists "Delete own exercises" on public.exercises;');
lines.push('create policy "Read global and own exercises" on public.exercises');
lines.push('  for select using (user_id is null or auth.uid() = user_id);');
lines.push('create policy "Insert own exercises" on public.exercises');
lines.push('  for insert with check (auth.uid() = user_id);');
lines.push('create policy "Update own exercises" on public.exercises');
lines.push('  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);');
lines.push('create policy "Delete own exercises" on public.exercises');
lines.push('  for delete using (auth.uid() = user_id);');
lines.push('');
lines.push('-- 4) Eindeutiger Name für globale Übungen (macht das Seeding wiederholbar)');
lines.push('create unique index if not exists exercises_global_name_idx');
lines.push('  on public.exercises (name) where user_id is null;');
lines.push('');
lines.push(`-- 5) ${byName.size} globale Übungen einspielen`);

for (const exercise of byName.values()) {
  const category = CATEGORY_BY_GROUP[exercise.muscle_groups[0]] ?? 'Sonstiges';
  const target = exercise.muscle_groups.join(', ');
  const video = exercise.video_url ? `'${esc(exercise.video_url)}'` : 'null';
  lines.push(
    `insert into public.exercises (user_id, name, category, video_url, target) values ` +
      `(null, '${esc(exercise.name)}', '${category}', ${video}, '${esc(target)}') ` +
      `on conflict (name) where user_id is null ` +
      `do update set category = excluded.category, video_url = excluded.video_url, target = excluded.target;`,
  );
}
lines.push('');

writeFileSync(join(root, 'supabase/schema_phase8.sql'), lines.join('\n'), 'utf8');
console.log(`schema_phase8.sql geschrieben: ${byName.size} Übungen.`);
