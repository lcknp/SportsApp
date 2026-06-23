import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import {
  DEFAULT_DRAFT_SET,
  ExerciseSetList,
  type DraftSet,
  type EditableExercise,
} from '@/components/exercise-set-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTrainingPlans } from '@/hooks/use-training-plans';
import type { Exercise, SetEntry } from '@/types/database';

function toDraftSets(entries: SetEntry[]): DraftSet[] {
  if (entries.length === 0) return [{ ...DEFAULT_DRAFT_SET }];
  return entries.map((entry) => ({
    reps: String(entry.reps),
    weight_kg: entry.weight_kg > 0 ? String(entry.weight_kg) : '',
  }));
}

export default function EditPlanScreen() {
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const { plans, updatePlan } = useTrainingPlans();
  const plan = plans.find((p) => p.id === planId);

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Einmalig vorbefüllen, sobald die Einheit geladen ist.
  useEffect(() => {
    if (isInitialized || !plan) return;
    setName(plan.name);
    setNotes(plan.notes ?? '');
    setExercises(
      plan.training_plan_exercises
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((planExercise) => ({
          exercise_id: planExercise.exercise_id,
          name: planExercise.exercise?.name ?? '',
          video_url: planExercise.exercise?.video_url,
          target: planExercise.exercise?.target,
          sets: toDraftSets(planExercise.set_entries),
          notes: planExercise.notes ?? '',
        })),
    );
    setIsInitialized(true);
  }, [plan, isInitialized]);

  function handleSelectExercise(exercise: Exercise) {
    // Ersetzen-Modus: nur die Übung tauschen, Sätze/Notiz/Position behalten.
    if (replacingIndex !== null) {
      setExercises((current) =>
        current.map((item, i) =>
          i === replacingIndex
            ? {
                ...item,
                exercise_id: exercise.id,
                name: exercise.name,
                video_url: exercise.video_url,
                target: exercise.target,
              }
            : item,
        ),
      );
      setReplacingIndex(null);
      setIsPickerOpen(false);
      return;
    }
    setExercises((current) => [
      ...current,
      {
        exercise_id: exercise.id,
        name: exercise.name,
        video_url: exercise.video_url,
        target: exercise.target,
        sets: [{ ...DEFAULT_DRAFT_SET }, { ...DEFAULT_DRAFT_SET }, { ...DEFAULT_DRAFT_SET }],
      },
    ]);
  }

  async function handleSave() {
    if (!planId) return;
    setError(null);
    if (!name.trim()) {
      setError('Bitte gib der Einheit einen Namen.');
      return;
    }
    if (exercises.length === 0) {
      setError('Füge mindestens eine Übung hinzu.');
      return;
    }
    setIsSaving(true);
    const message = await updatePlan(
      planId,
      name.trim(),
      exercises.map((exercise) => ({
        exercise_id: exercise.exercise_id,
        notes: exercise.notes ?? null,
        set_entries: exercise.sets.map(
          (set): SetEntry => ({
            reps: Number(set.reps) || 0,
            weight_kg: Number(set.weight_kg) || 0,
          }),
        ),
      })),
      notes,
    );
    setIsSaving(false);
    if (message) {
      setError(message);
      return;
    }
    router.back();
  }

  if (!plan && !isInitialized) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="small" themeColor="textSecondary">
          Einheit wird geladen …
        </ThemedText>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Einheit bearbeiten
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Ändere Übungen, Sätze, Reihenfolge und Notizen. Bestehende Trainings bleiben unverändert — die
        Änderung gilt für künftige Trainings mit dieser Einheit.
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="small">Name der Einheit</ThemedText>
        <ThemedTextInput placeholder="z.B. Oberkörper, Push, Beine …" value={name} onChangeText={setName} />
      </View>

      <View style={styles.field}>
        <ThemedText type="small">Notiz (optional)</ThemedText>
        <ThemedTextInput
          placeholder="Allgemeine Notiz zur Einheit …"
          multiline
          value={notes}
          onChangeText={setNotes}
          style={styles.notesInput}
        />
      </View>

      <ExerciseSetList
        exercises={exercises}
        onChange={setExercises}
        showNotes
        onReplaceExercise={(index) => {
          setReplacingIndex(index);
          setIsPickerOpen(true);
        }}
      />

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => {
          setReplacingIndex(null);
          setIsPickerOpen((current) => !current);
        }}>
        <ThemedView type="accent" style={styles.buttonInner}>
          <ThemedText type="smallBold" themeColor="accentText">
            {isPickerOpen ? '− Übung hinzufügen' : '+ Übung hinzufügen'}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {isPickerOpen && (
        <>
          {replacingIndex !== null && (
            <ThemedText type="small" themeColor="textSecondary">
              Übung zum Ersetzen auswählen …
            </ThemedText>
          )}
          <ExercisePicker onSelect={handleSelectExercise} />
        </>
      )}

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        disabled={isSaving}
        onPress={handleSave}>
        <ThemedView type="accent" style={styles.buttonInner}>
          <ThemedText type="smallBold" themeColor="accentText">
            Änderungen speichern
          </ThemedText>
        </ThemedView>
      </Pressable>

      <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={() => router.back()}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.cancelText}>
          Abbrechen
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
  title: {
    marginBottom: Spacing.two,
  },
  field: {
    gap: Spacing.two,
  },
  notesInput: {
    minHeight: 64,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
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
