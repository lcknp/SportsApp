import { StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';

// Native Variante (iOS/Android): Der Datei-Upload läuft über die Web-App.
// Auf Web wird stattdessen fddb-import.web.tsx verwendet.
export function FddbImport(_props: { onImported?: () => void }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">FDDB-Import</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Der CSV-Import von FDDB funktioniert in der Web-App im Browser: Tagebuch bei fddb.info als
        CSV exportieren und dort im Profil hochladen. Die importierten Tage erscheinen anschließend
        auch hier.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
});
