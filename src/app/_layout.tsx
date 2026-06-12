import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ResumeWorkoutBar } from '@/components/resume-workout-bar';
import { ActiveWorkoutProvider } from '@/contexts/active-workout-context';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ThemePreferenceProvider, useThemePreference } from '@/contexts/theme-context';

function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="new-training"
          options={{ presentation: 'modal', headerShown: true, title: 'Aktives Training' }}
        />
        <Stack.Screen
          name="new-plan"
          options={{ presentation: 'modal', headerShown: true, title: 'Training erstellen' }}
        />
        <Stack.Screen
          name="volume"
          options={{ presentation: 'modal', headerShown: true, title: 'Volumen-Übersicht' }}
        />
        <Stack.Screen name="strava-callback" />
        <Stack.Screen
          name="new-run"
          options={{ presentation: 'modal', headerShown: true, title: 'Lauf eintragen' }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="auth/login" />
      </Stack.Protected>
    </Stack>
  );
}

function ThemedApp() {
  const { scheme } = useThemePreference();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <ActiveWorkoutProvider>
          <AnimatedSplashOverlay />
          <RootNavigator />
          <ResumeWorkoutBar />
        </ActiveWorkoutProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <ThemedApp />
    </ThemePreferenceProvider>
  );
}
