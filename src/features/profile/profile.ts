export type Sex = "female" | "male";
export type ActivityLevel = "low" | "light" | "moderate" | "high";
export type Goal = "gain" | "maintain" | "lose";

export type NutritionProfile = {
  age: number;
  sex: Sex;
  heightCm: number;
  activity: ActivityLevel;
  goal: Goal;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatsTarget: number;
};

const activityFactors: Record<ActivityLevel, number> = { low: 1.2, light: 1.375, moderate: 1.55, high: 1.725 };
const goalAdjustments: Record<Goal, number> = { gain: 250, maintain: 0, lose: -350 };

export function buildNutritionProfile(input: Omit<NutritionProfile, "calorieTarget" | "proteinTarget" | "carbsTarget" | "fatsTarget"> & { weightKg: number }): NutritionProfile {
  const bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + (input.sex === "male" ? 5 : -161);
  const calorieTarget = Math.max(1200, Math.round(bmr * activityFactors[input.activity] + goalAdjustments[input.goal]));
  const proteinTarget = Math.round(input.weightKg * 1.8);
  const fatsTarget = Math.round(input.weightKg * 0.8);
  const carbsTarget = Math.max(0, Math.round((calorieTarget - proteinTarget * 4 - fatsTarget * 9) / 4));
  return { ...input, calorieTarget, proteinTarget, carbsTarget, fatsTarget };
}

export const goalLabels: Record<Goal, string> = { gain: "Volumen", maintain: "Mantenimiento", lose: "Definición" };
export const activityLabels: Record<ActivityLevel, string> = { low: "Baja", light: "Ligera", moderate: "Moderada", high: "Alta" };

