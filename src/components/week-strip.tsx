import { addDays, format, isSameDay, isToday, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type WeekStripProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSwipeWeek: (deltaWeeks: number) => void;
};

const SWIPE_THRESHOLD = 40;

export function WeekStrip({ selectedDate, onSelectDate, onSwipeWeek }: WeekStripProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx <= -SWIPE_THRESHOLD) onSwipeWeek(1);
        else if (gesture.dx >= SWIPE_THRESHOLD) onSwipeWeek(-1);
      },
    }),
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {days.map((day) => {
        const selected = isSameDay(day, selectedDate);
        const today = isToday(day);
        return (
          <Pressable key={day.toISOString()} style={styles.dayColumn} onPress={() => onSelectDate(day)}>
            <ThemedView
              type={selected ? 'accent' : today ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.circle}>
              <ThemedText type="smallBold" themeColor={selected ? 'accentText' : 'text'}>
                {format(day, 'd')}
              </ThemedText>
            </ThemedView>
            <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
              {format(day, 'EEEEEE', { locale: de })}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
