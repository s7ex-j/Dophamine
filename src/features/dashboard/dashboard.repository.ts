import {
  getLatestBiometrics,
  getBiometricsWindow,
  type DailyBiometrics,
} from "@/src/features/biometrics/biometrics.repository";
import { analyzeMetabolism, type MetabolicAnalysis, type WeeklyCheckIn } from "@/src/features/tdee/tdee";
import { contextualCheckIn } from "@/src/features/tdee/checkin";
import { sleepSummary } from "@/src/features/sleep/sleep";
import { getSleepSince } from "@/src/features/sleep/sleep.repository";
import { addDays, localDateKey } from "@/src/lib/dates";
import { isReviewDue, type WeeklyReview } from "@/src/features/reviews/reviews";
import { getWeeklyReviews } from "@/src/features/reviews/reviews.repository";
import { getLatestMood } from "@/src/features/wellbeing/wellbeing.repository";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { checkInDaysOf, type NutritionProfile } from "@/src/features/profile/profile";
import { trainingNetMet } from "@/src/features/profile/expenditure";
import { trainingLoad, type TrainingLoad } from "@/src/features/training/energy";
import { getRoutine, getSessionHistory } from "@/src/features/training/training.repository";
import { weekdayId } from "@/src/features/training/week";
import type { CheckInContext } from "@/src/features/tdee/checkin";

export type DashboardSnapshot = {
  weightKg: number | null;
  /** Peso suavizado más reciente: la referencia para medir avance, no el pesaje del día. */
  trendKg: number | null;
  caloriesIn: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatsG: number | null;
  tdee: number | null;
  mood: number | null;
  profile: NutritionProfile | null;
  analysis: MetabolicAnalysis;
  checkIn: WeeklyCheckIn | null;
  recentRecords: DailyBiometrics[];
  /** Hasta 42 días, del más reciente al más antiguo. */
  records: DailyBiometrics[];
  lastReview: WeeklyReview | null;
  reviewDue: boolean;
  /** Entreno del periodo de revisión, real y previsto. */
  training: (TrainingLoad & NonNullable<CheckInContext["training"]>) | null;
  /** Días del periodo de revisión (3 o 7). */
  period: number;
  /** Sueño medio del periodo, en minutos. */
  sleepMinutes: number | null;
};
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [latest, records, mood, profile, reviews, sessions, routine] = await Promise.all([
    getLatestBiometrics(),
    getBiometricsWindow(42),
    getLatestMood(),
    getNutritionProfile(),
    getWeeklyReviews(1),
    getSessionHistory(60),
    getRoutine(),
  ]);
  // El contexto de la revisión: lo comido y lo dormido en el periodo (3 o 7 días).
  const period = checkInDaysOf(profile);
  const since = addDays(localDateKey(), -(period - 1));
  const nights = await getSleepSince(since);
  const lastReview = reviews[0] ?? null;
  const analysis = analyzeMetabolism(records);
  const sleepMinutes = nights.length ? sleepSummary(nights, period).averageMinutes : null;
  // Entreno del periodo: lo hecho (horario real y MET) frente a lo que dice la rutina.
  const today = localDateKey();
  const weightKg =
    analysis.points.at(-1)?.trendKg ?? records.find((record) => record.weightKg)?.weightKg ?? null;
  let training: DashboardSnapshot["training"] = null;
  if (weightKg) {
    const done = trainingLoad(sessions, since, today, weightKg, (session) =>
      localDateKey(new Date(session.completedAt)),
    );
    const planned = Array.from({ length: period }, (_, index) => addDays(since, index)).filter((date) => {
      const [year, month, day] = date.split("-").map(Number);
      return routine.days.includes(weekdayId(new Date(year, month - 1, day)));
    }).length;
    const minutes = profile?.sessionMinutes ?? routine.sessionMinutes;
    training = {
      ...done,
      done: done.sessions,
      planned,
      kcalPerDay: Math.round(done.kcal / period),
      plannedKcalPerDay: Math.round(
        (trainingNetMet(profile?.trainingType) * weightKg * planned * minutes) / 60 / period,
      ),
    };
  }
  return {
    weightKg: records.find((record) => record.weightKg)?.weightKg ?? latest?.weightKg ?? null,
    trendKg: analysis.points.at(-1)?.trendKg ?? null,
    caloriesIn: latest?.caloriesIn ?? null,
    proteinG: latest?.proteinG ?? null,
    carbsG: latest?.carbsG ?? null,
    fatsG: latest?.fatsG ?? null,
    tdee: analysis.tdee,
    mood,
    profile,
    analysis,
    checkIn: profile
      ? contextualCheckIn(analysis, profile, {
          recent: records.filter((record) => record.date >= since),
          sleepMinutes,
          training,
        })
      : null,
    recentRecords: [...records].slice(0, 7).reverse(),
    records,
    lastReview,
    reviewDue: isReviewDue(lastReview, undefined, checkInDaysOf(profile)),
    training,
    period,
    sleepMinutes,
  };
}
