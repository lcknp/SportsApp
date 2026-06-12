import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useStrava } from '@/hooks/use-strava';

// Landeseite der Strava-OAuth-Weiterleitung (?code=…). Tauscht den Code
// über die Edge Function gegen Tokens und springt zurück zum Laufen-Tab.
export default function StravaCallbackScreen() {
  const { code, error: oauthError } = useLocalSearchParams<{ code?: string; error?: string }>();
  const { completeConnection } = useStrava();
  const [message, setMessage] = useState('Verbinde mit Strava …');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (oauthError) {
      setMessage('Strava-Verbindung abgelehnt.');
      return;
    }
    if (!code) return;
    startedRef.current = true;
    completeConnection(String(code)).then((errorMessage) => {
      if (errorMessage) {
        setMessage('Fehler: ' + errorMessage);
        return;
      }
      router.replace('/running');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, oauthError]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">{message}</ThemedText>
      {(oauthError || message.startsWith('Fehler')) && (
        <ThemedText type="link" onPress={() => router.replace('/running')}>
          Zurück zum Laufen-Tab
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
  },
});
