import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Kleines Kalender-Kästchen: Wochentag oben, Tageszahl darunter. */
export function CalendarBadge({ date }: { date: Date }) {
  return (
    <ThemedView type="backgroundSelected" style={styles.badge}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.weekday}>
        {format(date, 'EEEEEE', { locale: de })}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.day}>
        {format(date, 'd')}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 44,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  weekday: {
    fontSize: 11,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  day: {
    fontSize: 18,
    lineHeight: 22,
  },
});
