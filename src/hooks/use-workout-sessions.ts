import { endOfMonth, format, startOfMonth } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

const DATE_FORMAT = 'yyyy-MM-dd';

export function useWorkoutSessions(month: Date) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCompletedDates(new Set());
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('date, completed')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('date', format(startOfMonth(month), DATE_FORMAT))
      .lte('date', format(endOfMonth(month), DATE_FORMAT));
    if (!error) {
      setCompletedDates(new Set(data.map((row) => row.date)));
    }
    setIsLoading(false);
  }, [userId, month]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { completedDates, isLoading, refresh };
}
