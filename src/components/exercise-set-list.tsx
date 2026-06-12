import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ExerciseVideoButton } from './exercise-video';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DraftSet = { reps: string; weight_kg: string };

export type EditableExercise = {
  exercise_id: string;
  name: string;
  video_url?: string | null;
  target?: string | null;
  sets: DraftSet[];
};

export const DEFAULT_DRAFT_SET: DraftSet = { reps: '10', weight_kg: '' };

type ExerciseSetListProps = {
  exercises: EditableExercise[];
  onChange: (exercises: EditableExercise[]) => void;
};

export function ExerciseSetList({ exercises, onChange }: ExerciseSetListProps) {
  const theme = useTheme();

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
          <ThemedView style={styles.cardHeader}>
            <ThemedView style={styles.cardTitle}>
              <ThemedText type="smallBold">{exercise.name}</ThemedText>
              {exercise.target ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {exercise.target}
                </ThemedText>
              ) : null}
            </ThemedView>
            <ThemedView style={styles.cardActions}>
              {exercise.video_url ? <ExerciseVideoButton url={exercise.video_url} /> : null}
              <Pressable
                style={({ pressed }) => pressed && styles.pressed}
                onPress={() => removeExercise(exerciseIndex)}>
                <ThemedText type="small" themeColor="textSecondary">
                  Entfernen
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>

          {exercise.sets.map((set, setIndex) => (
            <ThemedView key={setIndex} style={styles.setRow}>
              <ThemedView style={styles.setIndexBadge}>
                <ThemedText type="smallBold">{setIndex + 1}</ThemedText>
              </ThemedView>
              <ThemedView style={[styles.field, styles.flex1]}>
                <ThemedText type="small">kg</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  keyboardType="numeric"
                  value={set.weight_kg}
                  onChangeText={(value) => updateSetField(exerciseIndex, setIndex, 'weight_kg', value)}
                />
              </ThemedView>
              <ThemedView style={[styles.field, styles.flex1]}>
                <ThemedText type="small">Wdh.</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  keyboardType="numeric"
                  value={set.reps}
                  onChangeText={(value) => updateSetField(exerciseIndex, setIndex, 'reps', value)}
                />
              </ThemedView>
              <Pressable
                style={({ pressed }) => [styles.removeSetButton, pressed && styles.pressed]}
                onPress={() => removeSetRow(exerciseIndex, setIndex)}>
                <ThemedText type="smallBold">✕</ThemedText>
              </Pressable>
            </ThemedView>
          ))}

          <Pressable
            style={({ pressed }) => [styles.addSetButton, pressed && styles.pressed]}
            onPress={() => addSetRow(exerciseIndex)}>
            <ThemedView type="background" style={styles.addSetButtonInner}>
              <ThemedText type="smallBold">+ Satz hinzufügen</ThemedText>
            </ThemedView>
          </Pressable>
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
  field: {
    gap: Spacing.one,
  },
  flex1: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
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
