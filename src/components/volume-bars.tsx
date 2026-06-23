import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Sätze pro Muskelgruppe als horizontale Balken (Breite relativ zum Maximum).
export function VolumeBars({ data }: { data: [string, number][] }) {
  const theme = useTheme();
  const max = data.reduce((highest, [, sets]) => Math.max(highest, sets), 0) || 1;

  return (
    <View style={styles.list}>
      {data.map(([target, sets]) => (
        <View key={target} style={styles.row}>
          <View style={styles.labelRow}>
            <ThemedText type="small">{target}</ThemedText>
            <ThemedText type="smallBold">{sets}</ThemedText>
          </View>
          <ThemedView type="backgroundSelected" style={styles.track}>
            <View
              style={[styles.fill, { width: `${(sets / max) * 100}%`, backgroundColor: theme.accent }]}
            />
          </ThemedView>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.half,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
