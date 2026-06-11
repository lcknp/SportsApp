import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { DailyMacros } from '@/types/database';

const DATE_FORMAT = 'yyyy-MM-dd';

export function useDailyMacros(date: Date) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const dateString = format(date, DATE_FORMAT);

  const [macros, setMacros] = useState<DailyMacros | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setMacros(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('daily_macros')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateString)
      .maybeSingle();
    if (!error) {
      setMacros(data);
    }
    setIsLoading(false);
  }, [userId, dateString]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function saveMacros(proteinG: number, carbsG: number, fatG: number) {
    if (!userId) return 'Nicht angemeldet';
    const { data, error } = await supabase
      .from('daily_macros')
      .upsert(
        { user_id: userId, date: dateString, protein_g: proteinG, carbs_g: carbsG, fat_g: fatG },
        { onConflict: 'user_id,date' },
      )
      .select('*')
      .single();
    if (!error) {
      setMacros(data);
    }
    return error?.message ?? null;
  }

  async function deleteMacros() {
    if (!userId) return 'Nicht angemeldet';
    const { error } = await supabase
      .from('daily_macros')
      .delete()
      .eq('user_id', userId)
      .eq('date', dateString);
    if (error) {
      return error.message;
    }
    setMacros(null);
    return null;
  }

  return { macros, isLoading, saveMacros, deleteMacros, refresh };
}
