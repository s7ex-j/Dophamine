import { getLatestBiometrics, getBiometricsWindow } from "@/src/features/biometrics/biometrics.repository";
import { analyzeMetabolism } from "@/src/features/tdee/tdee";
import { getLatestMood } from "@/src/features/wellbeing/wellbeing.repository";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import type { NutritionProfile } from "@/src/features/profile/profile";

export type DashboardSnapshot = { weightKg: number | null; caloriesIn: number | null; proteinG: number | null; carbsG: number | null; fatsG: number | null; tdee: number | null; mood: number | null; profile: NutritionProfile | null };
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [latest, records, mood, profile] = await Promise.all([getLatestBiometrics(), getBiometricsWindow(42), getLatestMood(), getNutritionProfile()]);
  return { weightKg: latest?.weightKg ?? null, caloriesIn: latest?.caloriesIn ?? null, proteinG: latest?.proteinG ?? null, carbsG: latest?.carbsG ?? null, fatsG: latest?.fatsG ?? null, tdee: analyzeMetabolism(records).tdee, mood, profile };
}

