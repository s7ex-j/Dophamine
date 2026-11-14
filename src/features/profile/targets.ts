import type { NutritionProfile } from "@/src/features/profile/profile";

/**
 * Metas de un día concreto. Dos cosas las cambian sin tocar el promedio semanal
 * (que es lo que ajusta la revisión):
 *
 * - El tipo de plan reparte las calorías entre carbos y grasas (la proteína se
 *   mantiene): equilibrado, bajo en carbohidratos, keto o alto en proteína.
 * - El reparto semanal: igual todos los días, más en los días de entreno (y un
 *   poco menos en los de descanso), o a mano por día de la semana.
 *
 * Módulo puro.
 */
export type DietType = "balanced" | "low_carb" | "keto" | "high_protein";
export type CalorieSchedule = "even" | "training" | "custom";
export type DayTargets = { calories: number; protein: number; carbs: number; fats: number; offset: number };

export const DIET_TYPES: Array<{ value: DietType; label: string; detail: string }> = [
  {
    value: "balanced",
    label: "Equilibrado",
    detail: "30 % de las calorías en grasas y el resto en carbohidratos.",
  },
  { value: "low_carb", label: "Bajo en carbos", detail: "45 % en grasas; menos carbohidratos." },
  { value: "keto", label: "Keto", detail: "30 g de carbohidratos al día; el resto en grasas." },
  { value: "high_protein", label: "Alto en proteína", detail: "25 % más de proteína; 28 % en grasas." },
];

export const SCHEDULES: Array<{ value: CalorieSchedule; label: string }> = [
  { value: "even", label: "Igual todos los días" },
  { value: "training", label: "Más en días de entreno" },
  { value: "custom", label: "A mano por día" },
];

const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/**
 * Cuánto se aparta cada día del promedio. En "entreno", los días de entreno
 * suman `extra` y los de descanso restan lo justo para que la semana no cambie.
 * En "a mano", lo escrito se centra para que el promedio sea el objetivo.
 */
export function weeklyOffsets(profile: NutritionProfile, trainingDays: string[]): Record<string, number> {
  const zero = Object.fromEntries(WEEK.map((day) => [day, 0]));
  if (profile.calorieSchedule === "training") {
    const extra = profile.trainingDayExtra ?? 200;
    const trained = WEEK.filter((day) => trainingDays.includes(day)).length;
    if (!trained || trained === 7) return zero;
    const rest = -Math.round((extra * trained) / (7 - trained));
    return Object.fromEntries(WEEK.map((day) => [day, trainingDays.includes(day) ? extra : rest]));
  }
  if (profile.calorieSchedule === "custom" && profile.customDayOffsets) {
    const raw = WEEK.map((day) => profile.customDayOffsets?.[day] ?? 0);
    const mean = raw.reduce((sum, value) => sum + value, 0) / 7;
    return Object.fromEntries(WEEK.map((day, index) => [day, Math.round(raw[index] - mean)]));
  }
  return zero;
}

/** Proteína, carbos y grasas para unas calorías según el tipo de plan. */
export function macroSplit(profile: NutritionProfile, calories: number) {
  const type = profile.dietType;
  if (!type) {
    // Sin tipo elegido: las grasas del plan inicial y el resto en carbos.
    const carbs = Math.max(
      0,
      Math.round((calories - profile.proteinTarget * 4 - profile.fatsTarget * 9) / 4),
    );
    return { protein: profile.proteinTarget, carbs, fats: profile.fatsTarget };
  }
  const protein = type === "high_protein" ? Math.round(profile.proteinTarget * 1.25) : profile.proteinTarget;
  if (type === "keto") {
    const carbs = 30;
    return { protein, carbs, fats: Math.max(0, Math.round((calories - protein * 4 - carbs * 4) / 9)) };
  }
  const fatShare = type === "low_carb" ? 0.45 : type === "high_protein" ? 0.28 : 0.3;
  const fats = Math.round((calories * fatShare) / 9);
  return { protein, carbs: Math.max(0, Math.round((calories - protein * 4 - fats * 9) / 4)), fats };
}

/** Las metas de un día de la semana ("mon"…). */
export function targetsForWeekday(
  profile: NutritionProfile,
  weekday: string,
  trainingDays: string[],
): DayTargets {
  const offset = weeklyOffsets(profile, trainingDays)[weekday] ?? 0;
  const calories = Math.max(1000, profile.calorieTarget + offset);
  return { calories, offset, ...macroSplit(profile, calories) };
}
