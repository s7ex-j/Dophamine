import { localDateKey } from "@/src/lib/dates";
import type { Food } from "@/src/features/nutrition/foods";
import type { MealEntry } from "@/src/features/nutrition/meals";
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
    variant: "full_body" | "upper_lower" | "posterior" | "push_pull_legs" | "custom";
    days: string[];
    exercises: Array<{ name: string; sets: number; reps: string; rir: number }>;
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
  settings?: { onlineLookup?: boolean };
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
