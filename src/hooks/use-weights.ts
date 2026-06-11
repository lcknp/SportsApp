import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { Weight } from '@/types/database';

const DATE_FORMAT = 'yyyy-MM-dd';

export function useWeights() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [weights, setWeights] = useState<Weight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setWeights([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('weights')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30);
    if (!error) {
      setWeights(data);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function saveWeight(date: Date, weightKg: number) {
    if (!userId) return 'Nicht angemeldet';
    const { error } = await supabase
      .from('weights')
      .upsert(
        { user_id: userId, date: format(date, DATE_FORMAT), weight_kg: weightKg },
        { onConflict: 'user_id,date' },
      );
    if (error) {
      return error.message;
    }
    await refresh();
    return null;
  }

  async function deleteWeight(id: string) {
    if (!userId) return 'Nicht angemeldet';
    const { error } = await supabase.from('weights').delete().eq('id', id);
    if (error) {
      return error.message;
    }
    await refresh();
    return null;
  }

  return { weights, isLoading, saveWeight, deleteWeight, refresh };
}
