// Parser für den Gewichts-Export aus dem Google-Sheets-„DATA TRACKER".
//
// Die Tabelle hat eine leere erste Spalte (A), dann Spalte B = Datum und
// Spalte C = Gewicht. Dazwischen gibt es Kopf-, Leer- und Auswertungszeilen
// (Ø, DIFFERENCE, N/A …). Wir übernehmen nur Zeilen, bei denen in Spalte B ein
// echtes Datum (dd.mm.yyyy) steht, und lesen das Gewicht aus Spalte C.
//
// Gewicht kommt in gemischten Formaten vor: "82", "82,5" (Komma) und "81.9"
// (Punkt). Beides wird zu einer Zahl normalisiert.

export type WeightEntry = {
  date: string; // ISO: yyyy-MM-dd
  weight_kg: number;
};

// Eine CSV-Zeile in Felder zerlegen, robust gegen Kommas in Anführungszeichen
// (z.B. "82,5").
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

// "82,5" / "81.9" / "82" -> Zahl ; ungültig -> NaN
function toNumber(raw: string | undefined): number {
  if (!raw) return NaN;
  return parseFloat(raw.trim().replace(',', '.'));
}

// "19.05.2025" -> "2025-05-19" ; alles andere -> null
function toIsoDate(raw: string | undefined): string | null {
  const match = raw?.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function parseWeightCsv(text: string): WeightEntry[] {
  // Pro Tag der letzte Wert gewinnt (falls ein Datum doppelt vorkommt).
  const byDate = new Map<string, number>();

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);

    const date = toIsoDate(fields[1]); // Spalte B
    if (!date) continue; // überspringt Kopf-/Auswertungs-/Leerzeilen

    const weight = toNumber(fields[2]); // Spalte C
    if (!Number.isFinite(weight) || weight <= 0) continue;

    byDate.set(date, weight);
  }

  return Array.from(byDate.entries())
    .map(([date, weight_kg]) => ({ date, weight_kg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
