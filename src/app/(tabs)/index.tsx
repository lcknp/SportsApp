import { addDays, addMonths, format, isToday, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChartRangePicker } from '@/components/chart-range-picker';
import { LineChart } from '@/components/line-chart';
import { MacroRing } from '@/components/macro-ring';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { TrainingCalendar } from '@/components/training-calendar';
import { WeekStrip } from '@/components/week-strip';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useDailyMacros } from '@/hooks/use-daily-macros';
import { useMacroHistory } from '@/hooks/use-macro-history';
import { useProfile } from '@/hooks/use-profile';
import { useRuns } from '@/hooks/use-runs';
import { useStepCount } from '@/hooks/use-step-count';
import { useTrainingSessions } from '@/hooks/use-training-sessions';
import { useWeights } from '@/hooks/use-weights';
import { useWorkoutSessions } from '@/hooks/use-workout-sessions';

const DATE_FORMAT = 'yyyy-MM-dd';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const today = new Date();

  const { profile } = useProfile();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [isMacrosCollapsed, setIsMacrosCollapsed] = useState(false);
  const [isWeightCollapsed, setIsWeightCollapsed] = useState(true);
  const [chartRangeDays, setChartRangeDays] = useState(28);

  const { macros, saveMacros, deleteMacros, refresh: refreshMacros } = useDailyMacros(viewDate);
  const { weights, saveWeight, deleteWeight, refresh: refreshWeights } = useWeights();
  const { completedDates, refresh: refreshWorkouts } = useWorkoutSessions(calendarMonth);
  const { sessions, refresh: refreshSessions } = useTrainingSessions();
  const { runs, refresh: refreshRuns } = useRuns();
  const { history: macroHistory, refresh: refreshMacroHistory } = useMacroHistory(chartRangeDays);
  const { steps, isAvailable: isStepCountAvailable } = useStepCount(viewDate);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { macros: selectedDayMacros } = useDailyMacros(selectedDate ?? today);

  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [macroMessage, setMacroMessage] = useState<string | null>(null);
  const [isSavingMacros, setIsSavingMacros] = useState(false);

  const [weight, setWeight] = useState('');
  const [weightMessage, setWeightMessage] = useState<string | null>(null);
  const [isSavingWeight, setIsSavingWeight] = useState(false);

  useEffect(() => {
    setProtein(macros ? String(macros.protein_g) : '');
    setCarbs(macros ? String(macros.carbs_g) : '');
    setFat(macros ? String(macros.fat_g) : '');
    setMacroMessage(null);
  }, [macros]);

  useEffect(() => {
    const viewDateString = format(viewDate, 'yyyy-MM-dd');
    const existing = weights.find((entry) => entry.date === viewDateString);
    setWeight(existing ? String(existing.weight_kg) : '');
    setWeightMessage(null);
  }, [weights, viewDate]);

  useFocusEffect(
    useCallback(() => {
      refreshMacros();
      refreshWeights();
      refreshWorkouts();
      refreshSessions();
      refreshRuns();
      refreshMacroHistory();
    }, [refreshMacros, refreshWeights, refreshWorkouts, refreshSessions, refreshRuns, refreshMacroHistory]),
  );

  const goals = profile ?? {
    daily_calories: 2000,
    daily_protein_g: 150,
    daily_carbs_g: 200,
    daily_fat_g: 70,
  };

  const proteinG = Number(protein) || 0;
  const carbsG = Number(carbs) || 0;
  const fatG = Number(fat) || 0;
  const calculatedCalories = Math.round(proteinG * 4 + carbsG * 4 + fatG * 9);

  // Gewichtsverlauf nach gewähltem Zeitraum filtern (aufsteigend nach Datum).
  const rangeCutoff = format(subDays(today, chartRangeDays - 1), DATE_FORMAT);
  const weightHistory = weights
    .filter((entry) => entry.date >= rangeCutoff)
    .slice()
    .reverse();
  const weightLabels = weightHistory.map((entry) => format(new Date(entry.date), 'd.M.', { locale: de }));

  const macroLabels = macroHistory.map((entry) => format(new Date(entry.date), 'd.M.', { locale: de }));
  // Makros (Gramm) und Kalorien (kcal) getrennt — eine gemeinsame Skala für
  // beide ginge nicht auf (g ~0–500 vs. kcal ~2000–4500).
  const macroChartSeries = [
    { label: 'Protein (g)', color: '#22A06B', values: macroHistory.map((entry) => entry.protein_g) },
    { label: 'Kohlenhydrate (g)', color: '#E5A93B', values: macroHistory.map((entry) => entry.carbs_g) },
    { label: 'Fett (g)', color: '#E5484D', values: macroHistory.map((entry) => entry.fat_g) },
  ];
  const caloriesChartSeries = [
    {
      label: 'Kalorien (kcal)',
      color: '#5B8DEF',
      values: macroHistory.map((entry) =>
        Math.round(entry.protein_g * 4 + entry.carbs_g * 4 + entry.fat_g * 9),
      ),
    },
  ];

  const selectedDateString = selectedDate ? format(selectedDate, DATE_FORMAT) : null;
  const selectedDayTrainings = selectedDateString
    ? sessions.filter((trainingSession) => trainingSession.date === selectedDateString)
    : [];
  const selectedDayRuns = selectedDateString ? runs.filter((run) => run.date === selectedDateString) : [];
  const selectedDayWeight = selectedDateString
    ? weights.find((entry) => entry.date === selectedDateString)
    : undefined;
  const selectedDayCalories = selectedDayMacros
    ? Math.round(selectedDayMacros.protein_g * 4 + selectedDayMacros.carbs_g * 4 + selectedDayMacros.fat_g * 9)
    : 0;

  async function handleSaveMacros() {
    setMacroMessage(null);
    setIsSavingMacros(true);
    const error = await saveMacros(proteinG, carbsG, fatG);
    setIsSavingMacros(false);
    setMacroMessage(error ?? 'Gespeichert.');
  }

  async function handleDeleteMacros() {
    setMacroMessage(null);
    setIsSavingMacros(true);
    const error = await deleteMacros();
    setIsSavingMacros(false);
    if (error) {
      setMacroMessage(error);
      return;
    }
    setProtein('');
    setCarbs('');
    setFat('');
    setMacroMessage('Gelöscht.');
  }

  async function handleSaveWeight() {
    const weightKg = Number(weight);
    if (!weightKg || weightKg <= 0) {
      setWeightMessage('Bitte ein gültiges Gewicht eingeben.');
      return;
    }
    setWeightMessage(null);
    setIsSavingWeight(true);
    const error = await saveWeight(viewDate, weightKg);
    setIsSavingWeight(false);
    setWeightMessage(error ?? 'Gespeichert.');
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + BottomTabInset + Spacing.three },
      ]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">
            {isToday(viewDate) ? 'Heute' : format(viewDate, 'EEEE, d. MMMM', { locale: de })}
          </ThemedText>
          {!isToday(viewDate) && (
            <ThemedText type="small" themeColor="textSecondary">
              {format(viewDate, 'd. MMMM yyyy', { locale: de })}
            </ThemedText>
          )}
        </View>

        <WeekStrip
          selectedDate={viewDate}
          onSelectDate={setViewDate}
          onSwipeWeek={(deltaWeeks) => setViewDate((current) => addDays(current, deltaWeeks * 7))}
        />

        {isStepCountAvailable && steps != null && (
          <ThemedView type="backgroundElement" style={styles.stepsCard}>
            <ThemedText type="smallBold">🚶 Schritte</ThemedText>
            <ThemedText type="title" themeColor="accent">
              {steps.toLocaleString('de-DE')}
            </ThemedText>
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={styles.macroCard}>
          <Pressable
            style={({ pressed }) => pressed && styles.pressed}
            onPress={() => setIsWeightCollapsed((current) => !current)}>
            <View style={styles.collapseHeader}>
              <ThemedText type="smallBold">Gewicht</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isWeightCollapsed ? '▸ Aufklappen' : '▾ Einklappen'}
              </ThemedText>
            </View>
          </Pressable>

          {!isWeightCollapsed && (
            <>
              <View style={styles.row}>
                <View style={[styles.field, styles.flex1]}>
                  <ThemedText type="small">Gewicht (kg)</ThemedText>
                  <ThemedTextInput keyboardType="numeric" value={weight} onChangeText={setWeight} />
                </View>
              </View>

              {weightMessage && <ThemedText type="small">{weightMessage}</ThemedText>}

              <Pressable
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
                disabled={isSavingWeight}
                onPress={handleSaveWeight}>
                <ThemedView type="accent" style={styles.saveButtonInner}>
                  <ThemedText type="smallBold" themeColor="accentText">
                    Gewicht speichern
                  </ThemedText>
                </ThemedView>
              </Pressable>

              {weights.length > 0 && (
                <View style={styles.weightHistory}>
                  {weights.slice(0, 7).map((entry) => (
                    <View key={entry.id} style={styles.weightRow}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {format(new Date(entry.date), 'EEEE, d. MMMM', { locale: de })}
                      </ThemedText>
                      <View style={styles.weightRowRight}>
                        <ThemedText type="small">{entry.weight_kg} kg</ThemedText>
                        <Pressable
                          style={({ pressed }) => pressed && styles.pressed}
                          onPress={() => deleteWeight(entry.id)}>
                          <ThemedText type="small" themeColor="textSecondary">
                            Löschen
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.macroCard}>
          <Pressable
            style={({ pressed }) => pressed && styles.pressed}
            onPress={() => setIsMacrosCollapsed((current) => !current)}>
            <View style={styles.collapseHeader}>
              <ThemedText type="smallBold">Tagesmakros</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isMacrosCollapsed ? '▸ Aufklappen' : '▾ Einklappen'}
              </ThemedText>
            </View>
          </Pressable>

          {!isMacrosCollapsed && (
            <>
              <View style={styles.ringRow}>
                <MacroRing
                  label="Kalorien"
                  current={calculatedCalories}
                  goal={goals.daily_calories}
                  unit="kcal"
                  color="#5B8DEF"
                />
                <MacroRing
                  label="Protein"
                  current={proteinG}
                  goal={goals.daily_protein_g}
                  unit="g"
                  color="#22A06B"
                />
                <MacroRing
                  label="KH"
                  current={carbsG}
                  goal={goals.daily_carbs_g}
                  unit="g"
                  color="#E5A93B"
                />
                <MacroRing label="Fett" current={fatG} goal={goals.daily_fat_g} unit="g" color="#E5484D" />
              </View>

              <View style={styles.row}>
                <View style={[styles.field, styles.flex1]}>
                  <ThemedText type="small">Protein (g)</ThemedText>
                  <ThemedTextInput keyboardType="numeric" value={protein} onChangeText={setProtein} />
                </View>
                <View style={[styles.field, styles.flex1]}>
                  <ThemedText type="small">Kohlenhydrate (g)</ThemedText>
                  <ThemedTextInput keyboardType="numeric" value={carbs} onChangeText={setCarbs} />
                </View>
                <View style={[styles.field, styles.flex1]}>
                  <ThemedText type="small">Fett (g)</ThemedText>
                  <ThemedTextInput keyboardType="numeric" value={fat} onChangeText={setFat} />
                </View>
              </View>

              {macroMessage && <ThemedText type="small">{macroMessage}</ThemedText>}

              <View style={styles.row}>
                <Pressable
                  style={({ pressed }) => [styles.saveButton, styles.flex1, pressed && styles.pressed]}
                  disabled={isSavingMacros}
                  onPress={handleSaveMacros}>
                  <ThemedView type="accent" style={styles.saveButtonInner}>
                    <ThemedText type="smallBold" themeColor="accentText">
                      Makros speichern
                    </ThemedText>
                  </ThemedView>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.saveButton, styles.flex1, pressed && styles.pressed]}
                  disabled={isSavingMacros}
                  onPress={handleDeleteMacros}>
                  <ThemedView type="backgroundSelected" style={styles.saveButtonInner}>
                    <ThemedText type="smallBold">Löschen</ThemedText>
                  </ThemedView>
                </Pressable>
              </View>
            </>
          )}
        </ThemedView>

        <TrainingCalendar
          month={calendarMonth}
          completedDates={completedDates}
          selectedDate={selectedDate}
          onSelectDate={(date) => setSelectedDate(date)}
          onChangeMonth={(delta) => setCalendarMonth((current) => addMonths(current, delta))}
        />

        {selectedDate && (
          <ThemedView type="backgroundElement" style={styles.macroCard}>
            <View style={styles.dayDetailHeader}>
              <ThemedText type="smallBold">
                {format(selectedDate, 'EEEE, d. MMMM', { locale: de })}
              </ThemedText>
              <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={() => setSelectedDate(null)}>
                <ThemedText type="small" themeColor="textSecondary">
                  Schließen
                </ThemedText>
              </Pressable>
            </View>

            {selectedDayTrainings.length === 0 &&
              selectedDayRuns.length === 0 &&
              !selectedDayWeight &&
              !selectedDayMacros && (
                <ThemedText type="small" themeColor="textSecondary">
                  Keine Einträge an diesem Tag.
                </ThemedText>
              )}

            {selectedDayTrainings.map((trainingSession) => (
              <View key={trainingSession.id} style={styles.dayDetailItem}>
                <ThemedText type="small">
                  {trainingSession.name}
                  {trainingSession.duration_minutes != null ? ` · ${trainingSession.duration_minutes} min` : ''}
                </ThemedText>
                {trainingSession.session_exercises
                  .slice()
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((sessionExercise) =>
                    sessionExercise.set_entries.length > 0 ? (
                      <View key={sessionExercise.id} style={styles.dayDetailExercise}>
                        <ThemedText type="small">{sessionExercise.exercise?.name}</ThemedText>
                        {sessionExercise.set_entries.map((set, index) => (
                          <ThemedText key={index} type="small" themeColor="textSecondary">
                            Satz {index + 1}: {set.weight_kg > 0 ? `${set.weight_kg} kg × ` : ''}
                            {set.reps} Wdh.
                          </ThemedText>
                        ))}
                      </View>
                    ) : (
                      <ThemedText key={sessionExercise.id} type="small" themeColor="textSecondary">
                        {sessionExercise.exercise?.name}: {sessionExercise.sets} × {sessionExercise.reps}
                        {sessionExercise.weight_kg > 0 ? ` · ${sessionExercise.weight_kg} kg` : ''}
                      </ThemedText>
                    ),
                  )}
              </View>
            ))}

            {selectedDayRuns.map((run) => (
              <View key={run.id} style={styles.dayDetailItem}>
                <ThemedText type="small">Lauf</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {run.distance_km} km · {run.duration_minutes} min
                </ThemedText>
              </View>
            ))}

            {selectedDayWeight && (
              <View style={styles.dayDetailItem}>
                <ThemedText type="small">Gewicht</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {selectedDayWeight.weight_kg} kg
                </ThemedText>
              </View>
            )}

            {selectedDayMacros && (
              <View style={styles.dayDetailItem}>
                <ThemedText type="small">Makros</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {selectedDayCalories} kcal · {selectedDayMacros.protein_g} g Protein ·{' '}
                  {selectedDayMacros.carbs_g} g Kohlenhydrate · {selectedDayMacros.fat_g} g Fett
                </ThemedText>
              </View>
            )}
          </ThemedView>
        )}

        <ChartRangePicker value={chartRangeDays} onChange={setChartRangeDays} />

        <LineChart title="Gewichtsverlauf" series={[{ label: 'Gewicht (kg)', color: '#5B8DEF', values: weightHistory.map((entry) => entry.weight_kg) }]} labels={weightLabels} unit="kg" />

        <LineChart title="Makros (g)" series={macroChartSeries} labels={macroLabels} unit="g" baselineZero />

        <LineChart title="Kalorien (kcal)" series={caloriesChartSeries} labels={macroLabels} unit="kcal" />
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
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.half,
  },
  collapseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepsCard: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.four,
    alignItems: 'center',
  },
  macroCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  field: {
    gap: Spacing.one,
  },
  flex1: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  ringRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: Spacing.three,
  },
  saveButton: {
    borderRadius: Spacing.two,
  },
  saveButtonInner: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  weightHistory: {
    gap: Spacing.one,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayDetailItem: {
    gap: Spacing.half,
  },
  dayDetailExercise: {
    gap: Spacing.half,
  },
});
