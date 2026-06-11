import { endOfDay, isToday, startOfDay } from 'date-fns';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

export function useStepCount(date: Date) {
  const [steps, setSteps] = useState<number | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Pedometer has no web implementation — skip entirely so the
    // dashboard hides the steps card in the browser.
    if (Platform.OS === 'web') return;

    let isMounted = true;

    async function load() {
      const available = await Pedometer.isAvailableAsync().catch(() => false);
      if (!isMounted) return;
      setIsAvailable(available);
      if (!available) {
        setSteps(null);
        return;
      }

      const { granted } = await Pedometer.requestPermissionsAsync();
      if (!isMounted) return;
      if (!granted) {
        setSteps(null);
        return;
      }

      const start = startOfDay(date);
      const end = isToday(date) ? new Date() : endOfDay(date);
      const result = await Pedometer.getStepCountAsync(start, end).catch(() => null);
      if (!isMounted) return;
      setSteps(result?.steps ?? null);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [date]);

  return { steps, isAvailable };
}
