import { useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useWeightImport } from '@/hooks/use-weight-import';
import { parseWeightCsv } from '@/lib/weight-csv';

// Web-Variante: lädt eine CSV (Google-Sheets-Export) über einen echten
// Datei-Dialog und importiert den Gewichtsverlauf.
export function WeightImport({ onImported }: { onImported?: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { importEntries } = useWeightImport();
  const [message, setMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFile(file: File) {
    setMessage(null);
    setIsImporting(true);
    try {
      const text = await file.text();
      const entries = parseWeightCsv(text);
      const result = await importEntries(entries);
      if (result.error) {
        setMessage('Fehler: ' + result.error);
      } else {
        setMessage(`${result.count} Tage importiert.`);
        onImported?.();
      }
    } catch {
      setMessage('Datei konnte nicht gelesen werden.');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Gewichts-Import</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Exportiere dein Google Sheet als CSV und lade es hier hoch. Übernommen wird das Gewicht
        (Spalte C) für jeden Tag mit Datum (Spalte B). Bereits vorhandene Tage werden überschrieben.
      </ThemedText>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          event.target.value = '';
        }}
      />

      {message && <ThemedText type="small">{message}</ThemedText>}

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        disabled={isImporting}
        onPress={() => inputRef.current?.click()}>
        <ThemedView type="backgroundSelected" style={styles.buttonInner}>
          <ThemedText type="smallBold">
            {isImporting ? 'Importiere …' : 'Gewichts-CSV importieren'}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  button: {
    borderRadius: Spacing.two,
  },
  buttonInner: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
