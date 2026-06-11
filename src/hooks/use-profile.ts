import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!error) {
      if (data) {
        setProfile(data);
      } else {
        const { data: created } = await supabase
          .from('profiles')
          .insert({ id: userId })
          .select('*')
          .single();
        setProfile(created ?? null);
      }
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function updateGoals(goals: Pick<Profile, 'daily_calories' | 'daily_protein_g' | 'daily_carbs_g' | 'daily_fat_g'>) {
    if (!userId) return;
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...goals })
      .select('*')
      .single();
    if (!error) {
      setProfile(data);
    }
    return error?.message ?? null;
  }

  async function updateName(fullName: string) {
    if (!userId) return 'Nicht angemeldet';
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, full_name: fullName })
      .select('*')
      .single();
    if (!error) {
      setProfile(data);
    }
    return error?.message ?? null;
  }

  return { profile, isLoading, updateGoals, updateName, refresh };
}
