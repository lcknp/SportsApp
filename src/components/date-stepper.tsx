import { addDays, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type DateStepperProps = {
  date: Date;
  onChange: (date: Date) => void;
};

export function DateStepper({ date, onChange }: DateStepperProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => onChange(addDays(date, -1))}>
        <ThemedText type="smallBold">←</ThemedText>
      </Pressable>
      <ThemedText type="smallBold">{format(date, 'EEEE, d. MMMM yyyy', { locale: de })}</ThemedText>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => onChange(addDays(date, 1))}>
        <ThemedText type="smallBold">→</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
