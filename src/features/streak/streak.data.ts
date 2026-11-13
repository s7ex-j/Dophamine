import { getBiometricsWindow } from "@/src/features/biometrics/biometrics.repository";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { goalProgress } from "@/src/features/profile/profile";
import { getSetting } from "@/src/features/settings/settings.repository";
import { bestDays, readHabits, SOBRIETY_KEY, type SoberHabit } from "@/src/features/sobriety/sobriety";
import {
  achievements,
  bestStreak,
  currentStreak,
  petMood,
  petStage,
  type Achievement,
  type PetMood,
  type PetStage,
} from "@/src/features/streak/streak";
import { getSessionHistory, getWorkoutDates } from "@/src/features/training/training.repository";
import { addDays, localDateKey } from "@/src/lib/dates";

// Junta lo registrado (comida, peso, entrenos y sobriedad) para la racha, Dopi y
// los logros. Usa repositorios que ya tienen versión SQLite y web.

export type StreakSummary = {
  current: number;
  best: number;
  loggedToday: boolean;
  stage: PetStage;
  mood: PetMood;
  achievements: Achievement[];
  habits: SoberHabit[];
};

export async function getStreakSummary(now = new Date()): Promise<StreakSummary> {
  const today = localDateKey(now);
  const [records, workoutDates, sessions, profile, saved] = await Promise.all([
    getBiometricsWindow(800),
    getWorkoutDates(addDays(today, -800)),
    getSessionHistory(1000),
    getNutritionProfile(),
    getSetting(SOBRIETY_KEY),
  ]);
  const dates = [
    ...records
      .filter((record) => record.weightKg || record.caloriesIn > 0 || record.proteinG > 0)
      .map((record) => record.date),
    ...workoutDates,
  ];
  const current = currentStreak(dates, today);
  const best = Math.max(bestStreak(dates), current);
  const loggedToday = dates.includes(today);
  const weighIns = records.filter((record) => record.weightKg).length;
  // Los registros vienen del más reciente al más antiguo.
  const latest = records.find((record) => record.weightKg)?.weightKg ?? null;
  const habits = readHabits(saved);
  return {
    current,
    best,
    loggedToday,
    stage: petStage(best),
    mood: petMood(loggedToday, current, best),
    habits,
    achievements: achievements({
      best,
      weighIns,
      workouts: sessions.length,
      goalReached: Boolean(profile && goalProgress(profile, latest)?.reached),
      sobriety: habits.map((habit) => ({ name: habit.name, best: bestDays(habit, now) })),
    }),
  };
}
