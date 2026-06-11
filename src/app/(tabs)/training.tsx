import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateStepper } from '@/components/date-stepper';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTrainingPlans } from '@/hooks/use-training-plans';
import { useTrainingSessions } from '@/hooks/use-training-sessions';

export default function TrainingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { sessions, deleteSession, updateSession, refresh } = useTrainingSessions();
  const { plans, deletePlan, refresh: refreshPlans } = useTrainingPlans();

  const [isChoosingPlan, setIsChoosingPlan] = useState(false);
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
    await updateSession(editingId, editDate, editDuration.trim() ? Number(editDuration) : null);
    setEditingId(null);
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + BottomTabInset + Spacing.three },
      ]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Training</ThemedText>
        </ThemedView>

        <ThemedView style={styles.actionRow}>
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
        </ThemedView>

        {isChoosingPlan && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Einheit auswählen</ThemedText>
            {plans.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Noch keine Einheiten vorhanden. Erstelle zuerst eine über „+ Training erstellen".
              </ThemedText>
            ) : (
              plans.map((plan) => (
                <ThemedView key={plan.id} style={styles.planRow}>
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
                    onPress={() => deletePlan(plan.id)}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Löschen
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              ))
            )}
          </ThemedView>
        )}

        {sessions.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Noch keine Trainings eingetragen.
          </ThemedText>
        )}

        {sessions.map((trainingSession) => (
          <ThemedView key={trainingSession.id} type="backgroundElement" style={styles.card}>
            <ThemedView style={styles.cardHeader}>
              <ThemedView>
                <ThemedText type="smallBold">{trainingSession.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {format(new Date(trainingSession.date), 'EEEE, d. MMMM', { locale: de })}
                  {trainingSession.duration_minutes != null
                    ? ` · ${trainingSession.duration_minutes} min`
                    : ''}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.cardHeaderActions}>
                <Pressable
                  style={({ pressed }) => pressed && styles.pressed}
                  onPress={() =>
                    editingId === trainingSession.id
                      ? setEditingId(null)
                      : startEditing(trainingSession.id, trainingSession.date, trainingSession.duration_minutes)
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
              </ThemedView>
            </ThemedView>

            {editingId === trainingSession.id && (
              <ThemedView style={styles.editArea}>
                <DateStepper date={editDate} onChange={setEditDate} />
                <ThemedView style={styles.field}>
                  <ThemedText type="small">Dauer (Minuten)</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    keyboardType="numeric"
                    value={editDuration}
                    onChangeText={setEditDuration}
                  />
                </ThemedView>
                <Pressable
                  style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
                  onPress={handleSaveEdit}>
                  <ThemedView type="accent" style={styles.saveButtonInner}>
                    <ThemedText type="smallBold" themeColor="accentText">
                      Speichern
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </ThemedView>
            )}

            {trainingSession.session_exercises.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Keine Übungen eingetragen.
              </ThemedText>
            ) : (
              trainingSession.session_exercises
                .slice()
                .sort((a, b) => a.order_index - b.order_index)
                .map((sessionExercise) => (
                  <ThemedView key={sessionExercise.id} style={styles.exerciseGroup}>
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
                  </ThemedView>
                ))
            )}
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
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderActions: {
    flexDirection: 'row',
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
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
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
