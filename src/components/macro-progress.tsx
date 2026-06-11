import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MacroProgressProps = {
  label: string;
  current: number;
  goal: number;
  unit: string;
};

export function MacroProgress({ label, current, goal, unit }: MacroProgressProps) {
  const theme = useTheme();
  const ratio = goal > 0 ? Math.min(current / goal, 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <ThemedText type="small">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {current} / {goal} {unit}
        </ThemedText>
      </View>
      <ThemedView type="backgroundElement" style={styles.track}>
        <View
          style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: theme.text }]}
        />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
