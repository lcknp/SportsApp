import { Pressable, StyleSheet, View } from 'react-native';

import { ExerciseVideoButton } from './exercise-video';
import { ThemedText } from './themed-text';
import { ThemedTextInput } from './themed-text-input';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';

export type DraftSet = { reps: string; weight_kg: string };

export type EditableExercise = {
  exercise_id: string;
  name: string;
  video_url?: string | null;
  target?: string | null;
  sets: DraftSet[];
  notes?: string;
};

export const DEFAULT_DRAFT_SET: DraftSet = { reps: '10', weight_kg: '' };

type ExerciseSetListProps = {
  exercises: EditableExercise[];
  onChange: (exercises: EditableExercise[]) => void;
  /** Notiz-Feld pro Übung anzeigen (z.B. beim Bearbeiten einer Einheit). */
  showNotes?: boolean;
};

export function ExerciseSetList({ exercises, onChange, showNotes = false }: ExerciseSetListProps) {
  function moveExercise(exerciseIndex: number, direction: -1 | 1) {
    const target = exerciseIndex + direction;
    if (target < 0 || target >= exercises.length) return;
    const next = exercises.slice();
    [next[exerciseIndex], next[target]] = [next[target], next[exerciseIndex]];
    onChange(next);
  }

  function updateNotes(exerciseIndex: number, value: string) {
    onChange(exercises.map((exercise, i) => (i === exerciseIndex ? { ...exercise, notes: value } : exercise)));
  }

  function updateSetField(exerciseIndex: number, setIndex: number, field: keyof DraftSet, value: string) {
    onChange(
      exercises.map((exercise, i) =>
        i === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, j) => (j === setIndex ? { ...set, [field]: value } : set)),
            }
          : exercise,
      ),
    );
  }

  function addSetRow(exerciseIndex: number) {
    onChange(
      exercises.map((exercise, i) => {
        if (i !== exerciseIndex) return exercise;
        const last = exercise.sets[exercise.sets.length - 1];
        return { ...exercise, sets: [...exercise.sets, last ? { ...last } : { ...DEFAULT_DRAFT_SET }] };
      }),
    );
  }

  function removeSetRow(exerciseIndex: number, setIndex: number) {
    onChange(
      exercises.map((exercise, i) =>
        i === exerciseIndex
          ? { ...exercise, sets: exercise.sets.filter((_, j) => j !== setIndex) }
          : exercise,
      ),
    );
  }

  function removeExercise(exerciseIndex: number) {
    onChange(exercises.filter((_, i) => i !== exerciseIndex));
  }

  return (
    <>
      {exercises.map((exercise, exerciseIndex) => (
        <ThemedView key={`${exercise.exercise_id}-${exerciseIndex}`} type="backgroundElement" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitle}>
              <ThemedText type="smallBold">{exercise.name}</ThemedText>
              {exercise.target ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {exercise.target}
                </ThemedText>
              ) : null}
            </View>
            <View style={styles.cardActions}>
              {exercise.video_url ? <ExerciseVideoButton url={exercise.video_url} /> : null}
              <Pressable
                disabled={exerciseIndex === 0}
                style={({ pressed }) => [styles.moveButton, pressed && styles.pressed]}
                onPress={() => moveExercise(exerciseIndex, -1)}>
                <ThemedText type="smallBold" themeColor={exerciseIndex === 0 ? 'textSecondary' : 'text'}>
                  ↑
                </ThemedText>
              </Pressable>
              <Pressable
                disabled={exerciseIndex === exercises.length - 1}
                style={({ pressed }) => [styles.moveButton, pressed && styles.pressed]}
                onPress={() => moveExercise(exerciseIndex, 1)}>
                <ThemedText
                  type="smallBold"
                  themeColor={exerciseIndex === exercises.length - 1 ? 'textSecondary' : 'text'}>
                  ↓
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => pressed && styles.pressed}
                onPress={() => removeExercise(exerciseIndex)}>
                <ThemedText type="small" themeColor="textSecondary">
                  Entfernen
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {exercise.sets.map((set, setIndex) => (
            <View key={setIndex} style={styles.setRow}>
              <View style={styles.setIndexBadge}>
                <ThemedText type="smallBold">{setIndex + 1}</ThemedText>
              </View>
              <View style={[styles.field, styles.flex1]}>
                <ThemedText type="small">kg</ThemedText>
                <ThemedTextInput
                  keyboardType="numeric"
                  value={set.weight_kg}
                  onChangeText={(value) => updateSetField(exerciseIndex, setIndex, 'weight_kg', value)}
                />
              </View>
              <View style={[styles.field, styles.flex1]}>
                <ThemedText type="small">Wdh.</ThemedText>
                <ThemedTextInput
                  keyboardType="numeric"
                  value={set.reps}
                  onChangeText={(value) => updateSetField(exerciseIndex, setIndex, 'reps', value)}
                />
              </View>
              <Pressable
                style={({ pressed }) => [styles.removeSetButton, pressed && styles.pressed]}
                onPress={() => removeSetRow(exerciseIndex, setIndex)}>
                <ThemedText type="smallBold">✕</ThemedText>
              </Pressable>
            </View>
          ))}

          <Pressable
            style={({ pressed }) => [styles.addSetButton, pressed && styles.pressed]}
            onPress={() => addSetRow(exerciseIndex)}>
            <ThemedView type="backgroundSelected" style={styles.addSetButtonInner}>
              <ThemedText type="smallBold">+ Satz hinzufügen</ThemedText>
            </ThemedView>
          </Pressable>

          {showNotes && (
            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Notiz zur Übung
              </ThemedText>
              <ThemedTextInput
                placeholder="z.B. Sitz auf Stufe 4, langsam ablassen …"
                multiline
                value={exercise.notes ?? ''}
                onChangeText={(value) => updateNotes(exerciseIndex, value)}
                style={styles.notesInput}
              />
            </View>
          )}
        </ThemedView>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardTitle: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  setIndexBadge: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeSetButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesInput: {
    minHeight: 64,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  flex1: {
    flex: 1,
  },
  addSetButton: {
    borderRadius: Spacing.two,
  },
  addSetButtonInner: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
