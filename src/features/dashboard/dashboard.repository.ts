import { getLatestBiometrics, getBiometricsWindow } from "@/src/features/biometrics/biometrics.repository";
import { estimateTdee } from "@/src/features/tdee/tdee";
import { getLatestMood } from "@/src/features/wellbeing/wellbeing.repository";

export type DashboardSnapshot = { weightKg: number | null; caloriesIn: number | null; tdee: number | null; mood: number | null };
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [latest, records, mood] = await Promise.all([getLatestBiometrics(), getBiometricsWindow(21), getLatestMood()]);
  return { weightKg: latest?.weightKg ?? null, caloriesIn: latest?.caloriesIn ?? null, tdee: estimateTdee(records), mood };
}

