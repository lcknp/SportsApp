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
  const { exercises, addExercise, deleteExercise } = useExercises();

  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(null);
  const [showNewExerciseForm, setShowNewExerciseForm] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory>(
    EXERCISE_CATEGORIES[0],
  );
  const [isManaging, setIsManaging] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredExercises = useMemo(
    () =>
      categoryFilter ? exercises.filter((exercise) => exercise.category === categoryFilter) : exercises,
    [exercises, categoryFilter],
  );

  async function handleChipPress(exercise: Exercise) {
    if (!isManaging) {
      onSelect(exercise);
      return;
    }
    if (pendingDeleteId !== exercise.id) {
      setPendingDeleteId(exercise.id);
      return;
    }
    setError(null);
    const message = await deleteExercise(exercise.id);
    setPendingDeleteId(null);
    if (message) setError(message);
  }

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
            onPress={() => handleChipPress(exercise)}>
            <ThemedView type="background" style={styles.chip}>
              <ThemedText type="small" style={isManaging && pendingDeleteId === exercise.id ? styles.deleteText : undefined}>
                {isManaging
                  ? pendingDeleteId === exercise.id
                    ? `Wirklich löschen: ${exercise.name}?`
                    : `✕ ${exercise.name}`
                  : exercise.name}
              </ThemedText>
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
        <Pressable
          style={({ pressed }) => pressed && styles.pressed}
          onPress={() => {
            setIsManaging((current) => !current);
            setPendingDeleteId(null);
          }}>
          <ThemedView type={isManaging ? 'backgroundSelected' : 'background'} style={styles.chip}>
            <ThemedText type="small">{isManaging ? 'Fertig' : 'Übungen löschen'}</ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>

      {isManaging && (
        <ThemedText type="small" themeColor="textSecondary">
          Tippe eine Übung an und bestätige mit einem zweiten Tipp. Achtung: Die Übung wird dabei
          auch aus gespeicherten Trainings und Einheiten entfernt.
        </ThemedText>
      )}

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
  deleteText: {
    color: '#e5484d',
  },
});
