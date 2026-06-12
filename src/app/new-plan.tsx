import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import {
  DEFAULT_DRAFT_SET,
  ExerciseSetList,
  type EditableExercise,
} from '@/components/exercise-set-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTrainingPlans } from '@/hooks/use-training-plans';
import type { Exercise, SetEntry } from '@/types/database';

export default function NewPlanScreen() {
  const theme = useTheme();
  const { createPlan } = useTrainingPlans();

  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function handleSelectExercise(exercise: Exercise) {
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
        set_entries: exercise.sets.map(
          (set): SetEntry => ({
            reps: Number(set.reps) || 0,
            weight_kg: Number(set.weight_kg) || 0,
          }),
        ),
      })),
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

      <ThemedView style={styles.field}>
        <ThemedText type="small">Name der Einheit</ThemedText>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          placeholder="z.B. Oberkörper, Push, Beine …"
          placeholderTextColor={theme.textSecondary}
          value={name}
          onChangeText={setName}
        />
      </ThemedView>

      <ExerciseSetList exercises={exercises} onChange={setExercises} />

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => setIsPickerOpen((current) => !current)}>
        <ThemedView type="accent" style={styles.buttonInner}>
          <ThemedText type="smallBold" themeColor="accentText">
            {isPickerOpen ? '− Übung hinzufügen' : '+ Übung hinzufügen'}
          </ThemedText>
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
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: '#e5484d',
  },
});
