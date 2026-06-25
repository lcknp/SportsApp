import { differenceInCalendarDays } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';

import { CalendarBadge } from '@/components/calendar-badge';
import { LineChart } from '@/components/line-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useRuns } from '@/hooks/use-runs';
import { useStrava } from '@/hooks/use-strava';
import { useTheme } from '@/hooks/use-theme';
import { groupByMonth } from '@/lib/month-groups';
import type { Run, StravaDetail, StravaStats } from '@/types/database';

function formatPace(distanceKm: number, durationMinutes: number) {
  if (distanceKm <= 0) return '–';
  const paceMinutes = durationMinutes / distanceKm;
  const minutes = Math.floor(paceMinutes);
  const seconds = Math.round((paceMinutes - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
}

// mm:ss aus Sekunden
function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Pace (min/km) aus Geschwindigkeit in m/s
function paceFromSpeed(metersPerSecond: number | null | undefined) {
  if (!metersPerSecond || metersPerSecond <= 0) return '–';
  return formatClock(1000 / metersPerSecond);
}

// Startuhrzeit aus Strava-Zeitstempel (lokal kodiert) – ohne Zeitzonen-Umrechnung
function formatStartTime(iso: string | null | undefined) {
  if (!iso || iso.length < 16) return null;
  return iso.slice(11, 16);
}

// Zeichnet den GPS-Verlauf als SVG-Linie (aspektgetreu, keine Karte/Tiles nötig).
function RouteMap({ points, color }: { points: [number, number][]; color: string }) {
  if (!points || points.length < 2) return null;
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1e-6;
  const spanLng = maxLng - minLng || 1e-6;
  const scale = 96 / Math.max(spanLat, spanLng);
  const offsetX = (100 - spanLng * scale) / 2;
  const offsetY = (100 - spanLat * scale) / 2;
  const coords = points
    .map(([lat, lng]) => {
      const x = offsetX + (lng - minLng) * scale;
      const y = offsetY + (maxLat - lat) * scale; // y invertiert (Norden oben)
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <View style={styles.routeBox}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <Polyline points={coords} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </Svg>
    </View>
  );
}

export default function RunningScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { runs, deleteRun, refresh, fetchRunDetails } = useRuns();
  const { isConfigured, isConnected, isSyncing, connect, sync, fetchActivityDetail, disconnect } = useStrava();

  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const autoSyncedRef = useRef(false);

  // Aufgeklappter Lauf + lazy geladene Detaildaten (pro Lauf). Die schweren
  // Spalten (stats/detail) werden erst hier geladen, nicht schon in der Liste.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statsCache, setStatsCache] = useState<Record<string, StravaStats | null>>({});
  const [details, setDetails] = useState<Record<string, StravaDetail>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  async function toggleRun(run: Run) {
    if (expandedId === run.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(run.id);
    setDetailError(null);

    let detail: StravaDetail | null = details[run.id] ?? null;

    // Schwere Spalten (Stats + ggf. gecachte Details) einmalig pro Lauf nachladen.
    if (!(run.id in statsCache)) {
      const heavy = await fetchRunDetails(run.id);
      setStatsCache((current) => ({ ...current, [run.id]: heavy.stats }));
      if (heavy.detail) {
        detail = heavy.detail;
        setDetails((current) => ({ ...current, [run.id]: heavy.detail! }));
      }
    }

    // Strava-Lauf, dessen Details noch nicht gecacht sind → einmal von Strava holen.
    if (!detail && run.strava_id) {
      setDetailLoadingId(run.id);
      const result = await fetchActivityDetail(run.id);
      setDetailLoadingId((current) => (current === run.id ? null : current));
      if (result.error) {
        setDetailError(result.error);
        return;
      }
      if (result.detail) {
        setDetails((current) => ({ ...current, [run.id]: result.detail! }));
      }
    }
  }

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
        <View style={styles.header}>
          <ThemedText type="subtitle">Laufen</ThemedText>
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            onPress={() => router.push('/new-run')}>
            <ThemedView type="backgroundSelected" style={styles.addButtonInner}>
              <ThemedText type="smallBold">+ Lauf</ThemedText>
            </ThemedView>
          </Pressable>
        </View>

        {isConfigured && (
          <ThemedView type="backgroundElement" style={styles.stravaCard}>
            {isConnected ? (
              <>
                <View style={styles.stravaRow}>
                  <ThemedText type="smallBold">✓ Strava verbunden</ThemedText>
                  <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={disconnect}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Trennen
                    </ThemedText>
                  </Pressable>
                </View>
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
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <ThemedText type="title" themeColor="accent">
                  {recentRuns.length}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Läufe
                </ThemedText>
              </View>
              <View style={styles.stat}>
                <ThemedText type="title" themeColor="accent">
                  {recentKm.toFixed(1)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  km
                </ThemedText>
              </View>
              <View style={styles.stat}>
                <ThemedText type="title" themeColor="accent">
                  {formatPace(recentKm, recentMinutes).replace(' min/km', '')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Ø Pace
                </ThemedText>
              </View>
            </View>
          </ThemedView>
        )}

        {runs.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Noch keine Läufe eingetragen.
          </ThemedText>
        )}

        {groupByMonth(runs, (run) => run.date).map((group) => (
          <ThemedView key={group.label} style={styles.monthGroup}>
            <View style={styles.monthHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {group.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {group.items.length} {group.items.length === 1 ? 'Lauf' : 'Läufe'}
              </ThemedText>
            </View>

            {group.items.map((run) => {
              const isExpanded = expandedId === run.id;
              const stats = statsCache[run.id] ?? null;
              const detail = details[run.id];

              const tiles: { label: string; value: string }[] = [];
              const startTime = formatStartTime(stats?.started_at);
              if (startTime) tiles.push({ label: 'Start', value: startTime + ' Uhr' });
              if (stats?.elapsed_minutes != null) tiles.push({ label: 'Gesamt', value: `${stats.elapsed_minutes} min` });
              if (stats?.elevation_gain != null) tiles.push({ label: 'Höhenmeter', value: `${Math.round(stats.elevation_gain)} m` });
              if (stats?.avg_heartrate != null) tiles.push({ label: 'Ø Puls', value: `${Math.round(stats.avg_heartrate)}` });
              if (stats?.max_heartrate != null) tiles.push({ label: 'Max Puls', value: `${Math.round(stats.max_heartrate)}` });
              if (stats?.avg_cadence != null) tiles.push({ label: 'Schritte/min', value: `${Math.round(stats.avg_cadence * 2)}` });
              if (stats?.max_speed != null) tiles.push({ label: 'Max Tempo', value: `${paceFromSpeed(stats.max_speed)}/km` });
              if (detail?.calories != null) tiles.push({ label: 'Kalorien', value: `${Math.round(detail.calories)} kcal` });
              if (stats?.suffer_score != null) tiles.push({ label: 'Anstrengung', value: `${Math.round(stats.suffer_score)}` });
              if (stats?.kudos_count != null) tiles.push({ label: 'Kudos', value: `${stats.kudos_count}` });

              const splits = detail?.splits ?? [];
              const splitPaces = splits.map((s) => (s.distance > 0 ? s.moving_time / (s.distance / 1000) : 0));
              const fastestPace = splitPaces.filter((p) => p > 0).length
                ? Math.min(...splitPaces.filter((p) => p > 0))
                : 0;

              const streams = detail?.streams;
              const kmLabels = streams && streams.distance.length
                ? ['0 km', `${(streams.distance[streams.distance.length - 1] / 1000).toFixed(1)} km`]
                : [];

              return (
                <Pressable
                  key={run.id}
                  style={({ pressed }) => pressed && styles.pressed}
                  onPress={() => toggleRun(run)}>
                  <ThemedView type="backgroundElement" style={styles.card}>
                    <View style={styles.runRow}>
                      <CalendarBadge date={new Date(run.date)} />
                      <View style={styles.cardBody}>
                        <ThemedText type="smallBold">{run.distance_km} km</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {run.duration_minutes} min · {formatPace(run.distance_km, run.duration_minutes)}
                          {run.strava_id ? ' · via Strava' : ''}
                        </ThemedText>
                      </View>
                      <Pressable
                        style={({ pressed }) => pressed && styles.pressed}
                        onPress={() => deleteRun(run.id, run.date)}>
                        <ThemedText type="small" themeColor="textSecondary">
                          Löschen
                        </ThemedText>
                      </Pressable>
                    </View>

                    {isExpanded && (
                      <View style={styles.detailArea}>
                        {tiles.length > 0 && (
                          <View style={styles.tileGrid}>
                            {tiles.map((tile) => (
                              <View key={tile.label} style={styles.tile}>
                                <ThemedText type="smallBold">{tile.value}</ThemedText>
                                <ThemedText type="small" themeColor="textSecondary">
                                  {tile.label}
                                </ThemedText>
                              </View>
                            ))}
                          </View>
                        )}

                        {!run.strava_id && (
                          <ThemedText type="small" themeColor="textSecondary">
                            Für manuell eingetragene Läufe gibt es keine Strava-Details.
                          </ThemedText>
                        )}

                        {detailLoadingId === run.id && (
                          <ThemedText type="small" themeColor="textSecondary">
                            Lade Details von Strava …
                          </ThemedText>
                        )}

                        {detailError && (
                          <ThemedText type="small" themeColor="textSecondary">
                            {detailError}
                          </ThemedText>
                        )}

                        {detail && (
                          <>
                            {splits.length > 0 && (
                              <View style={styles.splitBlock}>
                                <ThemedText type="smallBold">Pace pro Kilometer</ThemedText>
                                {splits.map((split, index) => {
                                  const pace = splitPaces[index];
                                  const width = pace > 0 && fastestPace > 0 ? `${(fastestPace / pace) * 100}%` : '0%';
                                  return (
                                    <View key={split.km} style={styles.splitRow}>
                                      <ThemedText type="small" themeColor="textSecondary" style={styles.splitLabel}>
                                        km {split.km}
                                      </ThemedText>
                                      <View style={styles.splitBarTrack}>
                                        <View
                                          style={[styles.splitBarFill, { width: width as any, backgroundColor: theme.accent }]}
                                        />
                                      </View>
                                      <ThemedText type="small" style={styles.splitPace}>
                                        {pace > 0 ? `${formatClock(pace)}/km` : '–'}
                                      </ThemedText>
                                    </View>
                                  );
                                })}
                              </View>
                            )}

                            {detail.best_efforts.length > 0 && (
                              <View style={styles.splitBlock}>
                                <ThemedText type="smallBold">Bestzeiten in diesem Lauf</ThemedText>
                                {detail.best_efforts.map((effort) => (
                                  <View key={effort.name} style={styles.effortRow}>
                                    <ThemedText type="small" themeColor="textSecondary">
                                      {effort.name}
                                    </ThemedText>
                                    <ThemedText type="smallBold">{formatClock(effort.seconds)}</ThemedText>
                                  </View>
                                ))}
                              </View>
                            )}

                            {streams && streams.altitude.length > 1 && (
                              <LineChart
                                title="Höhenprofil"
                                series={[{ label: 'Höhe (m)', color: theme.accent, values: streams.altitude }]}
                                labels={kmLabels}
                              />
                            )}

                            {streams && streams.heartrate.length > 1 && (
                              <LineChart
                                title="Puls"
                                series={[{ label: 'bpm', color: '#e5484d', values: streams.heartrate }]}
                                labels={kmLabels}
                              />
                            )}

                            {streams && streams.latlng.length > 2 && (
                              <View style={styles.splitBlock}>
                                <ThemedText type="smallBold">Strecke</ThemedText>
                                <RouteMap points={streams.latlng} color={theme.accent} />
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    )}
                  </ThemedView>
                </Pressable>
              );
            })}
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
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  runRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardBody: {
    flex: 1,
    gap: Spacing.half,
  },
  detailArea: {
    gap: Spacing.three,
    paddingTop: Spacing.one,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  tile: {
    minWidth: 72,
    gap: Spacing.half,
  },
  splitBlock: {
    gap: Spacing.one,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  splitLabel: {
    width: 48,
  },
  splitBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(128,128,128,0.2)',
    overflow: 'hidden',
  },
  splitBarFill: {
    height: 8,
    borderRadius: 4,
  },
  splitPace: {
    width: 72,
    textAlign: 'right',
  },
  effortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeBox: {
    width: '100%',
    aspectRatio: 1.6,
  },
  pressed: {
    opacity: 0.7,
  },
});
