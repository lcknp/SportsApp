import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useRuns } from '@/hooks/use-runs';

function formatPace(distanceKm: number, durationMinutes: number) {
  if (distanceKm <= 0) return '–';
  const paceMinutes = durationMinutes / distanceKm;
  const minutes = Math.floor(paceMinutes);
  const seconds = Math.round((paceMinutes - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
}

export default function RunningScreen() {
  const insets = useSafeAreaInsets();
  const { runs, deleteRun, refresh } = useRuns();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <ScrollView
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + BottomTabInset + Spacing.three },
      ]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Laufen</ThemedText>
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            onPress={() => router.push('/new-run')}>
            <ThemedView type="backgroundSelected" style={styles.addButtonInner}>
              <ThemedText type="smallBold">+ Lauf</ThemedText>
            </ThemedView>
          </Pressable>
        </ThemedView>

        {runs.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Noch keine Läufe eingetragen.
          </ThemedText>
        )}

        {runs.map((run) => (
          <ThemedView key={run.id} type="backgroundElement" style={styles.card}>
            <ThemedView>
              <ThemedText type="smallBold">{format(new Date(run.date), 'EEEE, d. MMMM', { locale: de })}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {run.distance_km} km · {run.duration_minutes} min · {formatPace(run.distance_km, run.duration_minutes)}
              </ThemedText>
            </ThemedView>
            <Pressable
              style={({ pressed }) => pressed && styles.pressed}
              onPress={() => deleteRun(run.id, run.date)}>
              <ThemedText type="small" themeColor="textSecondary">
                Löschen
              </ThemedText>
            </Pressable>
          </ThemedView>
        ))}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    borderRadius: Spacing.three,
  },
  addButtonInner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
