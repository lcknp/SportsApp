// Parser für den CSV-Export aus dem FDDB-Tagebuch (fddb.info).
//
// Format (Semikolon-getrennt, jedes Feld in Anführungszeichen):
//   datum_tag_monat_jahr_stunde_minute; bezeichnung; interne_id; kj;
//   kj_aktivitaeten; fett_g; kh_g; protein_g;
// Beispielzeile:
//   "12.06.2026 23:44";"150 g Banane, frisch";"1";"582";"0";"0,3";"30";"1,5";
//
// Wir brauchen nur Datum + Fett + KH + Protein und summieren pro Tag. Kalorien
// werden in der App ohnehin aus den Makros berechnet (4/4/9), daher ignorieren
// wir die kj-Spalte. Name/ID interessieren nicht — das umgeht auch das
// Encoding-Problem mit Umlauten (Ã¼ etc.).

export type FddbDay = {
  date: string; // ISO: yyyy-MM-dd
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

// "0,3" -> 0.3 ; leeres Feld -> 0
function toNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const value = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

// FDDB ordnet Einträge nicht nach Kalendertag, sondern nach "Tagebuch-Tag"
// zu: ein Snack kurz nach Mitternacht zählt noch zum Vortag. Die CSV liefert
// aber nur den Uhrzeit-Stempel (dann bereits im nächsten Kalendertag). Wir
// bilden FDDB nach, indem Einträge vor DAY_CUTOFF_HOUR dem Vortag zugerechnet
// werden. In den Daten gibt es zwischen 03:00 und 05:00 keine Einträge — die
// erste Mahlzeit beginnt um 05:00 — daher trennt 05:00 Nacht-Snacks sauber
// von Frühstücken, ohne je eine echte Mahlzeit falsch einzuordnen.
const DAY_CUTOFF_HOUR = 5;

// "12.06.2026 23:44" -> "2026-06-12"; "11.06.2026 00:03" -> "2026-06-10"
// (Einträge vor 05:00 zählen zum Vortag, siehe DAY_CUTOFF_HOUR).
function toIsoDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})(?: (\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh] = match;
  // In UTC rechnen, damit der Tageswechsel nicht von der Zeitzone abhängt.
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  if (hh !== undefined && Number(hh) < DAY_CUTOFF_HOUR) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10);
}

export function parseFddbCsv(text: string): FddbDay[] {
  const totals = new Map<string, { protein: number; carbs: number; fat: number }>();

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    // Alle in "..." eingeschlossenen Felder herausziehen (robust gegen Kommas
    // und Semikolons innerhalb der Bezeichnung).
    const fields = Array.from(line.matchAll(/"([^"]*)"/g)).map((m) => m[1]);
    if (fields.length < 8) continue; // Kopfzeile / unvollständige Zeile

    const date = toIsoDate(fields[0]);
    if (!date) continue; // überspringt u. a. die Kopfzeile

    const fat = toNumber(fields[5]);
    const carbs = toNumber(fields[6]);
    const protein = toNumber(fields[7]);

    const acc = totals.get(date) ?? { protein: 0, carbs: 0, fat: 0 };
    acc.protein += protein;
    acc.carbs += carbs;
    acc.fat += fat;
    totals.set(date, acc);
  }

  return Array.from(totals.entries())
    .map(([date, t]) => ({
      date,
      protein_g: Math.round(t.protein),
      carbs_g: Math.round(t.carbs),
      fat_g: Math.round(t.fat),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
