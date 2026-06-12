export type Profile = {
  id: string;
  full_name: string | null;
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  created_at: string;
};

export type DailyMacros = {
  id: string;
  user_id: string;
  date: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  updated_at: string;
};

export type Weight = {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  created_at: string;
};

export type WorkoutSession = {
  id: string;
  user_id: string;
  date: string;
  name: string;
  completed: boolean;
  duration_minutes: number | null;
};

export type ExerciseCategory =
  | 'Rücken'
  | 'Brust'
  | 'Beine'
  | 'Schultern'
  | 'Arme'
  | 'Bauch'
  | 'Cardio'
  | 'Sonstiges';

export type Exercise = {
  id: string;
  // null = globale Standard-Übung, sichtbar für alle Accounts
  user_id: string | null;
  name: string;
  category: ExerciseCategory;
  video_url?: string | null;
  target?: string | null;
  created_at: string;
};

export type SetEntry = {
  reps: number;
  weight_kg: number;
};

export type SessionExercise = {
  id: string;
  session_id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  weight_kg: number;
  order_index: number;
  set_entries: SetEntry[];
  exercise?: Exercise;
};

export type TrainingSession = WorkoutSession & {
  session_exercises: SessionExercise[];
};

export type Run = {
  id: string;
  user_id: string;
  date: string;
  distance_km: number;
  duration_minutes: number;
  created_at: string;
};

export type TrainingPlan = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type TrainingPlanExercise = {
  id: string;
  plan_id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  weight_kg: number;
  order_index: number;
  set_entries: SetEntry[];
  exercise?: Exercise;
};

export type TrainingPlanWithExercises = TrainingPlan & {
  training_plan_exercises: TrainingPlanExercise[];
};
