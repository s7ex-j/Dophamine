import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { sleepMinutes, type SleepEntry } from "@/src/features/sleep/sleep";
import { addDays } from "@/src/lib/dates";

/**
 * Resumen de la semana pasada (lunes a domingo): peso medio y su cambio frente
 * a la semana anterior, calorías y proteína frente a la meta, entrenos, sueño
 * y cuántos días se registró. Módulo puro.
 */
export type WeeklySummary = {
  weekStart: string;
  weekEnd: string;
  loggedDays: number;
  avgWeightKg: number | null;
  weightChangeKg: number | null;
  avgKcal: number | null;
  kcalTarget: number;
  proteinDays: number;
  workouts: number;
  avgSleepMinutes: number | null;
};

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const round1 = (value: number) => Math.round(value * 10) / 10;

export function weeklySummary(input: {
  /** Lunes de la semana actual (AAAA-MM-DD). */
  thisMonday: string;
  records: DailyBiometrics[];
  workoutDates: string[];
  sleep: SleepEntry[];
  targets: { calories: number; protein: number };
}): WeeklySummary {
  const start = addDays(input.thisMonday, -7);
  const end = addDays(input.thisMonday, -1);
  const previousStart = addDays(start, -7);
  const inRange = (date: string, from: string, to: string) => date >= from && date <= to;
  const week = input.records.filter((record) => inRange(record.date, start, end));
  const before = input.records.filter((record) => inRange(record.date, previousStart, addDays(start, -1)));
  const weights = (list: DailyBiometrics[]) =>
    list.flatMap((record) => (record.weightKg ? [record.weightKg] : []));
  const avgWeight = average(weights(week));
  const avgBefore = average(weights(before));
  const eaten = week.filter((record) => record.caloriesIn > 0 && !record.partial);
  const avgKcal = average(eaten.map((record) => record.caloriesIn));
  const nights = input.sleep
    .filter((entry) => inRange(entry.date, start, end))
    .flatMap((entry) => {
      const minutes = sleepMinutes(entry.bedtime, entry.wakeTime);
      return minutes === null ? [] : [minutes];
    });
  const avgSleep = average(nights);
  const logged = new Set([
    ...week.filter((record) => record.weightKg || record.caloriesIn > 0).map((record) => record.date),
    ...input.workoutDates.filter((date) => inRange(date, start, end)),
  ]);
  return {
    weekStart: start,
    weekEnd: end,
    loggedDays: logged.size,
    avgWeightKg: avgWeight === null ? null : round1(avgWeight),
    weightChangeKg: avgWeight === null || avgBefore === null ? null : round1(avgWeight - avgBefore),
    avgKcal: avgKcal === null ? null : Math.round(avgKcal),
    kcalTarget: input.targets.calories,
    proteinDays: week.filter((record) => record.proteinG >= input.targets.protein * 0.9).length,
    workouts: new Set(input.workoutDates.filter((date) => inRange(date, start, end))).size,
    avgSleepMinutes: avgSleep === null ? null : Math.round(avgSleep),
  };
}
