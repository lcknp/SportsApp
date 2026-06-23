import { StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';

// Native Variante (iOS/Android): Der CSV-Upload läuft über die Web-App.
// Auf Web wird stattdessen weight-import.web.tsx verwendet.
export function WeightImport(_props: { onImported?: () => void }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Gewichts-Import</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Der CSV-Import des Gewichtsverlaufs funktioniert in der Web-App im Browser: Google Sheet als
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
