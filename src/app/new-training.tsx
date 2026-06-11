import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { DateStepper } from '@/components/date-stepper';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EXERCISE_CATEGORIES } from '@/constants/exercise-categories';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useExercises } from '@/hooks/use-exercises';
import { useTheme } from '@/hooks/use-theme';
import { useTrainingPlans } from '@/hooks/use-training-plans';
import { useTrainingSessions, type NewSessionExercise } from '@/hooks/use-training-sessions';
import type {
  Exercise,
  ExerciseCategory,
  SessionExercise,
  SetEntry,
  TrainingPlanWithExercises,
} from '@/types/database';

type AddedExercise = NewSessionExercise & { name: string };
type DraftSet = { reps: string; weight_kg: string };

const DEFAULT_SET: DraftSet = { reps: '10', weight_kg: '' };

export default function NewTrainingScreen() {
  const theme = useTheme();
  const { planId, autostart } = useLocalSearchParams<{ planId?: string; autostart?: string }>();
  const { exercises, addExercise } = useExercises();
  const { sessions, createSession } = useTrainingSessions();
  const { plans, createPlan, deletePlan } = useTrainingPlans();

  const [date, setDate] = useState(new Date());
  const [name, setName] = useState('Training');
  const [addedExercises, setAddedExercises] = useState<AddedExercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appliedPlanRef = useRef<string | null>(null);

  const [planName, setPlanName] = useState('');
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [currentSets, setCurrentSets] = useState<DraftSet[]>([]);

  const [showNewExerciseForm, setShowNewExerciseForm] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory>(
    EXERCISE_CATEGORIES[0],
  );

  const filteredExercises = useMemo(
    () =>
      categoryFilter ? exercises.filter((exercise) => exercise.category === categoryFilter) : exercises,
    [exercises, categoryFilter],
  );

  function getLastPerformance(exerciseId: string): SessionExercise | null {
    for (const trainingSession of sessions) {
      const match = trainingSession.session_exercises.find((se) => se.exercise_id === exerciseId);
      if (match) return match;
    }
    return null;
  }

  function selectExercise(exercise: Exercise) {
    setSelectedExercise(exercise);
    setShowNewExerciseForm(false);
    const last = getLastPerformance(exercise.id);
    if (last && last.set_entries.length > 0) {
      setCurrentSets(
        last.set_entries.map((entry) => ({
          reps: String(entry.reps),
          weight_kg: entry.weight_kg > 0 ? String(entry.weight_kg) : '',
        })),
      );
    } else {
      setCurrentSets([{ ...DEFAULT_SET }]);
    }
  }

  function loadPlan(plan: TrainingPlanWithExercises) {
    setName(plan.name);
    setAddedExercises(
      plan.training_plan_exercises
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((planExercise) => ({
          exercise_id: planExercise.exercise_id,
          name: planExercise.exercise?.name ?? '',
          set_entries: planExercise.set_entries.length > 0 ? planExercise.set_entries : [],
        })),
    );
  }

  useEffect(() => {
    if (!planId || appliedPlanRef.current === planId) return;
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    appliedPlanRef.current = planId;
    loadPlan(plan);
    if (autostart === '1') {
      setIsTimerRunning(true);
    }
  }, [planId, plans, autostart]);

  useEffect(() => {
    if (!isTimerRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTimerRunning]);

  function formatElapsed(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function handleStartTimer() {
    setIsTimerRunning(true);
  }

  function handleStopTimer() {
    setIsTimerRunning(false);
    setDurationMinutes(String(Math.max(1, Math.round(elapsedSeconds / 60))));
  }

  async function handleSavePlan() {
    if (!planName.trim() || addedExercises.length === 0) return;
    setPlanMessage(null);
    setIsSavingPlan(true);
    const message = await createPlan(
      planName.trim(),
      addedExercises.map(({ exercise_id, set_entries }) => ({ exercise_id, set_entries })),
    );
    setIsSavingPlan(false);
    if (message) {
      setPlanMessage(message);
      return;
    }
    setPlanName('');
    setPlanMessage('Plan gespeichert.');
  }

  async function handleCreateExercise() {
    if (!newExerciseName.trim()) return;
    const { exercise, error: createError } = await addExercise(
      newExerciseName.trim(),
      newExerciseCategory,
    );
    if (createError) {
      setError(createError);
      return;
    }
    if (exercise) {
      selectExercise(exercise);
      setShowNewExerciseForm(false);
      setNewExerciseName('');
    }
  }

  function updateSetField(index: number, field: keyof DraftSet, value: string) {
    setCurrentSets((current) =>
      current.map((set, i) => (i === index ? { ...set, [field]: value } : set)),
    );
  }

  function addSetRow() {
    setCurrentSets((current) => {
      const last = current[current.length - 1];
      return [...current, last ? { ...last } : { ...DEFAULT_SET }];
    });
  }

  function removeSetRow(index: number) {
    setCurrentSets((current) => current.filter((_, i) => i !== index));
  }

  function handleAddToSession() {
    if (!selectedExercise || currentSets.length === 0) return;
    const setEntries: SetEntry[] = currentSets.map((set) => ({
      reps: Number(set.reps) || 0,
      weight_kg: Number(set.weight_kg) || 0,
    }));
    setAddedExercises((current) => [
      ...current,
      {
        exercise_id: selectedExercise.id,
        name: selectedExercise.name,
        set_entries: setEntries,
      },
    ]);
    setSelectedExercise(null);
    setCurrentSets([]);
  }

  function removeExercise(index: number) {
    setAddedExercises((current) => current.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    if (isTimerRunning) {
      setIsTimerRunning(false);
    }
    const message = await createSession(
      date,
      name.trim() || 'Training',
      addedExercises.map(({ exercise_id, set_entries }) => ({ exercise_id, set_entries })),
      durationMinutes.trim() ? Number(durationMinutes) : null,
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
        Training eintragen
      </ThemedText>

      <DateStepper date={date} onChange={setDate} />

      <ThemedView type="backgroundElement" style={styles.timerCard}>
        <ThemedText type="smallBold">Zeit</ThemedText>
        <ThemedView style={styles.row}>
          <ThemedText type="title" style={styles.flex1}>
            {formatElapsed(elapsedSeconds)}
          </ThemedText>
          {isTimerRunning ? (
            <Pressable
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
              onPress={handleStopTimer}>
              <ThemedView type="background" style={styles.saveButtonInner}>
                <ThemedText type="smallBold">Stoppen</ThemedText>
              </ThemedView>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
              onPress={handleStartTimer}>
              <ThemedView type="accent" style={styles.saveButtonInner}>
                <ThemedText type="smallBold" themeColor="accentText">
                  Training starten
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}
        </ThemedView>
        <ThemedView style={styles.field}>
          <ThemedText type="small">Dauer (Minuten)</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            keyboardType="numeric"
            value={durationMinutes}
            onChangeText={setDurationMinutes}
          />
        </ThemedView>
      </ThemedView>

      {plans.length > 0 && (
        <ThemedView style={styles.field}>
          <ThemedText type="smallBold">Trainingsplan laden</ThemedText>
          <ThemedView style={styles.chipRow}>
            {plans.map((plan) => (
              <ThemedView key={plan.id} style={styles.planChipRow}>
                <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={() => loadPlan(plan)}>
                  <ThemedView type="background" style={styles.chip}>
                    <ThemedText type="small">{plan.name}</ThemedText>
                  </ThemedView>
                </Pressable>
                <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={() => deletePlan(plan.id)}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Löschen
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ))}
          </ThemedView>
        </ThemedView>
      )}

      <ThemedView style={styles.field}>
        <ThemedText type="small">Name</ThemedText>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          value={name}
          onChangeText={setName}
        />
      </ThemedView>

      {addedExercises.length > 0 && (
        <ThemedView style={styles.field}>
          <ThemedText type="smallBold">Übungen in diesem Training</ThemedText>
          {addedExercises.map((exercise, index) => (
            <ThemedView key={`${exercise.exercise_id}-${index}`} type="backgroundElement" style={styles.addedRow}>
              <ThemedView style={styles.addedRowHeader}>
                <ThemedText type="small">{exercise.name}</ThemedText>
                <Pressable
                  style={({ pressed }) => pressed && styles.pressed}
                  onPress={() => removeExercise(index)}>
                  <ThemedText type="smallBold">Entfernen</ThemedText>
                </Pressable>
              </ThemedView>
              {exercise.set_entries.map((set, setIndex) => (
                <ThemedText key={setIndex} type="small" themeColor="textSecondary">
                  Satz {setIndex + 1}: {set.weight_kg > 0 ? `${set.weight_kg} kg × ` : ''}
                  {set.reps} Wdh.
                </ThemedText>
              ))}
            </ThemedView>
          ))}

          <ThemedView style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex1, { color: theme.text, borderColor: theme.backgroundSelected }]}
              placeholder="Name für Trainingsplan (z.B. Oberkörper)"
              placeholderTextColor={theme.textSecondary}
              value={planName}
              onChangeText={setPlanName}
            />
            <Pressable
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
              disabled={isSavingPlan}
              onPress={handleSavePlan}>
              <ThemedView type="background" style={styles.saveButtonInner}>
                <ThemedText type="smallBold">Als Plan speichern</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
          {planMessage && <ThemedText type="small">{planMessage}</ThemedText>}
        </ThemedView>
      )}

      <Pressable
        style={({ pressed }) => [styles.addExerciseButton, pressed && styles.pressed]}
        onPress={() => setIsPickerOpen((current) => !current)}>
        <ThemedView type="accent" style={styles.addExerciseButtonInner}>
          <ThemedText type="smallBold" themeColor="accentText">
            {isPickerOpen ? '− Übung hinzufügen' : '+ Übung hinzufügen'}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {isPickerOpen && (
        <ThemedView type="backgroundElement" style={styles.exercisePicker}>
          <ThemedView style={styles.chipRow}>
            <Pressable
              style={({ pressed }) => pressed && styles.pressed}
              onPress={() => setCategoryFilter(null)}>
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
                onPress={() => selectExercise(exercise)}>
                <ThemedView
                  type={selectedExercise?.id === exercise.id ? 'backgroundSelected' : 'background'}
                  style={styles.chip}>
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
              <Pressable
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
                onPress={handleCreateExercise}>
                <ThemedView type="accent" style={styles.saveButtonInner}>
                  <ThemedText type="smallBold" themeColor="accentText">
                    Übung erstellen
                  </ThemedText>
                </ThemedView>
              </Pressable>
            </ThemedView>
          )}

          {selectedExercise && (
            <ThemedView style={styles.field}>
              <ThemedText type="smallBold">{selectedExercise.name}</ThemedText>

              {currentSets.map((set, index) => {
                const last = getLastPerformance(selectedExercise.id);
                const lastSet = last?.set_entries[index];
                return (
                  <ThemedView key={index} style={styles.setRow}>
                    <ThemedView style={styles.setIndexBadge}>
                      <ThemedText type="smallBold">{index + 1}</ThemedText>
                    </ThemedView>
                    <ThemedView style={[styles.field, styles.flex1]}>
                      <ThemedText type="small">
                        {lastSet ? `kg (zuletzt ${lastSet.weight_kg})` : 'kg'}
                      </ThemedText>
                      <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                        keyboardType="numeric"
                        value={set.weight_kg}
                        onChangeText={(value) => updateSetField(index, 'weight_kg', value)}
                      />
                    </ThemedView>
                    <ThemedView style={[styles.field, styles.flex1]}>
                      <ThemedText type="small">
                        {lastSet ? `Wdh. (zuletzt ${lastSet.reps})` : 'Wdh.'}
                      </ThemedText>
                      <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                        keyboardType="numeric"
                        value={set.reps}
                        onChangeText={(value) => updateSetField(index, 'reps', value)}
                      />
                    </ThemedView>
                    <Pressable
                      style={({ pressed }) => [styles.removeSetButton, pressed && styles.pressed]}
                      onPress={() => removeSetRow(index)}>
                      <ThemedText type="smallBold">✕</ThemedText>
                    </Pressable>
                  </ThemedView>
                );
              })}

              <Pressable
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
                onPress={addSetRow}>
                <ThemedView type="background" style={styles.saveButtonInner}>
                  <ThemedText type="smallBold">+ Satz hinzufügen</ThemedText>
                </ThemedView>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
                onPress={handleAddToSession}>
                <ThemedView type="accent" style={styles.saveButtonInner}>
                  <ThemedText type="smallBold" themeColor="accentText">
                    Zum Training hinzufügen
                  </ThemedText>
                </ThemedView>
              </Pressable>
            </ThemedView>
          )}
        </ThemedView>
      )}

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <Pressable
        style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        disabled={isSaving}
        onPress={handleSave}>
        <ThemedView type="accent" style={styles.saveButtonInner}>
          <ThemedText type="smallBold" themeColor="accentText">
            Training speichern
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
  timerCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  planChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex1: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  exercisePicker: {
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
  addedRow: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  addedRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addExerciseButton: {
    borderRadius: Spacing.three,
  },
  addExerciseButtonInner: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
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
  saveButton: {
    marginTop: Spacing.two,
    borderRadius: Spacing.two,
  },
  saveButtonInner: {
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
