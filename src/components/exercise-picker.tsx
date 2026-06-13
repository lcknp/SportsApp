import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedTextInput } from './themed-text-input';
import { ThemedView } from './themed-view';

import { EXERCISE_CATEGORIES } from '@/constants/exercise-categories';
import { Spacing } from '@/constants/theme';
import { useExercises } from '@/hooks/use-exercises';
import type { Exercise, ExerciseCategory } from '@/types/database';

type ExercisePickerProps = {
  onSelect: (exercise: Exercise) => void;
};

export function ExercisePicker({ onSelect }: ExercisePickerProps) {
  const { exercises, addExercise, deleteExercise } = useExercises();

  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(null);
  const [showNewExerciseForm, setShowNewExerciseForm] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory>(
    EXERCISE_CATEGORIES[0],
  );
  const [isManaging, setIsManaging] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredExercises = useMemo(() => {
    let list = categoryFilter
      ? exercises.filter((exercise) => exercise.category === categoryFilter)
      : exercises;
    const query = searchText.trim().toLowerCase();
    if (query) {
      list = list.filter((exercise) => exercise.name.toLowerCase().includes(query));
    }
    // Im Verwalten-Modus nur eigene Übungen — Standard-Übungen sind nicht löschbar.
    if (isManaging) {
      list = list.filter((exercise) => exercise.user_id !== null);
    }
    return list;
  }, [exercises, categoryFilter, searchText, isManaging]);

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

  function Chip({ label, selected, danger, onPress }: { label: string; selected?: boolean; danger?: boolean; onPress: () => void }) {
    return (
      <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={onPress}>
        <ThemedView type={selected ? 'accent' : 'backgroundSelected'} style={styles.chip}>
          <ThemedText
            type="small"
            themeColor={selected ? 'accentText' : 'text'}
            style={danger ? styles.deleteText : undefined}>
            {label}
          </ThemedText>
        </ThemedView>
      </Pressable>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.picker}>
      <ThemedTextInput placeholder="Übung suchen …" value={searchText} onChangeText={setSearchText} />

      <View style={styles.chipRow}>
        <Chip label="Alle" selected={categoryFilter === null} onPress={() => setCategoryFilter(null)} />
        {EXERCISE_CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={category}
            selected={categoryFilter === category}
            onPress={() => setCategoryFilter(category)}
          />
        ))}
      </View>

      <View style={styles.chipRow}>
        {filteredExercises.map((exercise) => (
          <Chip
            key={exercise.id}
            label={
              isManaging
                ? pendingDeleteId === exercise.id
                  ? `Wirklich löschen: ${exercise.name}?`
                  : `✕ ${exercise.name}`
                : exercise.name
            }
            danger={isManaging && pendingDeleteId === exercise.id}
            onPress={() => handleChipPress(exercise)}
          />
        ))}
        <Chip
          label="+ Neue Übung"
          selected={showNewExerciseForm}
          onPress={() => setShowNewExerciseForm((current) => !current)}
        />
        <Chip
          label={isManaging ? 'Fertig' : 'Übungen löschen'}
          selected={isManaging}
          onPress={() => {
            setIsManaging((current) => !current);
            setPendingDeleteId(null);
          }}
        />
      </View>

      {isManaging && (
        <ThemedText type="small" themeColor="textSecondary">
          Nur selbst erstellte Übungen werden angezeigt — Standard-Übungen lassen sich nicht
          löschen. Tippe eine Übung an und bestätige mit einem zweiten Tipp. Achtung: Die Übung
          wird dabei auch aus gespeicherten Trainings und Einheiten entfernt.
        </ThemedText>
      )}

      {showNewExerciseForm && (
        <View style={styles.field}>
          <ThemedTextInput
            placeholder="Name der Übung"
            value={newExerciseName}
            onChangeText={setNewExerciseName}
          />
          <View style={styles.chipRow}>
            {EXERCISE_CATEGORIES.map((category) => (
              <Chip
                key={category}
                label={category}
                selected={newExerciseCategory === category}
                onPress={() => setNewExerciseCategory(category)}
              />
            ))}
          </View>
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
        </View>
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
