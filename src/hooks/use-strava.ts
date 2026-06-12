import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function useStrava() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setIsConnected(null);
      return;
    }
    const { data, error } = await supabase
      .from('strava_accounts')
      .select('user_id, last_sync_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error) {
      setIsConnected(!!data);
      setLastSyncAt(data?.last_sync_at ?? null);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isConfigured = !!STRAVA_CLIENT_ID;

  // Startet den Strava-Login (nur Web: volle Browser-Weiterleitung).
  function connect() {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !STRAVA_CLIENT_ID) return;
    const redirectUri = `${window.location.origin}/strava-callback`;
    const url =
      'https://www.strava.com/oauth/authorize' +
      `?client_id=${STRAVA_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      '&response_type=code' +
      '&approval_prompt=auto' +
      '&scope=activity:read_all';
    window.location.href = url;
  }

  async function callFunction(name: string, body: object) {
    const accessToken = session?.access_token;
    if (!accessToken || !SUPABASE_URL) return { error: 'Nicht angemeldet' };
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify(body),
      });
      return await response.json();
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Tauscht den OAuth-Code ein (wird von der Callback-Seite aufgerufen).
  async function completeConnection(code: string): Promise<string | null> {
    const result = await callFunction('strava-auth', { code });
    if (result.error) return String(result.error);
    await refresh();
    return null;
  }

  // Importiert neue Läufe; gibt {imported} oder {error} zurück.
  async function sync(): Promise<{ imported?: number; error?: string }> {
    setIsSyncing(true);
    const result = await callFunction('strava-sync', {});
    setIsSyncing(false);
    await refresh();
    return result;
  }

  async function disconnect() {
    if (!userId) return;
    await supabase.from('strava_accounts').delete().eq('user_id', userId);
    await refresh();
  }

  return { isConfigured, isConnected, lastSyncAt, isSyncing, connect, completeConnection, sync, disconnect, refresh };
}
