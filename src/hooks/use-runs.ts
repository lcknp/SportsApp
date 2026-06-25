import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { Run, StravaDetail, StravaStats } from '@/types/database';

const DATE_FORMAT = 'yyyy-MM-dd';

// Leichte Spalten für die Liste — OHNE die großen JSON-Felder strava_stats
// (Polyline) und strava_detail (Streams). Die werden erst beim Aufklappen
// eines Laufs einzeln nachgeladen, sonst lädt jeder Tab-Fokus Megabytes.
const RUN_LIST_COLUMNS = 'id, user_id, date, distance_km, duration_minutes, strava_id, created_at';

export function useRuns() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [runs, setRuns] = useState<Run[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setRuns([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('runs')
      .select(RUN_LIST_COLUMNS)
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (!error) {
      setRuns(data as Run[]);
    }
    setIsLoading(false);
  }, [userId]);

  // Schwere Detail-Spalten für genau einen Lauf (beim Aufklappen). strava_stats
  // ist nach dem Sync immer da; strava_detail nur, wenn es zuvor gecacht wurde.
  async function fetchRunDetails(
    runId: string,
  ): Promise<{ stats: StravaStats | null; detail: StravaDetail | null }> {
    const { data } = await supabase
      .from('runs')
      .select('strava_stats, strava_detail')
      .eq('id', runId)
      .maybeSingle();
    return { stats: data?.strava_stats ?? null, detail: data?.strava_detail ?? null };
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addRun(date: Date, distanceKm: number, durationMinutes: number) {
    if (!userId) return 'Nicht angemeldet';

    const dateString = format(date, DATE_FORMAT);
    const { error: runError } = await supabase.from('runs').insert({
      user_id: userId,
      date: dateString,
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
    });
    if (runError) {
      return runError.message;
    }

    await supabase
      .from('workout_sessions')
      .insert({ user_id: userId, date: dateString, name: 'Lauf', completed: true });

    await refresh();
    return null;
  }

  async function deleteRun(id: string, date: string) {
    if (!userId) return 'Nicht angemeldet';
    const { error } = await supabase.from('runs').delete().eq('id', id);
    if (error) return error.message;

    await supabase
      .from('workout_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('date', date)
      .eq('name', 'Lauf');

    await refresh();
    return null;
  }

  return { runs, isLoading, addRun, deleteRun, refresh, fetchRunDetails };
}
