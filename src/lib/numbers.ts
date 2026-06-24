// Zahlen-Eingaben akzeptieren sowohl Komma als auch Punkt als Dezimaltrennzeichen.
// (TextInput speichert den Roh-String; Number("82,5") wäre NaN.)
export function parseDecimal(raw: string | null | undefined): number {
  if (raw == null) return 0;
  const value = parseFloat(raw.trim().replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}
