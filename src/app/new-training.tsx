import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import {
  DEFAULT_DRAFT_SET,
  ExerciseSetList,
  type DraftSet,
} from '@/components/exercise-set-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatElapsed, useActiveWorkout } from '@/contexts/active-workout-context';
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
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const { sessions, isLoading: sessionsLoading, createSession } = useTrainingSessions();
  const { plans } = useTrainingPlans();
  const { workout, setWorkout, clearWorkout } = useActiveWorkout();

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [, forceTick] = useState(0);
  // Verhindert, dass der Init-Effekt nach Beenden/Abbrechen ein neues Training anlegt.
  const isClosingRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
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

  // Training starten bzw. fortsetzen: Läuft schon eins (gleiche Einheit), wird es
  // einfach weitergeführt — sonst neu anlegen.
  useEffect(() => {
    if (isClosingRef.current) return;

    if (!planId) {
      if (!workout) {
        setWorkout({ name: 'Training', exercises: [], startedAt: Date.now(), planId: null });
      }
      return;
    }

    if (workout && workout.planId === planId) return;

    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    // Wait for sessions so prefilling can use the latest logged values.
    if (sessionsLoading) return;

    setWorkout({
      name: plan.name,
      startedAt: Date.now(),
      planId,
      exercises: plan.training_plan_exercises
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((planExercise) => {
          const lastEntries = getLastSetEntries(planExercise.exercise_id);
          const entries = lastEntries ?? planExercise.set_entries;
          return {
            exercise_id: planExercise.exercise_id,
            name: planExercise.exercise?.name ?? '',
            video_url: planExercise.exercise?.video_url,
            target: planExercise.exercise?.target,
            sets: entries.length > 0 ? toDraftSets(entries) : [{ ...DEFAULT_DRAFT_SET }],
          };
        }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, plans, sessions, sessionsLoading, workout]);

  function handleSelectExercise(exercise: Exercise) {
    const lastEntries = getLastSetEntries(exercise.id);
    setWorkout(
      (current) =>
        current && {
          ...current,
          exercises: [
            ...current.exercises,
            {
              exercise_id: exercise.id,
              name: exercise.name,
              video_url: exercise.video_url,
              target: exercise.target,
              sets: lastEntries ? toDraftSets(lastEntries) : [{ ...DEFAULT_DRAFT_SET }],
            },
          ],
        },
    );
  }

  async function handleFinish() {
    if (!workout) return;
    setError(null);
    if (workout.exercises.length === 0) {
      setError('Füge mindestens eine Übung hinzu oder brich das Training ab.');
      return;
    }
    setIsSaving(true);
    const message = await createSession(
      new Date(),
      workout.name.trim() || 'Training',
      workout.exercises.map((exercise) => ({
        exercise_id: exercise.exercise_id,
        set_entries: exercise.sets.map(
          (set): SetEntry => ({
            reps: Number(set.reps) || 0,
            weight_kg: Number(set.weight_kg) || 0,
          }),
        ),
      })),
      Math.max(1, Math.round((Date.now() - workout.startedAt) / 60000)),
    );
    setIsSaving(false);
    if (message) {
      setError(message);
      return;
    }
    isClosingRef.current = true;
    clearWorkout();
    router.back();
  }

  function handleCancel() {
    isClosingRef.current = true;
    clearWorkout();
    router.back();
  }

  if (!workout) {
    return null;
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - workout.startedAt) / 1000));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.titleRow}>
        <ThemedText type="title">{workout.name}</ThemedText>
        <ThemedView type="accent" style={styles.timerBadge}>
          <ThemedText type="smallBold" themeColor="accentText">
            ⏱ {formatElapsed(elapsedSeconds)}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={() => router.back()}>
        <ThemedView type="backgroundElement" style={styles.buttonInner}>
          <ThemedText type="smallBold">▾ Minimieren — Training läuft weiter</ThemedText>
        </ThemedView>
      </Pressable>

      <ThemedView style={styles.field}>
        <ThemedText type="small">Name</ThemedText>
        <ThemedTextInput
          value={workout.name}
          onChangeText={(value) => setWorkout((current) => current && { ...current, name: value })}
        />
      </ThemedView>

      {workout.exercises.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Trage bei jedem Satz das Gewicht und die Wiederholungen ein, die du geschafft hast. Beim
          nächsten Training werden sie automatisch vorausgefüllt.
        </ThemedText>
      )}

      <ExerciseSetList
        exercises={workout.exercises}
        onChange={(next) => setWorkout((current) => current && { ...current, exercises: next })}
      />

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => setIsPickerOpen((current) => !current)}>
        <ThemedView type="backgroundElement" style={styles.buttonInner}>
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

      <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={handleCancel}>
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
