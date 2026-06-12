// Generiert supabase/seed_exercises.sql aus den Seed-JSONs in supabase/seed/.
// Voraussetzung: supabase/schema.sql wurde bereits ausgeführt.
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
lines.push('-- SportsApp — globale Übungen (Seed)');
lines.push('-- Generiert von scripts/generate-exercise-seed.mjs — nicht von Hand editieren.');
lines.push('-- Voraussetzung: schema.sql wurde ausgeführt. Mehrfach ausführbar,');
lines.push('-- überschreibt nur globale Übungen, nie selbst erstellte.');
lines.push('');
lines.push(`-- ${byName.size} globale Übungen einspielen`);

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

writeFileSync(join(root, 'supabase/seed_exercises.sql'), lines.join('\n'), 'utf8');
console.log(`seed_exercises.sql geschrieben: ${byName.size} Übungen.`);
