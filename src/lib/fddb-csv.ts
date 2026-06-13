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

// "12.06.2026 23:44" -> "2026-06-12"  (nur der Datumsteil)
function toIsoDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
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
