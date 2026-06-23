import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import {
  DEFAULT_DRAFT_SET,
  ExerciseSetList,
  type EditableExercise,
} from '@/components/exercise-set-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTrainingPlans } from '@/hooks/use-training-plans';
import type { Exercise, SetEntry } from '@/types/database';

export default function NewPlanScreen() {
  const { createPlan } = useTrainingPlans();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    const message = await createPlan(
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Training erstellen
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Stelle eine Trainingseinheit zusammen. Die Einheit kannst du danach jederzeit über
        „Training starten" ausführen.
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
            Einheit speichern
          </ThemedText>
        </ThemedView>
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
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: '#e5484d',
  },
});
