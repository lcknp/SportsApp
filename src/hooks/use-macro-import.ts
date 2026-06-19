import { useCallback } from 'react';

import { useAuth } from '@/contexts/auth-context';
import type { FddbDay } from '@/lib/fddb-csv';
import { supabase } from '@/lib/supabase';

// Schreibt die pro Tag summierten Makros gebündelt in daily_macros.
// Bereits vorhandene Tage werden überschrieben (Upsert auf user_id,date) —
// das FDDB-Tagebuch gilt als Quelle der Wahrheit.
export function useMacroImport() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const importDays = useCallback(
    async (days: FddbDay[]): Promise<{ count?: number; error?: string }> => {
      if (!userId) return { error: 'Nicht angemeldet' };
      if (days.length === 0) return { error: 'Keine gültigen Tage in der Datei gefunden.' };

      const rows = days.map((day) => ({
        user_id: userId,
        date: day.date,
        protein_g: day.protein_g,
        carbs_g: day.carbs_g,
        fat_g: day.fat_g,
      }));

      const { error } = await supabase
        .from('daily_macros')
        .upsert(rows, { onConflict: 'user_id,date' });
      if (error) return { error: error.message };

      return { count: rows.length };
    },
    [userId],
  );

  // Löscht ALLE Makro-Tage des angemeldeten Nutzers — für einen sauberen
  // Neustart, da ein erneuter Import nur die Tage der CSV überschreibt und
  // alte, nicht mehr enthaltene Tage sonst stehen bleiben.
  const deleteAllDays = useCallback(async (): Promise<{ count?: number; error?: string }> => {
    if (!userId) return { error: 'Nicht angemeldet' };

    const { error, count } = await supabase
      .from('daily_macros')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    if (error) return { error: error.message };

    return { count: count ?? 0 };
  }, [userId]);

  return { importDays, deleteAllDays };
}
