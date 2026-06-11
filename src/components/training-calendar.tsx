import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const DATE_FORMAT = 'yyyy-MM-dd';
const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

type TrainingCalendarProps = {
  month: Date;
  completedDates: Set<string>;
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
  onChangeMonth?: (delta: number) => void;
};

export function TrainingCalendar({
  month,
  completedDates,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: TrainingCalendarProps) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  // getDay: 0 = Sunday ... 6 = Saturday. Convert to Monday-first index.
  const leadingBlanks = (getDay(startOfMonth(month)) + 6) % 7;

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <View style={styles.monthRow}>
        <Pressable
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
          onPress={() => onChangeMonth?.(-12)}>
          <ThemedText type="smallBold">«</ThemedText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
          onPress={() => onChangeMonth?.(-1)}>
          <ThemedText type="smallBold">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.monthLabel}>
          {format(month, 'MMMM yyyy', { locale: de })} · {completedDates.size}{' '}
          {completedDates.size === 1 ? 'Training' : 'Trainings'}
        </ThemedText>
        <Pressable
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
          onPress={() => onChangeMonth?.(1)}>
          <ThemedText type="smallBold">›</ThemedText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
          onPress={() => onChangeMonth?.(12)}>
          <ThemedText type="smallBold">»</ThemedText>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <ThemedText key={label} type="small" themeColor="textSecondary" style={styles.cell}>
            {label}
          </ThemedText>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: leadingBlanks }).map((_, index) => (
          <View key={`blank-${index}`} style={styles.cell} />
        ))}
        {days.map((day) => {
          const key = format(day, DATE_FORMAT);
          const isCompleted = completedDates.has(key);
          const isSelected = selectedDate ? format(selectedDate, DATE_FORMAT) === key : false;
          return (
            <View key={key} style={styles.cell}>
              <Pressable onPress={() => onSelectDate?.(day)}>
                <ThemedView
                  type={isCompleted ? 'accent' : 'background'}
                  style={[styles.dayCircle, isSelected && styles.daySelected]}>
                  <ThemedText type="small" themeColor={isCompleted ? 'accentText' : 'text'}>
                    {format(day, 'd')}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            </View>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: '80%',
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    borderWidth: 2,
    borderColor: '#1FD6C1',
  },
});
