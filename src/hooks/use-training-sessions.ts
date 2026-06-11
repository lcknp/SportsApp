import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { SetEntry, TrainingSession } from '@/types/database';

const DATE_FORMAT = 'yyyy-MM-dd';

export type NewSessionExercise = {
  exercise_id: string;
  set_entries: SetEntry[];
};

export function useTrainingSessions() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSessions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*, session_exercises(*, exercise:exercises(*))')
      .eq('user_id', userId)
      .neq('name', 'Lauf')
      .order('date', { ascending: false });
    if (!error) {
      setSessions(data as unknown as TrainingSession[]);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createSession(
    date: Date,
    name: string,
    exercises: NewSessionExercise[],
    durationMinutes?: number | null,
  ) {
    if (!userId) return 'Nicht angemeldet';

    const { data: newSession, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        date: format(date, DATE_FORMAT),
        name,
        completed: true,
        duration_minutes: durationMinutes ?? null,
      })
      .select()
      .single();
    if (sessionError || !newSession) {
      return sessionError?.message ?? 'Training konnte nicht gespeichert werden';
    }

    if (exercises.length > 0) {
      const rows = exercises.map((exercise, index) => ({
        session_id: newSession.id,
        exercise_id: exercise.exercise_id,
        sets: exercise.set_entries.length,
        reps: exercise.set_entries[0]?.reps ?? 0,
        weight_kg: exercise.set_entries[0]?.weight_kg ?? 0,
        order_index: index,
        set_entries: exercise.set_entries,
      }));
      const { error: exercisesError } = await supabase.from('session_exercises').insert(rows);
      if (exercisesError) {
        return exercisesError.message;
      }
    }

    await refresh();
    return null;
  }

  async function deleteSession(id: string) {
    if (!userId) return 'Nicht angemeldet';
    const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
    if (error) return error.message;
    await refresh();
    return null;
  }

  async function updateSession(id: string, date: Date, durationMinutes: number | null) {
    if (!userId) return 'Nicht angemeldet';
    const { error } = await supabase
      .from('workout_sessions')
      .update({ date: format(date, DATE_FORMAT), duration_minutes: durationMinutes })
      .eq('id', id);
    if (error) return error.message;
    await refresh();
    return null;
  }

  return { sessions, isLoading, createSession, deleteSession, updateSession, refresh };
}
