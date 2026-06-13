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

// Beim Sync aus der Aktivitäts-Übersicht befüllt (kein extra Strava-Request).
export type StravaStats = {
  name: string | null;
  started_at: string | null;
  elapsed_minutes: number | null;
  elevation_gain: number | null;
  avg_heartrate: number | null;
  max_heartrate: number | null;
  avg_cadence: number | null;
  max_speed: number | null;
  suffer_score: number | null;
  kudos_count: number | null;
  achievement_count: number | null;
  polyline: string | null;
};

export type StravaSplit = {
  km: number;
  distance: number;
  moving_time: number;
  elevation_diff: number | null;
  avg_speed: number | null;
  avg_hr: number | null;
};

export type StravaBestEffort = {
  name: string;
  seconds: number;
  distance: number;
};

export type StravaStreams = {
  distance: number[];
  altitude: number[];
  heartrate: number[];
  velocity: number[];
  latlng: [number, number][];
};

// Erst beim Aufklappen geladen (Detail-/Stream-Abruf), danach gecacht.
export type StravaDetail = {
  calories: number | null;
  splits: StravaSplit[];
  best_efforts: StravaBestEffort[];
  streams: StravaStreams;
};

export type Run = {
  id: string;
  user_id: string;
  date: string;
  distance_km: number;
  duration_minutes: number;
  // gesetzt = automatisch von Strava importiert
  strava_id?: number | null;
  strava_stats?: StravaStats | null;
  strava_detail?: StravaDetail | null;
  created_at: string;
};

export type PlanGroup = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type TrainingPlan = {
  id: string;
  user_id: string;
  name: string;
  group_id?: string | null;
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
