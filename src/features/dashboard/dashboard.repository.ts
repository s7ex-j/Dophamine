import {
  getLatestBiometrics,
  getBiometricsWindow,
  type DailyBiometrics,
} from "@/src/features/biometrics/biometrics.repository";
import {
  analyzeMetabolism,
  buildWeeklyCheckIn,
  type MetabolicAnalysis,
  type WeeklyCheckIn,
} from "@/src/features/tdee/tdee";
import { isReviewDue, type WeeklyReview } from "@/src/features/reviews/reviews";
import { getWeeklyReviews } from "@/src/features/reviews/reviews.repository";
import { getLatestMood } from "@/src/features/wellbeing/wellbeing.repository";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { checkInDaysOf, type NutritionProfile } from "@/src/features/profile/profile";

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
};
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [latest, records, mood, profile, reviews] = await Promise.all([
    getLatestBiometrics(),
    getBiometricsWindow(42),
    getLatestMood(),
    getNutritionProfile(),
    getWeeklyReviews(1),
  ]);
  const lastReview = reviews[0] ?? null;
  const analysis = analyzeMetabolism(records);
  return {
    weightKg: latest?.weightKg ?? null,
    trendKg: analysis.points.at(-1)?.trendKg ?? null,
    caloriesIn: latest?.caloriesIn ?? null,
    proteinG: latest?.proteinG ?? null,
    carbsG: latest?.carbsG ?? null,
    fatsG: latest?.fatsG ?? null,
    tdee: analysis.tdee,
    mood,
    profile,
    analysis,
    checkIn: profile ? buildWeeklyCheckIn(analysis, profile) : null,
    recentRecords: [...records].slice(0, 7).reverse(),
    records,
    lastReview,
    reviewDue: isReviewDue(lastReview, undefined, checkInDaysOf(profile)),
  };
}
