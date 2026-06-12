import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { TrainingPlanWithExercises } from '@/types/database';

import type { NewSessionExercise } from './use-training-sessions';

export function useTrainingPlans() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [plans, setPlans] = useState<TrainingPlanWithExercises[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setPlans([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('training_plans')
      .select('*, training_plan_exercises(*, exercise:exercises(*))')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (!error) {
      setPlans(data as unknown as TrainingPlanWithExercises[]);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createPlan(name: string, exercises: NewSessionExercise[]) {
    if (!userId) return 'Nicht angemeldet';

    const { data: newPlan, error: planError } = await supabase
      .from('training_plans')
      .insert({ user_id: userId, name })
      .select()
      .single();
    if (planError || !newPlan) {
      return planError?.message ?? 'Plan konnte nicht gespeichert werden';
    }

    if (exercises.length > 0) {
      const rows = exercises.map((exercise, index) => ({
        plan_id: newPlan.id,
        exercise_id: exercise.exercise_id,
        sets: exercise.set_entries.length,
        reps: exercise.set_entries[0]?.reps ?? 0,
        weight_kg: exercise.set_entries[0]?.weight_kg ?? 0,
        order_index: index,
        set_entries: exercise.set_entries,
      }));
      const { error: exercisesError } = await supabase.from('training_plan_exercises').insert(rows);
      if (exercisesError) {
        return exercisesError.message;
      }
    }

    await refresh();
    return null;
  }

  async function deletePlan(planId: string) {
    if (!userId) return 'Nicht angemeldet';
    const { error } = await supabase.from('training_plans').delete().eq('id', planId);
    if (error) return error.message;
    await refresh();
    return null;
  }

  // Einheit einer Gruppe zuordnen (groupId null = aus der Gruppe entfernen)
  async function setPlanGroup(planId: string, groupId: string | null) {
    if (!userId) return 'Nicht angemeldet';
    const { error } = await supabase.from('training_plans').update({ group_id: groupId }).eq('id', planId);
    if (error) return error.message;
    await refresh();
    return null;
  }

  return { plans, isLoading, createPlan, deletePlan, setPlanGroup, refresh };
}
