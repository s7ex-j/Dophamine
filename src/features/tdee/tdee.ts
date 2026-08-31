import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";

export type TrendPoint = { date: string; weightKg: number; trendKg: number; caloriesIn: number };
export type MetabolicAnalysis = { points: TrendPoint[]; tdee: number | null; weeklyRateKg: number | null; loggedDays: number };

const dayDifference = (from: string, to: string) => Math.max(1, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000));

export function analyzeMetabolism(records: DailyBiometrics[]): MetabolicAnalysis {
  const ordered = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let trend = 0;
  const points = ordered.map((record, index) => {
    trend = index === 0 ? record.weightKg : trend + 0.28 * (record.weightKg - trend);
    return { date: record.date, weightKg: record.weightKg, trendKg: trend, caloriesIn: record.caloriesIn };
  });
  const intakeDays = ordered.filter((record) => record.caloriesIn > 0);
  const spanDays = points.length > 1 ? dayDifference(points[0].date, points[points.length - 1].date) : 0;
  if (points.length < 14 || intakeDays.length < 10 || spanDays < 13) return { points, tdee: null, weeklyRateKg: null, loggedDays: intakeDays.length };
  const weeklyRateKg = ((points.at(-1)?.trendKg ?? 0) - points[0].trendKg) / spanDays * 7;
  const averageIntake = intakeDays.reduce((total, record) => total + record.caloriesIn, 0) / intakeDays.length;
  return { points, tdee: Math.round(averageIntake - weeklyRateKg / 7 * 7700), weeklyRateKg, loggedDays: intakeDays.length };
}

export function estimateTdee(records: DailyBiometrics[]) { return analyzeMetabolism(records).tdee; }

export function weeklyRecommendation(analysis: MetabolicAnalysis, goal: "gain" | "maintain" | "lose", currentWeightKg: number) {
  if (!analysis.tdee || analysis.weeklyRateKg === null) return "Registra al menos 14 días, con 10 días de ingesta, antes de ajustar el plan.";
  const desiredRate = goal === "gain" ? currentWeightKg * 0.0025 : goal === "lose" ? -currentWeightKg * 0.005 : 0;
  const difference = analysis.weeklyRateKg - desiredRate;
  if (Math.abs(difference) < 0.06) return "La tendencia coincide con tu objetivo. Mantén el plan una semana más.";
  const direction = (goal === "gain" && difference < 0) || (goal === "lose" && difference > 0) || (goal === "maintain" && analysis.weeklyRateKg < -0.06) ? "subir" : "bajar";
  return `La tendencia cambia ${analysis.weeklyRateKg >= 0 ? "+" : ""}${analysis.weeklyRateKg.toFixed(2)} kg/semana. Prueba ${direction} 100 kcal diarias y revisa en 7 días.`;
}

