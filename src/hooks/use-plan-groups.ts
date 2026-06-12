import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { PlanGroup } from '@/types/database';

export function usePlanGroups() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [groups, setGroups] = useState<PlanGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setGroups([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('plan_groups')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (!error) {
      setGroups(data as PlanGroup[]);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createGroup(name: string) {
    if (!userId) return 'Nicht angemeldet';
    const { error } = await supabase.from('plan_groups').insert({ user_id: userId, name });
    if (error) return error.message;
    await refresh();
    return null;
  }

  // Einheiten in der Gruppe bleiben erhalten (group_id wird per DB auf null gesetzt).
  async function deleteGroup(groupId: string) {
    if (!userId) return 'Nicht angemeldet';
    const { error } = await supabase.from('plan_groups').delete().eq('id', groupId);
    if (error) return error.message;
    await refresh();
    return null;
  }

  return { groups, isLoading, createGroup, deleteGroup, refresh };
}
