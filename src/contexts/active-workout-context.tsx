import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import type { EditableExercise } from '@/components/exercise-set-list';

/**
 * Ein laufendes Training lebt hier statt im Screen, damit man den Screen
 * minimieren kann (Resume-Leiste unten) ohne Timer oder Eingaben zu verlieren.
 */
export type ActiveWorkout = {
  name: string;
  exercises: EditableExercise[];
  /** Startzeitpunkt (Date.now()), daraus wird die laufende Zeit berechnet. */
  startedAt: number;
  /** Aus welcher Einheit das Training gestartet wurde (für Resume-Erkennung). */
  planId: string | null;
};

type ActiveWorkoutValue = {
  workout: ActiveWorkout | null;
  setWorkout: Dispatch<SetStateAction<ActiveWorkout | null>>;
  clearWorkout: () => void;
};

const ActiveWorkoutContext = createContext<ActiveWorkoutValue>({
  workout: null,
  setWorkout: () => {},
  clearWorkout: () => {},
});

export function ActiveWorkoutProvider({ children }: { children: ReactNode }) {
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null);

  return (
    <ActiveWorkoutContext.Provider value={{ workout, setWorkout, clearWorkout: () => setWorkout(null) }}>
      {children}
    </ActiveWorkoutContext.Provider>
  );
}

export function useActiveWorkout() {
  return useContext(ActiveWorkoutContext);
}

export function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
