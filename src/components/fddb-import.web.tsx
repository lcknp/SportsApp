import { useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useMacroImport } from '@/hooks/use-macro-import';
import { parseFddbCsv } from '@/lib/fddb-csv';

// Web-Variante: lädt eine FDDB-CSV über einen echten Datei-Dialog und
// importiert die Tagesmakros. (Auf nativen Geräten greift fddb-import.tsx.)
export function FddbImport({ onImported }: { onImported?: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { importDays } = useMacroImport();
  const [message, setMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFile(file: File) {
    setMessage(null);
    setIsImporting(true);
    try {
      const text = await file.text();
      const days = parseFddbCsv(text);
      const result = await importDays(days);
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
      <ThemedText type="smallBold">FDDB-Import</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Exportiere dein Tagebuch bei fddb.info als CSV und lade es hier hoch. Pro Tag werden Protein,
        Kohlenhydrate und Fett übernommen — die Kalorien berechnet die App daraus. Bereits
        vorhandene Tage werden überschrieben.
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
            {isImporting ? 'Importiere …' : 'FDDB-CSV importieren'}
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
