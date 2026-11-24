import { targetsForWeekday } from "@/src/features/profile/targets";
import { getBiometricsWindow, type DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { dayCompliance, type DayCompliance, type Targets } from "@/src/features/habits/compliance";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { weekdayOf } from "@/src/features/reminders/reminders";
import { sleepMinutes } from "@/src/features/sleep/sleep";
import { getSleepSince } from "@/src/features/sleep/sleep.repository";
import { getRoutine, getWorkoutDates } from "@/src/features/training/training.repository";
import { getWellbeingDates } from "@/src/features/wellbeing/wellbeing.repository";
import { waterTargetMl } from "@/src/features/water/water";
import { addDays, localDateKey } from "@/src/lib/dates";

export type ComplianceDay = {
  date: string;
  compliance: DayCompliance;
  /** Ese día se anotó algo (un día vacío de descanso no cuenta como cumplido en el calendario). */
  logged: boolean;
  record: DailyBiometrics | null;
  sleepMinutes: number | null;
  trained: boolean;
  trainingDay: boolean;
  targets: Targets;
};

// Junta lo registrado en distintas partes de la app para calcular el
// cumplimiento de cada día. Solo lee; las reglas están en compliance.ts.
export async function getComplianceDays(days: number): Promise<ComplianceDay[]> {
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
  const targets = (weekday: string) => {
    if (!profile) return { calories: 0, protein: 0 };
    const day = targetsForWeekday(profile, weekday, routine.days);
    return { calories: day.calories, protein: day.protein };
  };
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(since, index);
    const [year, month, day] = date.split("-").map(Number);
    const weekday = weekdayOf(new Date(year, month - 1, day));
    const trainingDay = routine.days.includes(weekday);
    const facts = {
      record: byDate.get(date) ?? null,
      trained: trained.has(date),
      trainingDay,
      sleepMinutes: sleepByDate.get(date) ?? null,
      wellbeingDone: checked.has(date),
    };
    const dayTargets = {
      ...targets(weekday),
      // Agua: la meta del día, con el entrenamiento si toca.
      water: waterTargetMl(lastWeight, trainingDay ? routine.sessionMinutes : 0),
    };
    return {
      date,
      compliance: dayCompliance(facts, dayTargets),
      logged: Boolean(
        facts.record?.weightKg ||
        facts.record?.caloriesIn ||
        facts.record?.waterMl ||
        facts.record?.fasting ||
        facts.trained ||
        facts.sleepMinutes ||
        facts.wellbeingDone,
      ),
      record: facts.record,
      sleepMinutes: facts.sleepMinutes,
      trained: facts.trained,
      trainingDay,
      targets: dayTargets,
    };
  });
}
