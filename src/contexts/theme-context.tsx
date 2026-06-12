import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-preference';
const isWeb = Platform.OS === 'web';

type ThemePreferenceValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Aufgelöstes Farbschema: Einstellung des Nutzers oder, bei "system", das Gerät. */
  scheme: 'light' | 'dark';
};

const ThemePreferenceContext = createContext<ThemePreferenceValue>({
  preference: 'system',
  setPreference: () => {},
  scheme: 'light',
});

function readStoredPreference(): ThemePreference {
  if (isWeb && typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  }
  return 'system';
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);

  // Native: AsyncStorage ist asynchron, deshalb nachladen.
  useEffect(() => {
    if (isWeb) return;
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    if (isWeb) {
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next);
    } else {
      AsyncStorage.setItem(STORAGE_KEY, next);
    }
  }

  const scheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  return (
    <ThemePreferenceContext.Provider value={{ preference, setPreference, scheme }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  return useContext(ThemePreferenceContext);
}
