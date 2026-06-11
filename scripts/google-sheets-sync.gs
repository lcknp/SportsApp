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
 *
 * Zusätzlich befüllt syncAll das persönliche Tracker-Blatt (Spalten siehe
 * TRACKER-Konfiguration unten): Es sucht die Zeile mit dem passenden Datum
 * in Spalte B und trägt Gewicht, Makros, Training und Läufe ein.
 * Es werden NUR LEERE ZELLEN befüllt — von Hand eingetragene Werte und
 * Formeln (z.B. CALORIES) werden nie überschrieben.
 */

// Konfiguration für das eigene Tracker-Blatt:
const TRACKER = {
  sheetName: null, // null = erstes Blatt der Tabelle; sonst z.B. 'Tabelle1'
  dateColumn: 2, // B  = DATE (Format TT.MM.JJJJ)
  weightColumn: 3, // C  = WEIGHT
  proteinColumn: 6, // F  = PROTEIN
  carbsColumn: 7, // G  = CARBS
  fatsColumn: 8, // H  = FATS
  sessionColumn: 16, // P  = SESSION
  notesColumn: 18, // R  = NOTES (Läufe werden hier eingetragen)
};

function syncAll() {
  const token = getToken_();

  syncTrainings_(token);
  syncRuns_(token);
  syncWeights_(token);
  syncMacros_(token);
  syncTracker_(token);
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

/**
 * Befüllt das persönliche Tracker-Blatt: sucht pro Datum die Zeile
 * (Datum in Spalte B als TT.MM.JJJJ) und trägt App-Daten in die
 * konfigurierten Spalten ein. Nur leere Zellen werden beschrieben.
 */
function syncTracker_(token) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = TRACKER.sheetName
    ? spreadsheet.getSheetByName(TRACKER.sheetName)
    : spreadsheet.getSheets()[0];
  if (!sheet) throw new Error('Tracker-Blatt "' + TRACKER.sheetName + '" nicht gefunden.');

  // Datums-Zeilen einlesen: "TT.MM.JJJJ" -> Zeilennummer
  const lastRow = sheet.getLastRow();
  const dateValues = sheet.getRange(1, TRACKER.dateColumn, lastRow, 1).getDisplayValues();
  const rowByDate = {};
  for (let i = 0; i < dateValues.length; i++) {
    const text = String(dateValues[i][0]).trim();
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(text)) {
      const parts = text.split('.');
      rowByDate[pad2_(parts[0]) + '.' + pad2_(parts[1]) + '.' + parts[2]] = i + 1;
    }
  }

  let written = 0;
  const missingDates = [];

  function writeIfEmpty(isoDate, column, value) {
    if (value === null || value === undefined || value === '' || value === 0) return;
    const key = isoToGerman_(isoDate);
    const row = rowByDate[key];
    if (!row) {
      if (missingDates.indexOf(key) === -1) missingDates.push(key);
      return;
    }
    const cell = sheet.getRange(row, column);
    const existing = cell.getValue();
    if (existing === '' || existing === null) {
      cell.setValue(value);
      written++;
    }
  }

  fetchRows_(token, 'weights?select=date,weight_kg&order=date.asc').forEach(function (weight) {
    writeIfEmpty(weight.date, TRACKER.weightColumn, weight.weight_kg);
  });

  fetchRows_(token, 'daily_macros?select=date,protein_g,carbs_g,fat_g&order=date.asc').forEach(function (entry) {
    writeIfEmpty(entry.date, TRACKER.proteinColumn, entry.protein_g);
    writeIfEmpty(entry.date, TRACKER.carbsColumn, entry.carbs_g);
    writeIfEmpty(entry.date, TRACKER.fatsColumn, entry.fat_g);
  });

  // Trainingsname(n) des Tages in die SESSION-Spalte
  const sessionsByDate = {};
  fetchRows_(token, 'workout_sessions?select=date,name&name=neq.Lauf&order=date.asc').forEach(function (session) {
    sessionsByDate[session.date] = sessionsByDate[session.date]
      ? sessionsByDate[session.date] + ' + ' + session.name
      : session.name;
  });
  Object.keys(sessionsByDate).forEach(function (isoDate) {
    writeIfEmpty(isoDate, TRACKER.sessionColumn, sessionsByDate[isoDate]);
  });

  // Läufe als Notiz
  fetchRows_(token, 'runs?select=date,distance_km,duration_minutes&order=date.asc').forEach(function (run) {
    writeIfEmpty(
      run.date,
      TRACKER.notesColumn,
      'Lauf: ' + run.distance_km + ' km in ' + run.duration_minutes + ' min',
    );
  });

  Logger.log(
    'Tracker-Blatt "' + sheet.getName() + '": ' + written + ' Zellen befüllt.' +
      (missingDates.length ? ' Keine Zeile gefunden für: ' + missingDates.join(', ') : ''),
  );
}

function pad2_(value) {
  return String(value).length === 1 ? '0' + value : String(value);
}

function isoToGerman_(iso) {
  const parts = iso.split('-');
  return parts[2] + '.' + parts[1] + '.' + parts[0];
}

// ---------------------------------------------------------------------------

function getProp_(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value || !value.trim()) {
    throw new Error('Skript-Eigenschaft "' + name + '" fehlt oder ist leer. ' +
      'Projekteinstellungen (Zahnrad) → Skript-Eigenschaften prüfen.');
  }
  return value.trim();
}

/** Testet nur den Login und zeigt die Antwort des Servers. Zum Debuggen ausführen. */
function testLogin() {
  const token = getToken_();
  Logger.log('Login erfolgreich! Token beginnt mit: ' + token.slice(0, 12) + '…');
}

function getToken_() {
  const email = getProp_('SUPABASE_EMAIL');
  const response = UrlFetchApp.fetch(getProp_('SUPABASE_URL') + '/auth/v1/token?grant_type=password', {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: getProp_('SUPABASE_ANON_KEY') },
    payload: JSON.stringify({
      email: email,
      password: getProp_('SUPABASE_PASSWORD'),
    }),
    muteHttpExceptions: true,
  });
  const body = JSON.parse(response.getContentText());
  if (!body.access_token) {
    throw new Error(
      'Supabase-Login fehlgeschlagen für "' + email + '" (HTTP ' + response.getResponseCode() + '): ' +
        (body.msg || body.error_description || response.getContentText()) +
        ' — E-Mail/Passwort in den Skript-Eigenschaften prüfen.',
    );
  }
  return body.access_token;
}

function fetchRows_(token, pathAndQuery) {
  const response = UrlFetchApp.fetch(getProp_('SUPABASE_URL') + '/rest/v1/' + pathAndQuery, {
    headers: {
      apikey: getProp_('SUPABASE_ANON_KEY'),
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
