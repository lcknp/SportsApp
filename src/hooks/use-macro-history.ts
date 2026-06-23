import { format, subDays } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { DailyMacros } from '@/types/database';

const DATE_FORMAT = 'yyyy-MM-dd';

export function useMacroHistory(days: number = 14) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [history, setHistory] = useState<DailyMacros[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setHistory([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const since = format(subDays(new Date(), days - 1), DATE_FORMAT);
    const { data, error } = await supabase
      .from('daily_macros')
      .select('*')
      .eq('user_id', userId)
      .gte('date', since)
      .order('date', { ascending: true });
    if (!error) {
      setHistory(data);
    }
    setIsLoading(false);
  }, [userId, days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { history, isLoading, refresh };
}
