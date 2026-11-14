import { countsForIntake } from "@/src/features/biometrics/dailyLog";
import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { convertWeight, type WeightUnit } from "@/src/lib/units";
import { compositionChange } from "@/src/features/composition/composition";
import { checkInDaysOf, goalCalorieOffset, type NutritionProfile } from "@/src/features/profile/profile";

export type TrendPoint = {
  date: string;
  weightKg: number;
  trendKg: number;
  caloriesIn: number;
  /** El pesaje parecía agua o un salto puntual y pesó menos en la tendencia. */
  damped?: boolean;
};
export type ExpenditureStatus = "building" | "updating" | "holding";
export type MetabolicAnalysis = {
  points: TrendPoint[];
  tdee: number | null;
  /** Margen aproximado del gasto (±), según lo estable que es la tendencia. */
  tdeeMargin: number | null;
  weeklyRateKg: number | null;
  /** kcal por kg de cambio de peso: 7700 por defecto, ajustado con la composición si se mide. */
  energyPerKg: number;
  loggedDays: number;
  /** Días marcados como incompletos: no cuentan para la ingesta media. */
  partialDays: number;
  nutritionDaysLast7: number;
  weightDaysLast7: number;
  status: ExpenditureStatus;
};
export type WeeklyCheckIn = {
  status: ExpenditureStatus;
  message: string;
  suggestedCalories: number | null;
  delta: number | null;
  ready: boolean;
};

const DAY_MS = 86_400_000;
const dayIndex = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const dayDifference = (from: string, to: string) => Math.max(1, dayIndex(to) - dayIndex(from));

// Suavizado de la tendencia: cuánto se mueve hacia cada pesaje nuevo.
const ALPHA = 0.28;
const ALPHA_DAMPED = 0.1;
// Energía de cada kg según qué tejido cambia (grasa casi pura frente a masa magra con agua).
const KCAL_PER_KG_FAT = 9400;
const KCAL_PER_KG_LEAN = 1800;
export const KCAL_PER_KG_DEFAULT = 7700;

/**
 * Energía por kg de cambio de peso según lo medido: si la persona registra su %
 * de grasa y el cambio es claro, se usa la proporción real de grasa y masa magra.
 * Sin datos suficientes, el valor estándar de 7700 kcal/kg.
 */
export function energyPerKg(records: DailyBiometrics[]): number {
  const change = compositionChange(records);
  if (!change || Math.abs(change.weightDeltaKg) < 0.5) return KCAL_PER_KG_DEFAULT;
  const fatShare = Math.max(0, Math.min(1, change.fatMassDeltaKg / change.weightDeltaKg));
  return Math.round(fatShare * KCAL_PER_KG_FAT + (1 - fatShare) * KCAL_PER_KG_LEAN);
}

/** Pendiente de una recta ajustada por mínimos cuadrados y su error estándar. */
export function linearTrend(xs: number[], ys: number[]): { slope: number; standardError: number } {
  const n = xs.length;
  const meanX = xs.reduce((sum, x) => sum + x, 0) / n;
  const meanY = ys.reduce((sum, y) => sum + y, 0) / n;
  const sxx = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  if (n < 3 || sxx === 0) return { slope: 0, standardError: 0 };
  const slope = xs.reduce((sum, x, index) => sum + (x - meanX) * (ys[index] - meanY), 0) / sxx;
  const intercept = meanY - slope * meanX;
  const residuals = xs.reduce((sum, x, index) => sum + (ys[index] - (intercept + slope * x)) ** 2, 0);
  return { slope, standardError: Math.sqrt(residuals / (n - 2) / sxx) };
}

/**
 * Tendencia de peso suavizada. Un pesaje que se aparta más de 1.5 % de la
 * tendencia, o que llega con el % de agua 1.5 puntos fuera de lo habitual,
 * probablemente es agua (sal, carbohidratos, entrenamiento) y pesa menos.
 */
export function trendPoints(records: DailyBiometrics[]): TrendPoint[] {
  const weighed = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((record) =>
      typeof record.weightKg === "number" && record.weightKg > 0
        ? [{ ...record, weightKg: record.weightKg }]
        : [],
    );
  let trend = 0;
  let water: number | null = null;
  return weighed.map((record, index) => {
    const waterJump =
      water !== null && typeof record.waterPct === "number" && record.waterPct > 0
        ? Math.abs(record.waterPct - water) >= 1.5
        : false;
    const weightJump = index > 0 && Math.abs(record.weightKg - trend) / trend > 0.015;
    const damped = index > 0 && (waterJump || weightJump);
    trend =
      index === 0 ? record.weightKg : trend + (damped ? ALPHA_DAMPED : ALPHA) * (record.weightKg - trend);
    if (typeof record.waterPct === "number" && record.waterPct > 0)
      water = water === null ? record.waterPct : water + 0.3 * (record.waterPct - water);
    return {
      date: record.date,
      weightKg: record.weightKg,
      trendKg: trend,
      caloriesIn: record.caloriesIn,
      ...(damped ? { damped: true } : {}),
    };
  });
}

export function analyzeMetabolism(records: DailyBiometrics[]): MetabolicAnalysis {
  const ordered = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const points = trendPoints(ordered);
  // Un día marcado como incompleto no representa lo que se comió: no cuenta para la media.
  const intakeDays = ordered.filter(countsForIntake);
  const partialDays = ordered.filter((record) => record.partial).length;
  const lastSeven = ordered.slice(-7);
  const nutritionDaysLast7 = lastSeven.filter(countsForIntake).length;
  const weightDaysLast7 = lastSeven.filter((record) => (record.weightKg ?? 0) > 0).length;
  const spanDays = points.length > 1 ? dayDifference(points[0].date, points[points.length - 1].date) : 0;
  const density = energyPerKg(ordered);
  const base = {
    points,
    energyPerKg: density,
    loggedDays: intakeDays.length,
    partialDays,
    nutritionDaysLast7,
    weightDaysLast7,
  };
  if (points.length < 14 || intakeDays.length < 10 || spanDays < 13)
    return { ...base, tdee: null, tdeeMargin: null, weeklyRateKg: null, status: "building" };
  // El ritmo sale de una recta ajustada a toda la tendencia, no solo de sus extremos.
  const first = dayIndex(points[0].date);
  const { slope, standardError } = linearTrend(
    points.map((point) => dayIndex(point.date) - first),
    points.map((point) => point.trendKg),
  );
  const weeklyRateKg = slope * 7;
  const averageIntake =
    intakeDays.reduce((total, record) => total + record.caloriesIn, 0) / intakeDays.length;
  const status: ExpenditureStatus = nutritionDaysLast7 >= 4 && weightDaysLast7 >= 1 ? "updating" : "holding";
  // Margen: incertidumbre de la pendiente más un 3 % por errores al registrar lo comido.
  const margin = 1.96 * standardError * density + 0.03 * averageIntake;
  return {
    ...base,
    tdee: Math.round(averageIntake - slope * density),
    tdeeMargin: Math.round(margin / 10) * 10,
    weeklyRateKg,
    status,
  };
}

export function estimateTdee(records: DailyBiometrics[]) {
  return analyzeMetabolism(records).tdee;
}

export function weeklyRecommendation(
  analysis: MetabolicAnalysis,
  goal: "gain" | "maintain" | "lose",
  currentWeightKg: number,
  unit: WeightUnit = "kg",
) {
  if (!analysis.tdee || analysis.weeklyRateKg === null)
    return "Registra al menos 14 días, con 10 días de ingesta, antes de ajustar el plan.";
  const desiredRate =
    goal === "gain" ? currentWeightKg * 0.0025 : goal === "lose" ? -currentWeightKg * 0.005 : 0;
  const difference = analysis.weeklyRateKg - desiredRate;
  if (Math.abs(difference) < 0.06)
    return "La tendencia coincide con tu objetivo. Mantén el plan una semana más.";
  const direction =
    (goal === "gain" && difference < 0) ||
    (goal === "lose" && difference > 0) ||
    (goal === "maintain" && analysis.weeklyRateKg < -0.06)
      ? "subir"
      : "bajar";
  return `La tendencia cambia ${analysis.weeklyRateKg >= 0 ? "+" : ""}${convertWeight(analysis.weeklyRateKg, "kg", unit).toFixed(2)} ${unit}/semana. Prueba ${direction} 100 kcal diarias y revisa en 7 días.`;
}

export function buildWeeklyCheckIn(analysis: MetabolicAnalysis, profile: NutritionProfile): WeeklyCheckIn {
  if (analysis.status === "building")
    return {
      status: "building",
      ready: false,
      suggestedCalories: null,
      delta: null,
      message: `Construyendo tu estimación: ${analysis.loggedDays}/10 días de ingesta y al menos 14 días de tendencia.`,
    };
  if (analysis.status === "holding")
    return {
      status: "holding",
      ready: false,
      suggestedCalories: null,
      delta: null,
      message: `Estimación en pausa: registra al menos 4 días de ingesta y 1 pesaje esta semana. Ahora llevas ${analysis.nutritionDaysLast7} y ${analysis.weightDaysLast7}.`,
    };
  if (!analysis.tdee)
    return {
      status: "building",
      ready: false,
      suggestedCalories: null,
      delta: null,
      message: "Aún no hay datos suficientes para una propuesta.",
    };
  const currentKg = analysis.points.at(-1)?.trendKg ?? 0;
  const desired = analysis.tdee + goalCalorieOffset(profile, currentKg);
  // Revisar más seguido pide pasos más cortos: ±50 kcal cada 3 días, ±100 cada 7.
  const step = checkInDaysOf(profile) === 3 ? 50 : 100;
  const delta = Math.max(-step, Math.min(step, Math.round(desired - profile.calorieTarget)));
  const suggestedCalories = profile.calorieTarget + delta;
  return {
    status: "updating",
    ready: true,
    suggestedCalories,
    delta,
    message:
      Math.abs(delta) < 25
        ? "Tu objetivo actual coincide con la estimación. Mantén el plan hasta la próxima revisión."
        : `La estimación sugiere ${delta > 0 ? "subir" : "bajar"} ${Math.abs(delta)} kcal por día para mantener el ritmo de tu objetivo.`,
  };
}

/** El gasto estimado al cierre de cada uno de los últimos `days` días con datos suficientes. */
export function expenditureSeries(
  records: DailyBiometrics[],
  days = 14,
): Array<{ date: string; tdee: number }> {
  const ordered = [...records].sort((a, b) => a.date.localeCompare(b.date));
  return ordered.slice(-days).flatMap((record) => {
    const tdee = analyzeMetabolism(ordered.filter((item) => item.date <= record.date)).tdee;
    return tdee === null ? [] : [{ date: record.date, tdee }];
  });
}

/** Lo comido menos el gasto estimado en los últimos días con ingesta. Negativo = déficit. */
export function energyBalance(
  records: DailyBiometrics[],
  tdee: number | null,
  days = 7,
): Array<{ date: string; intake: number; balance: number }> {
  if (!tdee) return [];
  return [...records]
    .filter(countsForIntake)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days)
    .map((record) => ({ date: record.date, intake: record.caloriesIn, balance: record.caloriesIn - tdee }));
}
