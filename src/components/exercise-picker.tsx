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

// Muskelgruppe(n) einer Übung: target (kommagetrennt) mit Fallback auf die grobe Kategorie.
function muscleGroupsOf(exercise: Exercise): string[] {
  const text = exercise.target?.trim() || exercise.category || 'Sonstiges';
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function ExercisePicker({ onSelect }: ExercisePickerProps) {
  const { exercises, addExercise, updateExercise, deleteExercise } = useExercises();

  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [showNewExerciseForm, setShowNewExerciseForm] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory>(
    EXERCISE_CATEGORIES[0],
  );
  const [newExerciseTarget, setNewExerciseTarget] = useState('');
  const [isManaging, setIsManaging] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isEditingGroups, setIsEditingGroups] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGroupText, setEditGroupText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Die tatsächlich vergebenen Muskelgruppen als Filter (statt der groben Kategorien).
  const muscleGroups = useMemo(() => {
    const set = new Set<string>();
    for (const exercise of exercises) {
      for (const group of muscleGroupsOf(exercise)) set.add(group);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    let list = groupFilter
      ? exercises.filter((exercise) => muscleGroupsOf(exercise).includes(groupFilter))
      : exercises;
    const query = searchText.trim().toLowerCase();
    if (query) {
      list = list.filter((exercise) => exercise.name.toLowerCase().includes(query));
    }
    // Im Verwalten-/Bearbeiten-Modus nur eigene Übungen — Standard-Übungen sind gesperrt.
    if (isManaging || isEditingGroups) {
      list = list.filter((exercise) => exercise.user_id !== null);
    }
    return list;
  }, [exercises, groupFilter, searchText, isManaging, isEditingGroups]);

  async function handleChipPress(exercise: Exercise) {
    if (isEditingGroups) {
      setEditingId(exercise.id);
      setEditGroupText(exercise.target?.trim() ?? '');
      setError(null);
      return;
    }
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

  async function handleSaveGroup() {
    if (!editingId) return;
    setError(null);
    const message = await updateExercise(editingId, { target: editGroupText.trim() || null });
    if (message) {
      setError(message);
      return;
    }
    setEditingId(null);
    setEditGroupText('');
  }

  async function handleCreateExercise() {
    if (!newExerciseName.trim()) return;
    setError(null);
    const { exercise, error: createError } = await addExercise(
      newExerciseName.trim(),
      newExerciseCategory,
      newExerciseTarget,
    );
    if (createError) {
      setError(createError);
      return;
    }
    if (exercise) {
      setShowNewExerciseForm(false);
      setNewExerciseName('');
      setNewExerciseTarget('');
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
        <Chip label="Alle" selected={groupFilter === null} onPress={() => setGroupFilter(null)} />
        {muscleGroups.map((group) => (
          <Chip
            key={group}
            label={group}
            selected={groupFilter === group}
            onPress={() => setGroupFilter(group)}
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
                : isEditingGroups
                  ? `${exercise.name} · ${muscleGroupsOf(exercise).join(', ')}`
                  : exercise.name
            }
            danger={isManaging && pendingDeleteId === exercise.id}
            selected={isEditingGroups && editingId === exercise.id}
            onPress={() => handleChipPress(exercise)}
          />
        ))}
        <Chip
          label="+ Neue Übung"
          selected={showNewExerciseForm}
          onPress={() => setShowNewExerciseForm((current) => !current)}
        />
        <Chip
          label={isEditingGroups ? 'Fertig' : 'Muskelgruppe bearbeiten'}
          selected={isEditingGroups}
          onPress={() => {
            setIsEditingGroups((current) => !current);
            setIsManaging(false);
            setPendingDeleteId(null);
            setEditingId(null);
            setEditGroupText('');
          }}
        />
        <Chip
          label={isManaging ? 'Fertig' : 'Übungen löschen'}
          selected={isManaging}
          onPress={() => {
            setIsManaging((current) => !current);
            setIsEditingGroups(false);
            setEditingId(null);
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

      {isEditingGroups && (
        <ThemedText type="small" themeColor="textSecondary">
          Nur selbst erstellte Übungen lassen sich anpassen. Tippe eine Übung an und ändere ihre
          Muskelgruppe — mehrere mit Komma trennen (z.B. „HAMS, LOWER BACK").
        </ThemedText>
      )}

      {isEditingGroups && editingId && (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Muskelgruppe für „{exercises.find((exercise) => exercise.id === editingId)?.name}"
          </ThemedText>
          <ThemedTextInput
            placeholder="z.B. Sidedelt, Frontdelt, Adductors …"
            value={editGroupText}
            onChangeText={setEditGroupText}
          />
          <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={handleSaveGroup}>
            <ThemedView type="accent" style={styles.buttonInner}>
              <ThemedText type="smallBold" themeColor="accentText">
                Muskelgruppe speichern
              </ThemedText>
            </ThemedView>
          </Pressable>
        </View>
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
          <ThemedTextInput
            placeholder="Muskelgruppe (optional, z.B. Sidedelt) — sonst Kategorie"
            value={newExerciseTarget}
            onChangeText={setNewExerciseTarget}
          />
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
