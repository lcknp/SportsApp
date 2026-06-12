import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { formatElapsed, useActiveWorkout } from '@/contexts/active-workout-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * Schwebt über der Tab-Leiste, solange ein minimiertes Training läuft.
 * Tippen klappt das aktive Training wieder auf.
 */
export function ResumeWorkoutBar() {
  const { workout } = useActiveWorkout();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!workout) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [workout]);

  // Nichts anzeigen, wenn kein Training läuft oder es gerade offen ist.
  if (!workout || pathname === '/new-training') return null;

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - workout.startedAt) / 1000));
  const bottomOffset = (Platform.OS === 'web' ? 72 : BottomTabInset) + insets.bottom + Spacing.two;

  return (
    <ThemedView pointerEvents="box-none" style={[styles.wrapper, { bottom: bottomOffset }]}>
      <Pressable
        style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
        onPress={() => router.push('/new-training')}>
        <ThemedView
          type="backgroundElement"
          style={[styles.barInner, { borderColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold" themeColor="accent">
            ▲ Training fortsetzen
          </ThemedText>
          <ThemedText type="smallBold">{formatElapsed(elapsedSeconds)}</ThemedText>
        </ThemedView>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.four,
  },
  bar: {
    width: '100%',
    maxWidth: MaxContentWidth - Spacing.four * 2,
    borderRadius: Spacing.three,
    // Leichter Schatten, damit die Leiste über dem Inhalt schwebt
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  barInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
