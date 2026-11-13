import { localDateKey } from "@/src/lib/dates";
import type { Food } from "@/src/features/nutrition/foods";
import type { MealEntry } from "@/src/features/nutrition/meals";
import type { SleepEntry } from "@/src/features/sleep/sleep";
import type { LoggedSet } from "@/src/features/training/workout";
export type Store = {
  biometrics: Array<{
    id: string;
    date: string;
    weightKg: number | null;
    caloriesIn: number;
    proteinG: number;
    carbsG?: number;
    fatsG?: number;
    bodyFatPct?: number | null;
    muscleMassKg?: number | null;
    waterPct?: number | null;
    boneMassKg?: number | null;
    partial?: boolean;
    waterMl?: number;
  }>;
  wellbeing: Array<{
    id: string;
    date: string;
    mood: number;
    energy?: number;
    stress?: number;
    sleepHours?: number;
    note: string;
  }>;
  workouts: Array<{
    id: string;
    name: string;
    completedAt: string;
    /** Desde la 0.12.0: inicio de la sesión y cada serie por separado. */
    startedAt?: string;
    sets?: LoggedSet[];
    exerciseCount?: number;
    sessionLogs?: Array<{
      exerciseName: string;
      loadKg: number | null;
      reps: number | null;
      rir: number | null;
    }>;
  }>;
  habits?: Array<{ id: string; date: string; completed: boolean }>;
  routines?: Array<{
    id: string;
    name: string;
    variant: "full_body" | "upper_lower" | "posterior" | "push_pull_legs" | "ppl6" | "hybrid" | "custom";
    days: string[];
    exercises: Array<{ name: string; sets: number; reps: string; rir: number }>;
    /** Desde la 0.14.0: un entreno por día. */
    schedule?: Array<{
      day: string;
      name: string;
      exercises: Array<{ name: string; sets: number; reps: string; rir: number }>;
      focus?: string[];
    }>;
    accent: string;
    gymProfile: "full_gym" | "home" | "limited";
    trainingGoal: "strength" | "hypertrophy" | "general";
    sessionMinutes: number;
  }>;
  profile?: {
    age: number;
    sex: "female" | "male";
    heightCm: number;
    activity: "low" | "light" | "moderate" | "high";
    goal: "gain" | "maintain" | "lose";
    calorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatsTarget: number;
    weightUnit?: "kg" | "lb";
    startWeightKg?: number;
    startDate?: string;
    goalWeightKg?: number;
    pace?: "gentle" | "moderate" | "fast";
    bodyFatPct?: number;
    proteinLevel?: "moderate" | "high" | "very_high";
    adjustMode?: "auto" | "collaborative" | "manual";
    checkInDays?: 3 | 7;
    trainingDays?: number;
    sessionMinutes?: number;
    trainingType?: "strength" | "cardio" | "mixed";
    experience?: "beginner" | "intermediate" | "advanced";
    knownIntake?: number;
    recentTrend?: "stable" | "gaining" | "losing";
    initialExpenditure?: number;
    mealStyle?: "named" | "numbered";
    mealsPerDay?: number;
  };
  reviews?: Array<{
    id: string;
    date: string;
    decision: "accepted" | "dismissed" | "auto";
    previousCalories: number;
    suggestedCalories: number;
    tdee: number | null;
  }>;
  /** Alimentos propios, recetas y los traídos de internet. Los incluidos en la app no se guardan. */
  foods?: Food[];
  /** Lo comido, entrada por entrada. El total de cada día en `biometrics` es su suma. */
  meals?: MealEntry[];
  settings?: { onlineLookup?: boolean; [key: string]: unknown };
  /** Noches de sueño (manuales o importadas de Health Connect). */
  sleep?: SleepEntry[];
};

const key = "dophamine.web-store.v1";
const empty = (): Store => ({ biometrics: [], wellbeing: [], workouts: [] });

export function readStore(): Store {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "") as Store;
  } catch {
    return empty();
  }
}

export function writeStore(store: Store) {
  window.localStorage.setItem(key, JSON.stringify(store));
}

export const webId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const webToday = () => localDateKey();
