/**
 * SportsApp → Google Sheets Sync
 *
 * Liest alle Daten (Trainings, Läufe, Gewicht, Makros) aus Supabase und
 * schreibt sie in die Blätter "Trainings", "Läufe", "Gewicht", "Makros"
 * der Google-Tabelle, an die dieses Skript gebunden ist. Bestehende
 * andere Blätter werden nicht angefasst.
 *
 * Einrichtung (einmalig):
 * 1. Google-Tabelle öffnen → Erweiterungen → Apps Script
 * 2. Diesen Code einfügen und speichern
 * 3. Links: Projekteinstellungen (Zahnrad) → Skript-Eigenschaften → 4 Einträge anlegen:
 *      SUPABASE_URL       = https://<projekt>.supabase.co
 *      SUPABASE_ANON_KEY  = <anon key>
 *      SUPABASE_EMAIL     = <Login-E-Mail>
 *      SUPABASE_PASSWORD  = <Login-Passwort>
 * 4. Im Editor die Funktion "syncAll" auswählen → Ausführen → Berechtigungen bestätigen
 * 5. Für automatischen täglichen Sync einmal "createDailyTrigger" ausführen
 */

function syncAll() {
  const token = getToken_();

  syncTrainings_(token);
  syncRuns_(token);
  syncWeights_(token);
  syncMacros_(token);
}

/** Täglichen Auto-Sync (ca. 3–4 Uhr nachts) einrichten. Nur einmal ausführen. */
function createDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'syncAll') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('syncAll').timeBased().everyDays(1).atHour(3).create();
}

// ---------------------------------------------------------------------------

function syncTrainings_(token) {
  const sessions = fetchRows_(
    token,
    'workout_sessions?select=date,name,duration_minutes,session_exercises(order_index,sets,reps,weight_kg,set_entries,exercise:exercises(name,category))' +
      '&name=neq.Lauf&order=date.asc',
  );

  const rows = [];
  sessions.forEach(function (session) {
    const exercises = (session.session_exercises || []).sort(function (a, b) {
      return a.order_index - b.order_index;
    });
    exercises.forEach(function (sessionExercise) {
      const exerciseName = sessionExercise.exercise ? sessionExercise.exercise.name : '';
      const category = sessionExercise.exercise ? sessionExercise.exercise.category : '';
      const sets = sessionExercise.set_entries || [];
      if (sets.length > 0) {
        sets.forEach(function (set, index) {
          rows.push([
            session.date,
            session.name,
            session.duration_minutes,
            exerciseName,
            category,
            index + 1,
            set.weight_kg,
            set.reps,
          ]);
        });
      } else {
        // Alte Einträge ohne einzelne Sätze
        rows.push([
          session.date,
          session.name,
          session.duration_minutes,
          exerciseName,
          category,
          '',
          sessionExercise.weight_kg,
          sessionExercise.sets + ' x ' + sessionExercise.reps,
        ]);
      }
    });
    if (exercises.length === 0) {
      rows.push([session.date, session.name, session.duration_minutes, '', '', '', '', '']);
    }
  });

  writeSheet_('Trainings', ['Datum', 'Training', 'Dauer (min)', 'Übung', 'Kategorie', 'Satz', 'kg', 'Wdh.'], rows);
}

function syncRuns_(token) {
  const runs = fetchRows_(token, 'runs?select=date,distance_km,duration_minutes&order=date.asc');
  const rows = runs.map(function (run) {
    const pace =
      run.distance_km > 0 ? Math.round((run.duration_minutes / run.distance_km) * 100) / 100 : '';
    return [run.date, run.distance_km, run.duration_minutes, pace];
  });
  writeSheet_('Läufe', ['Datum', 'Distanz (km)', 'Dauer (min)', 'Pace (min/km)'], rows);
}

function syncWeights_(token) {
  const weights = fetchRows_(token, 'weights?select=date,weight_kg&order=date.asc');
  const rows = weights.map(function (weight) {
    return [weight.date, weight.weight_kg];
  });
  writeSheet_('Gewicht', ['Datum', 'Gewicht (kg)'], rows);
}

function syncMacros_(token) {
  const macros = fetchRows_(token, 'daily_macros?select=date,protein_g,carbs_g,fat_g&order=date.asc');
  const rows = macros.map(function (entry) {
    const kcal = Math.round(entry.protein_g * 4 + entry.carbs_g * 4 + entry.fat_g * 9);
    return [entry.date, entry.protein_g, entry.carbs_g, entry.fat_g, kcal];
  });
  writeSheet_('Makros', ['Datum', 'Protein (g)', 'Kohlenhydrate (g)', 'Fett (g)', 'kcal'], rows);
}

// ---------------------------------------------------------------------------

function getToken_() {
  const props = PropertiesService.getScriptProperties();
  const response = UrlFetchApp.fetch(props.getProperty('SUPABASE_URL') + '/auth/v1/token?grant_type=password', {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: props.getProperty('SUPABASE_ANON_KEY') },
    payload: JSON.stringify({
      email: props.getProperty('SUPABASE_EMAIL'),
      password: props.getProperty('SUPABASE_PASSWORD'),
    }),
  });
  const token = JSON.parse(response.getContentText()).access_token;
  if (!token) throw new Error('Supabase-Login fehlgeschlagen. Skript-Eigenschaften prüfen.');
  return token;
}

function fetchRows_(token, pathAndQuery) {
  const props = PropertiesService.getScriptProperties();
  const response = UrlFetchApp.fetch(props.getProperty('SUPABASE_URL') + '/rest/v1/' + pathAndQuery, {
    headers: {
      apikey: props.getProperty('SUPABASE_ANON_KEY'),
      Authorization: 'Bearer ' + token,
    },
  });
  return JSON.parse(response.getContentText());
}

function writeSheet_(name, header, rows) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
}
