import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const theme = useTheme();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    const message = mode === 'signIn' ? await signIn(email, password) : await signUp(email, password);
    setIsSubmitting(false);
    if (message) {
      setError(message);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          SportsApp
        </ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          {mode === 'signIn' ? 'Anmelden' : 'Registrieren'}
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.form}>
          <ThemedTextInput
            placeholder="E-Mail"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <ThemedTextInput
            placeholder="Passwort"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}
            disabled={isSubmitting}
            onPress={handleSubmit}>
            <ThemedText type="smallBold">
              {mode === 'signIn' ? 'Anmelden' : 'Konto erstellen'}
            </ThemedText>
          </Pressable>

          <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
            <ThemedText type="link" themeColor="textSecondary" style={styles.switchModeText}>
              {mode === 'signIn'
                ? 'Noch kein Konto? Jetzt registrieren'
                : 'Schon registriert? Anmelden'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  button: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: '#e5484d',
    textAlign: 'center',
  },
  switchModeText: {
    textAlign: 'center',
  },
});
