/**
 * Estimación inicial del gasto energético diario, antes de tener registros.
 *
 * Combina dos métodos independientes y, si la persona lo conoce, lo que come hoy:
 *
 * 1. Por componentes: metabolismo basal × actividad del día a día + entrenamiento.
 *    El basal es Mifflin-St Jeor; con % de grasa se promedia con una ecuación de
 *    masa magra (Cunningham si entrena con regularidad, Katch-McArdle si no).
 * 2. Requerimiento estimado de energía (EER) de las ingestas dietéticas de
 *    referencia (IOM, 2005), calibrado con agua doblemente marcada. Tiene una
 *    ecuación propia para menores de 19 años, que gastan más por crecimiento.
 *
 * Usar solo el primero subestima a personas jóvenes, livianas y activas; por eso
 * se promedian. Sigue siendo una estimación: a partir de dos semanas de registros
 * la app la reemplaza por el gasto observado (`tdee.ts`).
 */
export type DailyActivity = "low" | "light" | "moderate" | "high";
export type TrainingType = "strength" | "cardio" | "mixed";
export type RecentTrend = "stable" | "gaining" | "losing";

export type ExpenditureInput = {
  sex: "female" | "male";
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number;
  /** Movimiento fuera del entrenamiento: trabajo, estudio, traslados. */
  activity: DailyActivity;
  trainingDays: number;
  sessionMinutes: number;
  trainingType: TrainingType;
  /** Calorías que come hoy en promedio, si las conoce. */
  knownIntake?: number;
  /** Qué ha hecho su peso en el último mes, para interpretar esa ingesta. */
  recentTrend?: RecentTrend;
};

export type ExpenditureEstimate = {
  bmr: number;
  /** Gasto del día a día por encima del basal (incluye digerir la comida). */
  dailyActivity: number;
  /** Gasto del entrenamiento repartido por día. */
  training: number;
  /** Ajuste al combinar con el EER y con la ingesta declarada. */
  calibration: number;
  tdee: number;
  usedKnownIntake: boolean;
};

const activityIndex: Record<DailyActivity, number> = { low: 0, light: 1, moderate: 2, high: 3 };
// Basal × este factor = gasto sin contar el entrenamiento.
const neatFactor: Record<DailyActivity, number> = { low: 1.2, light: 1.35, moderate: 1.5, high: 1.7 };
// Gasto neto del entrenamiento en kcal por kg y hora (MET por encima del reposo).
const netMet: Record<TrainingType, number> = { strength: 3.5, mixed: 5, cardio: 6.5 };

export function mifflinStJeor(input: Pick<ExpenditureInput, "sex" | "age" | "heightCm" | "weightKg">) {
  return 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + (input.sex === "male" ? 5 : -161);
}

/** Metabolismo basal. Con % de grasa promedia Mifflin con una ecuación de masa magra. */
export function basalRate(input: ExpenditureInput): number {
  const mifflin = mifflinStJeor(input);
  if (!input.bodyFatPct || input.bodyFatPct <= 0) return mifflin;
  const leanKg = input.weightKg * (1 - input.bodyFatPct / 100);
  const trained = input.trainingDays >= 3;
  const fromLean = trained ? 500 + 22 * leanKg : 370 + 21.6 * leanKg;
  return (mifflin + fromLean) / 2;
}

/** Horas de entrenamiento por semana. */
export const weeklyTrainingHours = (input: Pick<ExpenditureInput, "trainingDays" | "sessionMinutes">) =>
  (Math.max(0, Math.min(7, input.trainingDays)) * Math.max(0, input.sessionMinutes)) / 60;

/** Categoría de actividad física del EER (0 sedentaria … 3 muy activa), sumando día a día y entrenamiento. */
export function activityCategory(
  input: Pick<ExpenditureInput, "activity" | "trainingDays" | "sessionMinutes">,
) {
  const hours = weeklyTrainingHours(input);
  const bump = hours >= 6 ? 2 : hours >= 2.5 ? 1 : 0;
  return Math.min(3, activityIndex[input.activity] + bump);
}

const PA = {
  man: [1, 1.11, 1.25, 1.48],
  woman: [1, 1.12, 1.27, 1.45],
  boy: [1, 1.13, 1.26, 1.42],
  girl: [1, 1.16, 1.31, 1.56],
};

/** Requerimiento estimado de energía (IOM 2005). Menores de 19 usan la ecuación de 9 a 18 años. */
export function estimatedEnergyRequirement(input: ExpenditureInput): number {
  const meters = input.heightCm / 100;
  const category = activityCategory(input);
  const { age, weightKg: kg } = input;
  if (age < 19)
    return input.sex === "male"
      ? 88.5 - 61.9 * age + PA.boy[category] * (26.7 * kg + 903 * meters) + 25
      : 135.3 - 30.8 * age + PA.girl[category] * (10 * kg + 934 * meters) + 25;
  return input.sex === "male"
    ? 662 - 9.53 * age + PA.man[category] * (15.91 * kg + 539.6 * meters)
    : 354 - 6.91 * age + PA.woman[category] * (9.36 * kg + 726 * meters);
}

// Cuánto se aleja la ingesta del gasto cuando el peso sube o baja a un ritmo típico.
const trendOffset: Record<RecentTrend, number> = { stable: 0, gaining: -250, losing: 250 };

export function estimateExpenditure(input: ExpenditureInput): ExpenditureEstimate {
  const bmr = basalRate(input);
  const dailyActivity = bmr * (neatFactor[input.activity] - 1);
  const training = netMet[input.trainingType] * input.weightKg * (weeklyTrainingHours(input) / 7);
  const components = bmr + dailyActivity + training;
  let tdee = (components + estimatedEnergyRequirement(input)) / 2;
  // Lo que la persona come con el peso estable es mejor dato que cualquier fórmula,
  // pero se declara de memoria y suele quedarse corto: pesa más, sin reemplazarla.
  const usedKnownIntake = Boolean(
    input.knownIntake && input.knownIntake >= 1000 && input.knownIntake <= 6000,
  );
  if (usedKnownIntake) {
    const observed = (input.knownIntake as number) + trendOffset[input.recentTrend ?? "stable"];
    tdee = observed * 0.6 + tdee * 0.4;
  }
  return {
    bmr: Math.round(bmr),
    dailyActivity: Math.round(dailyActivity),
    training: Math.round(training),
    calibration: Math.round(tdee - components),
    tdee: Math.round(tdee),
    usedKnownIntake,
  };
}
