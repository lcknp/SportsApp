import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarBadge } from '@/components/calendar-badge';
import { DateStepper } from '@/components/date-stepper';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { groupByMonth } from '@/lib/month-groups';
import { parseDecimal } from '@/lib/numbers';
import { useTrainingPlans } from '@/hooks/use-training-plans';
import { useTrainingSessions } from '@/hooks/use-training-sessions';

export default function TrainingScreen() {
  const insets = useSafeAreaInsets();
  const { sessions, deleteSession, updateSession, refresh } = useTrainingSessions();
  const { plans, deletePlan, refresh: refreshPlans } = useTrainingPlans();

  const [isChoosingPlan, setIsChoosingPlan] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState(new Date());
  const [editDuration, setEditDuration] = useState('');

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshPlans();
    }, [refresh, refreshPlans]),
  );

  function startEditing(sessionId: string, date: string, durationMinutes: number | null) {
    setEditingId(sessionId);
    setEditDate(new Date(date));
    setEditDuration(durationMinutes != null ? String(durationMinutes) : '');
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    await updateSession(editingId, editDate, editDuration.trim() ? parseDecimal(editDuration) : null);
    setEditingId(null);
  }

  const monthGroups = groupByMonth(sessions, (trainingSession) => trainingSession.date);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + BottomTabInset + Spacing.six },
      ]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Training</ThemedText>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            onPress={() => setIsChoosingPlan((current) => !current)}>
            <ThemedView type="accent" style={styles.actionButtonInner}>
              <ThemedText type="smallBold" themeColor="accentText">
                ▶ Training starten
              </ThemedText>
            </ThemedView>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            onPress={() => router.push('/new-plan')}>
            <ThemedView type="backgroundElement" style={styles.actionButtonInner}>
              <ThemedText type="smallBold">+ Training erstellen</ThemedText>
            </ThemedView>
          </Pressable>
        </View>

        <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={() => router.push('/volume')}>
          <ThemedText type="link" themeColor="textSecondary" style={styles.volumeLink}>
            📊 Volumen-Übersicht & Gruppen
          </ThemedText>
        </Pressable>

        {isChoosingPlan && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Einheit auswählen</ThemedText>
            {plans.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Noch keine Einheiten vorhanden. Erstelle zuerst eine über „+ Training erstellen".
              </ThemedText>
            ) : (
              plans.map((plan) => (
                <View key={plan.id} style={styles.planRow}>
                  <Pressable
                    style={({ pressed }) => [styles.planStart, pressed && styles.pressed]}
                    onPress={() => {
                      setIsChoosingPlan(false);
                      router.push(`/new-training?planId=${plan.id}`);
                    }}>
                    <ThemedView type="accent" style={styles.planChip}>
                      <ThemedText type="smallBold" themeColor="accentText">
                        {plan.name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="accentText">
                        {plan.training_plan_exercises.length}{' '}
                        {plan.training_plan_exercises.length === 1 ? 'Übung' : 'Übungen'} · starten
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => pressed && styles.pressed}
                    onPress={() => {
                      setIsChoosingPlan(false);
                      router.push(`/edit-plan?planId=${plan.id}`);
                    }}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Bearbeiten
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => pressed && styles.pressed}
                    onPress={() => deletePlan(plan.id)}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Löschen
                    </ThemedText>
                  </Pressable>
                </View>
              ))
            )}
          </ThemedView>
        )}

        {sessions.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Noch keine Trainings eingetragen.
          </ThemedText>
        )}

        {monthGroups.map((group) => (
          <ThemedView key={group.label} style={styles.monthGroup}>
            <View style={styles.monthHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {group.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {group.items.length} {group.items.length === 1 ? 'Workout' : 'Workouts'}
              </ThemedText>
            </View>

            {group.items.map((trainingSession) => {
              const isExpanded = expandedId === trainingSession.id;
              const sortedExercises = trainingSession.session_exercises
                .slice()
                .sort((a, b) => a.order_index - b.order_index);
              return (
                <Pressable
                  key={trainingSession.id}
                  style={({ pressed }) => pressed && styles.pressed}
                  onPress={() => {
                    setExpandedId(isExpanded ? null : trainingSession.id);
                    if (isExpanded) setEditingId(null);
                  }}>
                  <ThemedView type="backgroundElement" style={styles.card}>
                    <View style={styles.logRow}>
                      <CalendarBadge date={new Date(trainingSession.date)} />
                      <View style={styles.logBody}>
                        <ThemedText type="smallBold">{trainingSession.name}</ThemedText>
                        {sortedExercises.length === 0 ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            Keine Übungen eingetragen.
                          </ThemedText>
                        ) : (
                          sortedExercises.map((sessionExercise) => (
                            <ThemedText key={sessionExercise.id} type="small" themeColor="textSecondary">
                              {sessionExercise.set_entries.length || sessionExercise.sets}x{' '}
                              {sessionExercise.exercise?.name}
                            </ThemedText>
                          ))
                        )}
                      </View>
                      {trainingSession.duration_minutes != null && (
                        <ThemedText type="small" themeColor="textSecondary">
                          {trainingSession.duration_minutes} min
                        </ThemedText>
                      )}
                    </View>

                    {isExpanded && (
                      <View style={styles.detailArea}>
                        {sortedExercises.map((sessionExercise) => (
                          <View key={sessionExercise.id} style={styles.exerciseGroup}>
                            <ThemedText type="small">{sessionExercise.exercise?.name}</ThemedText>
                            {sessionExercise.set_entries.length > 0 ? (
                              sessionExercise.set_entries.map((set, index) => (
                                <ThemedText key={index} type="small" themeColor="textSecondary">
                                  Satz {index + 1}: {set.weight_kg > 0 ? `${set.weight_kg} kg × ` : ''}
                                  {set.reps} Wdh.
                                </ThemedText>
                              ))
                            ) : (
                              <ThemedText type="small" themeColor="textSecondary">
                                {sessionExercise.sets} × {sessionExercise.reps}
                                {sessionExercise.weight_kg > 0 ? ` · ${sessionExercise.weight_kg} kg` : ''}
                              </ThemedText>
                            )}
                          </View>
                        ))}

                        <View style={styles.detailActions}>
                          <Pressable
                            style={({ pressed }) => pressed && styles.pressed}
                            onPress={() =>
                              editingId === trainingSession.id
                                ? setEditingId(null)
                                : startEditing(
                                    trainingSession.id,
                                    trainingSession.date,
                                    trainingSession.duration_minutes,
                                  )
                            }>
                            <ThemedText type="small" themeColor="textSecondary">
                              {editingId === trainingSession.id ? 'Abbrechen' : 'Bearbeiten'}
                            </ThemedText>
                          </Pressable>
                          <Pressable
                            style={({ pressed }) => pressed && styles.pressed}
                            onPress={() => deleteSession(trainingSession.id)}>
                            <ThemedText type="small" themeColor="textSecondary">
                              Löschen
                            </ThemedText>
                          </Pressable>
                        </View>

                        {editingId === trainingSession.id && (
                          <View style={styles.editArea}>
                            <DateStepper date={editDate} onChange={setEditDate} />
                            <View style={styles.field}>
                              <ThemedText type="small">Dauer (Minuten)</ThemedText>
                              <ThemedTextInput
                                keyboardType="decimal-pad"
                                value={editDuration}
                                onChangeText={setEditDuration}
                              />
                            </View>
                            <Pressable
                              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
                              onPress={handleSaveEdit}>
                              <ThemedView type="accent" style={styles.saveButtonInner}>
                                <ThemedText type="smallBold" themeColor="accentText">
                                  Speichern
                                </ThemedText>
                              </ThemedView>
                            </Pressable>
                          </View>
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
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    borderRadius: Spacing.three,
  },
  actionButtonInner: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  planStart: {
    flex: 1,
    borderRadius: Spacing.three,
  },
  volumeLink: {
    textAlign: 'center',
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
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  logRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  logBody: {
    flex: 1,
    gap: Spacing.half,
  },
  detailArea: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
  },
  planChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  editArea: {
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  saveButton: {
    borderRadius: Spacing.two,
  },
  saveButtonInner: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  exerciseGroup: {
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
