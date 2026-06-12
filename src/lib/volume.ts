import type { TrainingPlanWithExercises } from '@/types/database';

// Volumen = Anzahl Sätze. Übungen mit mehreren Targets (z.B. "HAMS, LOWER BACK")
// zählen für jede genannte Muskelgruppe voll.
export type VolumeSummary = {
  totalSets: number;
  setsByTarget: Record<string, number>;
};

export function planVolume(plan: TrainingPlanWithExercises): VolumeSummary {
  const setsByTarget: Record<string, number> = {};
  let totalSets = 0;

  for (const planExercise of plan.training_plan_exercises) {
    const sets =
      planExercise.set_entries.length > 0 ? planExercise.set_entries.length : planExercise.sets;
    totalSets += sets;
    const targetText = planExercise.exercise?.target || planExercise.exercise?.category || 'Sonstiges';
    for (const target of targetText.split(',').map((t) => t.trim()).filter(Boolean)) {
      setsByTarget[target] = (setsByTarget[target] ?? 0) + sets;
    }
  }

  return { totalSets, setsByTarget };
}

export function combineVolumes(volumes: VolumeSummary[]): VolumeSummary {
  const setsByTarget: Record<string, number> = {};
  let totalSets = 0;
  for (const volume of volumes) {
    totalSets += volume.totalSets;
    for (const [target, sets] of Object.entries(volume.setsByTarget)) {
      setsByTarget[target] = (setsByTarget[target] ?? 0) + sets;
    }
  }
  return { totalSets, setsByTarget };
}

// Targets absteigend nach Satzzahl sortiert, für die Anzeige.
export function sortedTargets(summary: VolumeSummary): [string, number][] {
  return Object.entries(summary.setsByTarget).sort((a, b) => b[1] - a[1]);
}
