import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { Exercise, ExerciseCategory } from '@/types/database';

export function useExercises() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setExercises([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    // RLS liefert globale Übungen (user_id null) plus die eigenen.
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true });
    if (!error) {
      setExercises(data);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addExercise(name: string, category: ExerciseCategory, target?: string | null) {
    if (!userId) return { exercise: null, error: 'Nicht angemeldet' };
    const { data, error } = await supabase
      .from('exercises')
      .insert({ name, category, target: target?.trim() || null, user_id: userId })
      .select()
      .single();
    if (!error) {
      await refresh();
    }
    return { exercise: data as Exercise | null, error: error?.message ?? null };
  }

  // Aktualisiert eine selbst erstellte Übung (RLS lässt globale Übungen nicht zu).
  // target = Muskelgruppe(n), mehrere kommagetrennt; null entfernt sie (Fallback: category).
  async function updateExercise(
    id: string,
    updates: { name?: string; category?: ExerciseCategory; target?: string | null },
  ) {
    if (!userId) return 'Nicht angemeldet';
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.target !== undefined) payload.target = updates.target?.trim() || null;
    const { error } = await supabase.from('exercises').update(payload).eq('id', id);
    if (error) return error.message;
    await refresh();
    return null;
  }

  // Caution: session_exercises/training_plan_exercises cascade on delete,
  // so removing an exercise also removes it from logged trainings and plans.
  async function deleteExercise(id: string) {
    if (!userId) return 'Nicht angemeldet';
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (error) return error.message;
    await refresh();
    return null;
  }

  return { exercises, isLoading, addExercise, updateExercise, deleteExercise, refresh };
}
