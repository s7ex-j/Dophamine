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
  // Decisión de Jharol (17 nov 2026): el objetivo es el mismo todos los días, entrenes o no.
  // Los campos viejos de reparto (calorieSchedule…) se conservan en el perfil pero ya no cuentan.
  void weekday;
  void trainingDays;
  const calories = Math.max(1000, profile.calorieTarget);
  return { calories, offset: 0, ...macroSplit(profile, calories) };
}
