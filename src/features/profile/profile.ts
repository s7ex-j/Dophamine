import type { WeightUnit } from "@/src/lib/units";
import { normalizeMealSetup } from "@/src/features/nutrition/meals";
import {
  estimateExpenditure,
  type ExpenditureEstimate,
  type RecentTrend,
  type TrainingType,
} from "@/src/features/profile/expenditure";

export type Sex = "female" | "male";
export type ActivityLevel = "low" | "light" | "moderate" | "high";
export type Goal = "gain" | "maintain" | "lose";
/** Ritmo de cambio de peso elegido en la evaluación inicial. */
export type Pace = "gentle" | "moderate" | "fast";
export type ProteinLevel = "moderate" | "high" | "very_high";
/** Tiempo entrenando fuerza con constancia. Define cuánto músculo se puede ganar por semana. */
export type Experience = "beginner" | "intermediate" | "advanced";
/**
 * Quién decide los ajustes del objetivo calórico:
 * - auto: la app aplica el ajuste en cada revisión, avisa y permite deshacerlo.
 * - collaborative: la app propone y la persona acepta o descarta.
 * - manual: la app solo informa; no propone cambios.
 */
export type AdjustMode = "auto" | "collaborative" | "manual";
export type CheckInDays = 3 | 7;

export type NutritionProfile = {
  age: number;
  sex: Sex;
  heightCm: number;
  activity: ActivityLevel;
  goal: Goal;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatsTarget: number;
  /** Solo presentación: los pesos se guardan siempre en kg. Sin valor = kg. */
  weightUnit?: WeightUnit;
  // Lo que sigue llegó con la evaluación inicial (0.6.0). Todo es opcional para
  // que los planes creados antes sigan leyéndose igual.
  startWeightKg?: number;
  startDate?: string;
  goalWeightKg?: number;
  pace?: Pace;
  bodyFatPct?: number;
  proteinLevel?: ProteinLevel;
  adjustMode?: AdjustMode;
  checkInDays?: CheckInDays;
  // Evaluación ampliada (0.10.0). Con `trainingDays` el gasto inicial se calcula
  // con `expenditure.ts`; sin él, con el factor de actividad de antes. En estos
  // planes `activity` es el movimiento fuera del entrenamiento.
  trainingDays?: number;
  sessionMinutes?: number;
  trainingType?: TrainingType;
  experience?: Experience;
  knownIntake?: number;
  recentTrend?: RecentTrend;
  /** Gasto diario estimado al crear el plan, para mostrar de dónde salió el objetivo. */
  initialExpenditure?: number;
  /** Cómo se dividen las comidas del día (0.13.0). Sin valor: 4 con nombre. */
  mealStyle?: "named" | "numbered";
  mealsPerDay?: number;
};

export type PlanInput = Pick<NutritionProfile, "age" | "sex" | "heightCm" | "activity" | "goal"> &
  Partial<
    Pick<
      NutritionProfile,
      | "weightUnit"
      | "startWeightKg"
      | "startDate"
      | "goalWeightKg"
      | "pace"
      | "bodyFatPct"
      | "proteinLevel"
      | "adjustMode"
      | "checkInDays"
      | "trainingDays"
      | "sessionMinutes"
      | "trainingType"
      | "experience"
      | "knownIntake"
      | "recentTrend"
      | "mealStyle"
      | "mealsPerDay"
    >
  > & { weightKg: number };

export const weightUnitOf = (profile: Pick<NutritionProfile, "weightUnit"> | null | undefined): WeightUnit =>
  profile?.weightUnit ?? "kg";
export const adjustModeOf = (profile: Pick<NutritionProfile, "adjustMode"> | null | undefined): AdjustMode =>
  profile?.adjustMode ?? "collaborative";
export const checkInDaysOf = (
  profile: Pick<NutritionProfile, "checkInDays"> | null | undefined,
): CheckInDays => profile?.checkInDays ?? 7;

const activityFactors: Record<ActivityLevel, number> = {
  low: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};
/** Ajuste fijo de los planes sin ritmo elegido (los creados antes de la 0.6.0). */
export const goalAdjustments: Record<Goal, number> = { gain: 250, maintain: 0, lose: -350 };

/** Porcentaje del peso corporal por semana para cada ritmo. */
const paceRates: Record<Exclude<Goal, "maintain">, Record<Pace, number>> = {
  lose: { gentle: 0.25, moderate: 0.5, fast: 0.75 },
  gain: { gentle: 0.1, moderate: 0.25, fast: 0.4 },
};
// Quien empieza gana músculo más rápido y tolera un superávit mayor; quien lleva años, menos.
const gainByExperience: Record<Experience, number> = { beginner: 1.5, intermediate: 1, advanced: 0.6 };
const proteinPerKg: Record<ProteinLevel, number> = { moderate: 1.6, high: 2, very_high: 2.4 };
const KCAL_PER_KG = 7700;
const MIN_CALORIES = 1200;

/** Cambio de peso buscado, en kg por semana (negativo al bajar). Sin ritmo elegido devuelve null. */
export function targetWeeklyRateKg(
  profile: Pick<NutritionProfile, "goal" | "pace" | "experience">,
  weightKg: number,
): number | null {
  if (profile.goal === "maintain") return 0;
  if (!profile.pace) return null;
  const rate = (weightKg * paceRates[profile.goal][profile.pace]) / 100;
  if (profile.goal === "lose") return -rate;
  return rate * (profile.experience ? gainByExperience[profile.experience] : 1);
}

/** Calorías diarias por encima (o debajo) del gasto que corresponden al objetivo. */
export function goalCalorieOffset(
  profile: Pick<NutritionProfile, "goal" | "pace" | "experience">,
  weightKg: number,
): number {
  const rate = targetWeeklyRateKg(profile, weightKg);
  return rate === null ? goalAdjustments[profile.goal] : Math.round((rate * KCAL_PER_KG) / 7);
}

/**
 * Metabolismo basal. Con % de grasa se usa la masa magra (Katch-McArdle), que
 * es más precisa en cuerpos muy magros o con mucha grasa; sin él, Mifflin-St Jeor.
 */
export function basalMetabolicRate(
  input: Pick<PlanInput, "age" | "sex" | "heightCm" | "weightKg" | "bodyFatPct">,
) {
  if (input.bodyFatPct !== undefined && input.bodyFatPct > 0)
    return 370 + 21.6 * input.weightKg * (1 - input.bodyFatPct / 100);
  return 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + (input.sex === "male" ? 5 : -161);
}

/**
 * Desglose del gasto inicial de un plan hecho con la evaluación ampliada.
 * Devuelve null para los planes anteriores, que no tienen datos de entrenamiento.
 */
export function planEstimate(input: PlanInput): ExpenditureEstimate | null {
  if (input.trainingDays === undefined) return null;
  return estimateExpenditure({
    sex: input.sex,
    age: input.age,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    bodyFatPct: input.bodyFatPct,
    activity: input.activity,
    trainingDays: input.trainingDays,
    sessionMinutes: input.sessionMinutes ?? 60,
    trainingType: input.trainingType ?? "strength",
    knownIntake: input.knownIntake,
    recentTrend: input.recentTrend,
  });
}

export function buildNutritionProfile(input: PlanInput): NutritionProfile {
  const { weightKg, ...rest } = input;
  const estimate = planEstimate(input);
  const maintenance = estimate ? estimate.tdee : basalMetabolicRate(input) * activityFactors[input.activity];
  // Con la evaluación ampliada el objetivo nunca baja del metabolismo basal.
  const floor = estimate ? Math.max(MIN_CALORIES, estimate.bmr) : MIN_CALORIES;
  const calorieTarget = Math.max(floor, Math.round(maintenance + goalCalorieOffset(input, weightKg)));
  const proteinTarget = Math.round(weightKg * (input.proteinLevel ? proteinPerKg[input.proteinLevel] : 1.8));
  const fatsTarget = Math.round(weightKg * (estimate && input.goal === "gain" ? 1 : 0.8));
  const carbsTarget = Math.max(0, Math.round((calorieTarget - proteinTarget * 4 - fatsTarget * 9) / 4));
  return {
    ...rest,
    // `weightKg` se conserva en el perfil guardado por compatibilidad con planes anteriores.
    ...({ weightKg } as object),
    startWeightKg: input.startWeightKg ?? weightKg,
    ...(estimate ? { initialExpenditure: estimate.tdee } : {}),
    calorieTarget,
    proteinTarget,
    carbsTarget,
    fatsTarget,
  };
}

export function withCalorieTarget(profile: NutritionProfile, calorieTarget: number): NutritionProfile {
  const target = Math.max(MIN_CALORIES, Math.round(calorieTarget));
  return {
    ...profile,
    calorieTarget: target,
    carbsTarget: Math.max(0, Math.round((target - profile.proteinTarget * 4 - profile.fatsTarget * 9) / 4)),
  };
}

export type GoalProgress = {
  startKg: number;
  currentKg: number;
  goalKg: number;
  /** 0–100: cuánto del camino entre el peso inicial y la meta ya se recorrió. */
  percent: number;
  remainingKg: number;
  /** Semanas estimadas al ritmo elegido; null si no hay ritmo o ya se llegó. */
  weeksLeft: number | null;
  reached: boolean;
};

/** Avance hacia el peso meta, medido con la tendencia y no con el pesaje del día. */
export function goalProgress(profile: NutritionProfile, currentKg: number | null): GoalProgress | null {
  if (!profile.goalWeightKg || !profile.startWeightKg || !currentKg || profile.goal === "maintain")
    return null;
  const total = profile.goalWeightKg - profile.startWeightKg;
  if (total === 0) return null;
  const done = currentKg - profile.startWeightKg;
  const percent = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
  const remaining = profile.goalWeightKg - currentKg;
  const reached = total < 0 ? remaining >= 0 : remaining <= 0;
  const rate = targetWeeklyRateKg(profile, currentKg);
  return {
    startKg: profile.startWeightKg,
    currentKg,
    goalKg: profile.goalWeightKg,
    percent: reached ? 100 : percent,
    remainingKg: reached ? 0 : Math.abs(remaining),
    weeksLeft: reached || !rate ? null : Math.ceil(Math.abs(remaining / rate)),
    reached,
  };
}

export const goalLabels: Record<Goal, string> = {
  gain: "Volumen",
  maintain: "Mantenimiento",
  lose: "Definición",
};
export const activityLabels: Record<ActivityLevel, string> = {
  low: "Baja",
  light: "Ligera",
  moderate: "Moderada",
  high: "Alta",
};
export const adjustModeLabels: Record<AdjustMode, string> = {
  auto: "Automático",
  collaborative: "Colaborativo",
  manual: "Manual",
};

/** La configuración de comidas del plan. */
export const mealSetupOf = (
  profile: Pick<NutritionProfile, "mealStyle" | "mealsPerDay"> | null | undefined,
) => normalizeMealSetup({ style: profile?.mealStyle, count: profile?.mealsPerDay });
