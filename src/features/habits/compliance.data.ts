import { getBiometricsWindow } from "@/src/features/biometrics/biometrics.repository";
import { dayCompliance, type DayCompliance } from "@/src/features/habits/compliance";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { weekdayOf } from "@/src/features/reminders/reminders";
import { sleepMinutes } from "@/src/features/sleep/sleep";
import { getSleepSince } from "@/src/features/sleep/sleep.repository";
import { getRoutine, getWorkoutDates } from "@/src/features/training/training.repository";
import { getWellbeingDates } from "@/src/features/wellbeing/wellbeing.repository";
import { waterTargetMl } from "@/src/features/water/water";
import { addDays, localDateKey } from "@/src/lib/dates";

// Junta lo registrado en distintas partes de la app para calcular el
// cumplimiento de cada día. Solo lee; las reglas están en compliance.ts.
export async function getComplianceDays(
  days: number,
): Promise<Array<{ date: string; compliance: DayCompliance }>> {
  const today = localDateKey();
  const since = addDays(today, -(days - 1));
  const [records, workouts, wellbeing, sleep, routine, profile] = await Promise.all([
    getBiometricsWindow(days + 7),
    getWorkoutDates(since),
    getWellbeingDates(since),
    getSleepSince(since),
    getRoutine(),
    getNutritionProfile(),
  ]);
  const byDate = new Map(records.map((record) => [record.date, record]));
  const sleepByDate = new Map(
    sleep.map((entry) => [entry.date, sleepMinutes(entry.bedtime, entry.wakeTime)]),
  );
  const trained = new Set(workouts);
  const checked = new Set(wellbeing);
  const lastWeight =
    [...records].sort((a, b) => b.date.localeCompare(a.date)).find((record) => record.weightKg)?.weightKg ??
    null;
  const targets = { calories: profile?.calorieTarget ?? 0, protein: profile?.proteinTarget ?? 0 };
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(since, index);
    const [year, month, day] = date.split("-").map(Number);
    return {
      date,
      compliance: dayCompliance(
        {
          record: byDate.get(date) ?? null,
          trained: trained.has(date),
          trainingDay: routine.days.includes(weekdayOf(new Date(year, month - 1, day))),
          sleepMinutes: sleepByDate.get(date) ?? null,
          wellbeingDone: checked.has(date),
        },
        {
          ...targets,
          // Agua: la meta del día, con el entrenamiento si toca.
          water: waterTargetMl(
            lastWeight,
            routine.days.includes(weekdayOf(new Date(year, month - 1, day))) ? routine.sessionMinutes : 0,
          ),
        },
      ),
    };
  });
}
