import { getBiometricsWindow } from "@/src/features/biometrics/biometrics.repository";
import { weeklySummary, type WeeklySummary } from "@/src/features/dashboard/weekly";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { getSleepSince } from "@/src/features/sleep/sleep.repository";
import { getWorkoutDates } from "@/src/features/training/training.repository";
import { weekStart } from "@/src/features/training/week";
import { addDays } from "@/src/lib/dates";

// Carga lo necesario para el resumen de la semana pasada (repositorios con versión SQLite y web).
export async function getWeeklySummary(now = new Date()): Promise<WeeklySummary | null> {
  const monday = weekStart(now);
  const since = addDays(monday, -14);
  const [records, workoutDates, sleep, profile] = await Promise.all([
    getBiometricsWindow(30),
    getWorkoutDates(since),
    getSleepSince(since),
    getNutritionProfile(),
  ]);
  if (!profile) return null;
  return weeklySummary({
    thisMonday: monday,
    records,
    workoutDates,
    sleep,
    targets: { calories: profile.calorieTarget, protein: profile.proteinTarget },
  });
}
