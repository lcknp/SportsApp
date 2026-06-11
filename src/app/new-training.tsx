import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import {
  DEFAULT_DRAFT_SET,
  ExerciseSetList,
  type DraftSet,
  type EditableExercise,
} from '@/components/exercise-set-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTrainingPlans } from '@/hooks/use-training-plans';
import { useTrainingSessions } from '@/hooks/use-training-sessions';
import type { Exercise, SetEntry } from '@/types/database';

function toDraftSets(entries: SetEntry[]): DraftSet[] {
  return entries.map((entry) => ({
    reps: String(entry.reps),
    weight_kg: entry.weight_kg > 0 ? String(entry.weight_kg) : '',
  }));
}

export default function ActiveTrainingScreen() {
  const theme = useTheme();
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const { sessions, isLoading: sessionsLoading, createSession } = useTrainingSessions();
  const { plans } = useTrainingPlans();

  const [name, setName] = useState('Training');
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const appliedPlanRef = useRef<string | null>(null);

  // Tick the workout timer from the moment the screen opens.
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // The freshest data wins: last logged sets for this exercise, then plan targets.
  function getLastSetEntries(exerciseId: string): SetEntry[] | null {
    for (const trainingSession of sessions) {
      const match = trainingSession.session_exercises.find((se) => se.exercise_id === exerciseId);
      if (match && match.set_entries.length > 0) return match.set_entries;
    }
    return null;
  }

  useEffect(() => {
    if (!planId || appliedPlanRef.current === planId) return;
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    // Wait for sessions so prefilling can use the latest logged values.
    if (sessionsLoading) return;
    appliedPlanRef.current = planId;
    setName(plan.name);
    setExercises(
      plan.training_plan_exercises
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((planExercise) => {
          const lastEntries = getLastSetEntries(planExercise.exercise_id);
          const entries = lastEntries ?? planExercise.set_entries;
          return {
            exercise_id: planExercise.exercise_id,
            name: planExercise.exercise?.name ?? '',
            sets: entries.length > 0 ? toDraftSets(entries) : [{ ...DEFAULT_DRAFT_SET }],
          };
        }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, plans, sessions, sessionsLoading]);

  function formatElapsed(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function handleSelectExercise(exercise: Exercise) {
    const lastEntries = getLastSetEntries(exercise.id);
    setExercises((current) => [
      ...current,
      {
        exercise_id: exercise.id,
        name: exercise.name,
        sets: lastEntries ? toDraftSets(lastEntries) : [{ ...DEFAULT_DRAFT_SET }],
      },
    ]);
  }

  async function handleFinish() {
    setError(null);
    if (exercises.length === 0) {
      setError('Füge mindestens eine Übung hinzu oder brich das Training ab.');
      return;
    }
    setIsSaving(true);
    const message = await createSession(
      new Date(),
      name.trim() || 'Training',
      exercises.map((exercise) => ({
        exercise_id: exercise.exercise_id,
        set_entries: exercise.sets.map(
          (set): SetEntry => ({
            reps: Number(set.reps) || 0,
            weight_kg: Number(set.weight_kg) || 0,
          }),
        ),
      })),
      Math.max(1, Math.round(elapsedSeconds / 60)),
    );
    setIsSaving(false);
    if (message) {
      setError(message);
      return;
    }
    router.back();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.titleRow}>
        <ThemedText type="title">{name}</ThemedText>
        <ThemedView type="accent" style={styles.timerBadge}>
          <ThemedText type="smallBold" themeColor="accentText">
            ⏱ {formatElapsed(elapsedSeconds)}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.field}>
        <ThemedText type="small">Name</ThemedText>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          value={name}
          onChangeText={setName}
        />
      </ThemedView>

      {exercises.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Trage bei jedem Satz das Gewicht und die Wiederholungen ein, die du geschafft hast. Beim
          nächsten Training werden sie automatisch vorausgefüllt.
        </ThemedText>
      )}

      <ExerciseSetList exercises={exercises} onChange={setExercises} />

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => setIsPickerOpen((current) => !current)}>
        <ThemedView type="background" style={styles.buttonInner}>
          <ThemedText type="smallBold">{isPickerOpen ? '− Übung hinzufügen' : '+ Übung hinzufügen'}</ThemedText>
        </ThemedView>
      </Pressable>

      {isPickerOpen && <ExercisePicker onSelect={handleSelectExercise} />}

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        disabled={isSaving}
        onPress={handleFinish}>
        <ThemedView type="accent" style={styles.buttonInner}>
          <ThemedText type="smallBold" themeColor="accentText">
            Training beenden & speichern
          </ThemedText>
        </ThemedView>
      </Pressable>

      <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={() => router.back()}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.cancelText}>
          Abbrechen (nichts speichern)
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  timerBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  button: {
    borderRadius: Spacing.two,
  },
  buttonInner: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  cancelText: {
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: '#e5484d',
  },
});
