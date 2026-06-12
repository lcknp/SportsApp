import { differenceInCalendarDays } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarBadge } from '@/components/calendar-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useRuns } from '@/hooks/use-runs';
import { useStrava } from '@/hooks/use-strava';
import { groupByMonth } from '@/lib/month-groups';

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
  const { isConfigured, isConnected, isSyncing, connect, sync, disconnect } = useStrava();

  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const autoSyncedRef = useRef(false);

  const handleSync = useCallback(
    async (silent: boolean) => {
      if (!silent) setSyncMessage(null);
      const result = await sync();
      if (result.error) {
        if (!silent) setSyncMessage('Fehler: ' + result.error);
        return;
      }
      const imported = result.imported ?? 0;
      if (imported > 0) {
        await refresh();
      }
      if (!silent) {
        setSyncMessage(
          imported > 0
            ? `${imported} ${imported === 1 ? 'neuer Lauf' : 'neue Läufe'} importiert.`
            : 'Alles aktuell — keine neuen Läufe.',
        );
      } else if (imported > 0) {
        setSyncMessage(`${imported} ${imported === 1 ? 'neuer Lauf' : 'neue Läufe'} von Strava importiert.`);
      }
    },
    [sync, refresh],
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
      // Einmal pro App-Sitzung still im Hintergrund syncen
      if (isConnected && !autoSyncedRef.current) {
        autoSyncedRef.current = true;
        handleSync(true);
      }
    }, [refresh, isConnected, handleSync]),
  );

  // Statistik der letzten 30 Tage
  const recentRuns = runs.filter((run) => differenceInCalendarDays(new Date(), new Date(run.date)) <= 30);
  const recentKm = recentRuns.reduce((sum, run) => sum + Number(run.distance_km), 0);
  const recentMinutes = recentRuns.reduce((sum, run) => sum + Number(run.duration_minutes), 0);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + BottomTabInset + Spacing.six },
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

        {isConfigured && (
          <ThemedView type="backgroundElement" style={styles.stravaCard}>
            {isConnected ? (
              <>
                <ThemedView style={styles.stravaRow}>
                  <ThemedText type="smallBold">✓ Strava verbunden</ThemedText>
                  <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={disconnect}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Trennen
                    </ThemedText>
                  </Pressable>
                </ThemedView>
                <Pressable
                  style={({ pressed }) => [styles.stravaButton, pressed && styles.pressed]}
                  disabled={isSyncing}
                  onPress={() => handleSync(false)}>
                  <ThemedView type="accent" style={styles.stravaButtonInner}>
                    <ThemedText type="smallBold" themeColor="accentText">
                      {isSyncing ? 'Synchronisiere …' : 'Läufe von Strava importieren'}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
                {syncMessage && <ThemedText type="small">{syncMessage}</ThemedText>}
              </>
            ) : Platform.OS === 'web' ? (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  Verbinde Strava, dann landen deine Läufe automatisch hier — ohne Tipparbeit.
                </ThemedText>
                <Pressable style={({ pressed }) => [styles.stravaButton, pressed && styles.pressed]} onPress={connect}>
                  <ThemedView style={[styles.stravaButtonInner, styles.stravaBrand]}>
                    <ThemedText type="smallBold" style={styles.stravaBrandText}>
                      Mit Strava verbinden
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Strava verbinden geht einmalig im Browser (Web-App) — danach funktioniert der Sync
                auch hier.
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary" style={styles.poweredBy}>
              Powered by Strava
            </ThemedText>
          </ThemedView>
        )}

        {recentRuns.length > 0 && (
          <ThemedView type="backgroundElement" style={styles.statsCard}>
            <ThemedText type="smallBold">Letzte 30 Tage</ThemedText>
            <ThemedView style={styles.statsRow}>
              <ThemedView style={styles.stat}>
                <ThemedText type="title" themeColor="accent">
                  {recentRuns.length}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Läufe
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.stat}>
                <ThemedText type="title" themeColor="accent">
                  {recentKm.toFixed(1)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  km
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.stat}>
                <ThemedText type="title" themeColor="accent">
                  {formatPace(recentKm, recentMinutes).replace(' min/km', '')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Ø Pace
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        )}

        {runs.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Noch keine Läufe eingetragen.
          </ThemedText>
        )}

        {groupByMonth(runs, (run) => run.date).map((group) => (
          <ThemedView key={group.label} style={styles.monthGroup}>
            <ThemedView style={styles.monthHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {group.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {group.items.length} {group.items.length === 1 ? 'Lauf' : 'Läufe'}
              </ThemedText>
            </ThemedView>

            {group.items.map((run) => (
              <ThemedView key={run.id} type="backgroundElement" style={styles.card}>
                <CalendarBadge date={new Date(run.date)} />
                <ThemedView style={styles.cardBody}>
                  <ThemedText type="smallBold">{run.distance_km} km</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {run.duration_minutes} min · {formatPace(run.distance_km, run.duration_minutes)}
                    {run.strava_id ? ' · via Strava' : ''}
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
  stravaCard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  stravaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stravaButton: {
    borderRadius: Spacing.two,
  },
  stravaButtonInner: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  stravaBrand: {
    backgroundColor: '#FC5200',
  },
  stravaBrandText: {
    color: '#ffffff',
  },
  poweredBy: {
    textAlign: 'right',
  },
  statsCard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  monthGroup: {
    gap: Spacing.two,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
    marginTop: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  cardBody: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
