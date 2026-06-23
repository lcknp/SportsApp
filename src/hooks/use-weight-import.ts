import { useCallback } from 'react';

import { useAuth } from '@/contexts/auth-context';
import type { WeightEntry } from '@/lib/weight-csv';
import { supabase } from '@/lib/supabase';

// Schreibt die importierten Tagesgewichte gebündelt in weights. Bereits
// vorhandene Tage werden überschrieben (Upsert auf user_id,date).
export function useWeightImport() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const importEntries = useCallback(
    async (entries: WeightEntry[]): Promise<{ count?: number; error?: string }> => {
      if (!userId) return { error: 'Nicht angemeldet' };
      if (entries.length === 0) return { error: 'Keine gültigen Einträge in der Datei gefunden.' };

      const rows = entries.map((entry) => ({
        user_id: userId,
        date: entry.date,
        weight_kg: entry.weight_kg,
      }));

      const { error } = await supabase.from('weights').upsert(rows, { onConflict: 'user_id,date' });
      if (error) return { error: error.message };

      return { count: rows.length };
    },
    [userId],
  );

  return { importEntries };
}
