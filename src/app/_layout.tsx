import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/contexts/auth-context';

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

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
