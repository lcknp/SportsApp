import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { EXERCISE_CATEGORIES } from '@/constants/exercise-categories';
import { Spacing } from '@/constants/theme';
import { useExercises } from '@/hooks/use-exercises';
import { useTheme } from '@/hooks/use-theme';
import type { Exercise, ExerciseCategory } from '@/types/database';

type ExercisePickerProps = {
  onSelect: (exercise: Exercise) => void;
};

export function ExercisePicker({ onSelect }: ExercisePickerProps) {
  const theme = useTheme();
  const { exercises, addExercise } = useExercises();

  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(null);
  const [showNewExerciseForm, setShowNewExerciseForm] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory>(
    EXERCISE_CATEGORIES[0],
  );
  const [error, setError] = useState<string | null>(null);

  const filteredExercises = useMemo(
    () =>
      categoryFilter ? exercises.filter((exercise) => exercise.category === categoryFilter) : exercises,
    [exercises, categoryFilter],
  );

  async function handleCreateExercise() {
    if (!newExerciseName.trim()) return;
    setError(null);
    const { exercise, error: createError } = await addExercise(
      newExerciseName.trim(),
      newExerciseCategory,
    );
    if (createError) {
      setError(createError);
      return;
    }
    if (exercise) {
      setShowNewExerciseForm(false);
      setNewExerciseName('');
      onSelect(exercise);
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.picker}>
      <ThemedView style={styles.chipRow}>
        <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={() => setCategoryFilter(null)}>
          <ThemedView type={categoryFilter === null ? 'backgroundSelected' : 'background'} style={styles.chip}>
            <ThemedText type="small">Alle</ThemedText>
          </ThemedView>
        </Pressable>
        {EXERCISE_CATEGORIES.map((category) => (
          <Pressable
            key={category}
            style={({ pressed }) => pressed && styles.pressed}
            onPress={() => setCategoryFilter(category)}>
            <ThemedView
              type={categoryFilter === category ? 'backgroundSelected' : 'background'}
              style={styles.chip}>
              <ThemedText type="small">{category}</ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </ThemedView>

      <ThemedView style={styles.chipRow}>
        {filteredExercises.map((exercise) => (
          <Pressable
            key={exercise.id}
            style={({ pressed }) => pressed && styles.pressed}
            onPress={() => onSelect(exercise)}>
            <ThemedView type="background" style={styles.chip}>
              <ThemedText type="small">{exercise.name}</ThemedText>
            </ThemedView>
          </Pressable>
        ))}
        <Pressable
          style={({ pressed }) => pressed && styles.pressed}
          onPress={() => setShowNewExerciseForm((current) => !current)}>
          <ThemedView type={showNewExerciseForm ? 'backgroundSelected' : 'background'} style={styles.chip}>
            <ThemedText type="small">+ Neue Übung</ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>

      {showNewExerciseForm && (
        <ThemedView style={styles.field}>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            placeholder="Name der Übung"
            placeholderTextColor={theme.textSecondary}
            value={newExerciseName}
            onChangeText={setNewExerciseName}
          />
          <ThemedView style={styles.chipRow}>
            {EXERCISE_CATEGORIES.map((category) => (
              <Pressable
                key={category}
                style={({ pressed }) => pressed && styles.pressed}
                onPress={() => setNewExerciseCategory(category)}>
                <ThemedView
                  type={newExerciseCategory === category ? 'backgroundSelected' : 'background'}
                  style={styles.chip}>
                  <ThemedText type="small">{category}</ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </ThemedView>
          <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={handleCreateExercise}>
            <ThemedView type="accent" style={styles.buttonInner}>
              <ThemedText type="smallBold" themeColor="accentText">
                Übung erstellen
              </ThemedText>
            </ThemedView>
          </Pressable>
          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  picker: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
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
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: '#e5484d',
  },
});
