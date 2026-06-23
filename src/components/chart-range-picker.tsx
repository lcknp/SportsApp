import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export const CHART_RANGE_OPTIONS = [
  { label: '2W', days: 14 },
  { label: '4W', days: 28 },
  { label: '1M', days: 30 },
  { label: '6M', days: 182 },
  { label: '1J', days: 365 },
] as const;

type ChartRangePickerProps = {
  value: number;
  onChange: (days: number) => void;
};

// Segmentierte Auswahl des Chart-Zeitraums (gilt für alle Verlaufs-Charts).
export function ChartRangePicker({ value, onChange }: ChartRangePickerProps) {
  return (
    <View style={styles.row}>
      {CHART_RANGE_OPTIONS.map((option) => {
        const selected = option.days === value;
        return (
          <Pressable
            key={option.label}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            onPress={() => onChange(option.days)}>
            <ThemedView
              type={selected ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.chip}>
              <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
                {option.label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  item: {
    flex: 1,
    borderRadius: Spacing.two,
  },
  chip: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
