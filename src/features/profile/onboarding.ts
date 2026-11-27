import { addDays, localDateKey } from "@/src/lib/dates";
import { readGoalDate, type GoalDate } from "@/src/features/goals/goalDate";
import { toKg, weightValue, type WeightUnit } from "@/src/lib/units";
import type { RecentTrend, TrainingType } from "@/src/features/profile/expenditure";
import type { Allergen } from "@/src/features/health/foodTags";
import {
  isValidWeightKg,
  PLAN_LIMITS,
  planInputProblem,
  weightRange,
  weightRangeText,
} from "@/src/features/profile/planInput";
import type { DietType } from "@/src/features/profile/targets";
import type { ThemeId } from "@/src/theming/palettes";
import {
  adjustModeOf,
  checkInDaysOf,
  mealSetupOf,
  weightUnitOf,
  type ActivityLevel,
  type AdjustMode,
  type CheckInDays,
  type Experience,
  type Goal,
  type NutritionProfile,
  type Pace,
  type PlanInput,
  type ProteinLevel,
  type Sex,
} from "@/src/features/profile/profile";

/**
 * Evaluación inicial: las preguntas que arman el plan, una pantalla por tema.
 * Este módulo es puro (qué pasos hay, qué se valida, cómo se convierte en un
 * plan); el dibujo está en PlanWizard.tsx.
 */
export type OnboardingStep =
  | "goal"
  | "body"
  | "style"
  | "composition"
  | "activity"
  | "training"
  | "intake"
  | "target"
  | "deadline"
  | "protein"
  | "plan"
  | "meals"
  | "restrictions"
  | "files"
  | "tracking"
  | "summary";

// Los campos de texto se guardan como texto porque vienen de formularios.
export type Answers = {
  goal: Goal;
  sex: Sex;
  age: string;
  height: string;
  weight: string;
  unit: WeightUnit;
  bodyFat: string;
  /** Movimiento fuera del entrenamiento. */
  activity: ActivityLevel;
  trainingDays: number;
  sessionMinutes: number;
  trainingType: TrainingType;
  experience: Experience;
  knownIntake: string;
  recentTrend: RecentTrend;
  goalWeight: string;
  pace: Pace;
  proteinLevel: ProteinLevel;
  adjustMode: AdjustMode;
  checkInDays: CheckInDays;
  mealStyle: "named" | "numbered";
  mealsPerDay: number;
  /** Tipo de plan: cómo se reparten carbohidratos y grasas. */
  dietType: DietType;
  /** Alergias e intolerancias: van al perfil de salud. */
  avoid: Allergen[];
  /** Tema de color de la app; null = el sugerido según el perfil. */
  theme: ThemeId | null;
  /** Meta con fecha (opcional): llegar a un peso un día concreto. */
  hasDeadline: boolean;
  deadlineDate: string;
  /** Peso para esa fecha; vacío = el peso meta. */
  deadlineWeight: string;
  deadlineLabel: string;
};

/** Mantener no tiene peso meta, ritmo ni fecha, así que se saltan esos pasos. */
export function stepsFor(goal: Goal): OnboardingStep[] {
  const steps: OnboardingStep[] = [
    "goal",
    "body",
    "style",
    "composition",
    "activity",
    "training",
    "intake",
    "target",
    "deadline",
    "protein",
    "plan",
    "meals",
    "restrictions",
    "files",
    "tracking",
  ];
  return [
    ...steps.filter((step) => goal !== "maintain" || (step !== "target" && step !== "deadline")),
    "summary",
  ];
}

/** Referencias visuales de % de grasa, para quien no tiene una medición. */
export function bodyFatPresets(sex: Sex): Array<{ value: string; label: string; detail: string }> {
  return sex === "male"
    ? [
        { value: "10", label: "Muy definido", detail: "Abdominales marcados, venas visibles" },
        { value: "15", label: "Atlético", detail: "Abdominales visibles con buena luz" },
        { value: "20", label: "Promedio", detail: "Abdomen plano, sin marcar" },
        { value: "25", label: "Algo de grasa", detail: "Cintura ancha, abdomen blando" },
        { value: "30", label: "Grasa alta", detail: "Abdomen prominente" },
      ]
    : [
        { value: "18", label: "Muy definida", detail: "Abdomen marcado" },
        { value: "23", label: "Atlética", detail: "Abdomen plano y firme" },
        { value: "28", label: "Promedio", detail: "Curvas suaves, sin marcar" },
        { value: "33", label: "Algo de grasa", detail: "Cintura y caderas más anchas" },
        { value: "38", label: "Grasa alta", detail: "Abdomen prominente" },
      ];
}

/** Las respuestas de la meta con fecha a partir de la guardada (o una fecha a 12 semanas). */
export function deadlineAnswers(
  saved: GoalDate | null,
  unit: WeightUnit,
  today = localDateKey(),
): Pick<Answers, "hasDeadline" | "deadlineDate" | "deadlineWeight" | "deadlineLabel"> {
  return {
    hasDeadline: saved !== null,
    deadlineDate: saved?.date ?? addDays(today, 84),
    deadlineWeight: saved ? weightValue(saved.weightKg, unit) : "",
    deadlineLabel: saved?.label ?? "",
  };
}

export function answersFrom(
  profile: NutritionProfile | null,
  weightKg: number | null,
  saved: GoalDate | null = null,
): Answers {
  const unit = weightUnitOf(profile);
  return {
    goal: profile?.goal ?? "lose",
    sex: profile?.sex ?? "male",
    age: profile ? String(profile.age) : "",
    height: profile ? String(profile.heightCm) : "",
    weight: weightKg ? weightValue(weightKg, unit) : "",
    unit,
    bodyFat: profile?.bodyFatPct ? String(profile.bodyFatPct) : "",
    // Un plan anterior guardaba la actividad con el entrenamiento incluido: al
    // editarlo se parte de "ligera" para no contar el entrenamiento dos veces.
    activity: profile?.trainingDays === undefined ? "light" : profile.activity,
    trainingDays: profile?.trainingDays ?? 3,
    sessionMinutes: profile?.sessionMinutes ?? 60,
    trainingType: profile?.trainingType ?? "strength",
    experience: profile?.experience ?? "beginner",
    knownIntake: profile?.knownIntake ? String(profile.knownIntake) : "",
    recentTrend: profile?.recentTrend ?? "stable",
    goalWeight: profile?.goalWeightKg ? weightValue(profile.goalWeightKg, unit) : "",
    pace: profile?.pace ?? "moderate",
    proteinLevel: profile?.proteinLevel ?? "high",
    adjustMode: adjustModeOf(profile),
    checkInDays: checkInDaysOf(profile),
    // Por número sirve para cualquier cantidad de comidas; por nombre solo si la persona lo elige.
    mealStyle: profile ? mealSetupOf(profile).style : "numbered",
    mealsPerDay: mealSetupOf(profile).count,
    dietType: profile?.dietType ?? "balanced",
    avoid: [],
    theme: null,
    ...deadlineAnswers(saved, unit),
  };
}

const weightKgOf = (answers: Answers) => toKg(Number(answers.weight), answers.unit);
const goalWeightKgOf = (answers: Answers) => toKg(Number(answers.goalWeight), answers.unit);

/** La meta con fecha que sale de las respuestas, o null si no hay (o el objetivo es mantener). */
export function goalDateFrom(answers: Answers): GoalDate | null {
  if (answers.goal === "maintain" || !answers.hasDeadline) return null;
  const weight = answers.deadlineWeight.trim() || answers.goalWeight;
  const label = answers.deadlineLabel.trim();
  return readGoalDate({
    date: answers.deadlineDate.trim(),
    weightKg: toKg(Number(weight.replace(",", ".")), answers.unit),
    ...(label ? { label } : {}),
  });
}

/**
 * Aviso mientras se escribe: solo si un número ya pasó del máximo (uno bajo puede estar a medio escribir;
 * eso se avisa al continuar con `stepError`).
 */
export function tooHigh(step: OnboardingStep, answers: Answers): string | null {
  const over = (text: string, max: number) => Number(text.replace(",", ".")) > max;
  const maxWeight = Number(weightRange(answers.unit).max);
  if (step === "body") {
    if (over(answers.age, PLAN_LIMITS.age.max))
      return `La edad no puede pasar de ${PLAN_LIMITS.age.max} años.`;
    if (over(answers.height, PLAN_LIMITS.heightCm.max))
      return `La altura no puede pasar de ${PLAN_LIMITS.heightCm.max} cm.`;
    if (over(answers.weight, maxWeight)) return `El peso no puede pasar de ${maxWeight} ${answers.unit}.`;
  }
  if (step === "target" && over(answers.goalWeight, maxWeight))
    return `El peso meta no puede pasar de ${maxWeight} ${answers.unit}.`;
  return null;
}

/** Mensaje a mostrar si el paso no se puede dar por bueno, o null si está completo. */
export function stepError(step: OnboardingStep, answers: Answers, today = localDateKey()): string | null {
  if (step === "body") {
    const input = {
      age: Number(answers.age),
      heightCm: Number(answers.height),
      weightKg: weightKgOf(answers),
    };
    return planInputProblem(input, answers.unit);
  }
  if (step === "composition") {
    if (!answers.bodyFat.trim()) return null;
    const pct = Number(answers.bodyFat);
    return pct >= 3 && pct <= 60
      ? null
      : "El % de grasa debe estar entre 3 y 60. Déjalo vacío si no lo sabes.";
  }
  if (step === "intake") {
    if (!answers.knownIntake.trim()) return null;
    const kcal = Number(answers.knownIntake);
    return kcal >= 1000 && kcal <= 6000
      ? null
      : "Las calorías deben estar entre 1000 y 6000. Déjalo vacío si no las conoces.";
  }
  if (step === "target") {
    const current = weightKgOf(answers);
    const target = goalWeightKgOf(answers);
    if (!isValidWeightKg(target)) return `Escribe tu peso meta: entre ${weightRangeText(answers.unit)}.`;
    if (answers.goal === "lose" && target >= current)
      return "Para definición, el peso meta debe ser menor al actual.";
    if (answers.goal === "gain" && target <= current)
      return "Para volumen, el peso meta debe ser mayor al actual.";
  }
  if (step === "deadline" && answers.hasDeadline) {
    const goal = goalDateFrom(answers);
    if (!goal) return "Revisa la fecha (AAAA-MM-DD) y el peso para ese día.";
    if (goal.date <= today) return "La fecha tiene que ser después de hoy.";
  }
  return null;
}

/** Convierte las respuestas en la entrada del plan. `existing` conserva el punto de partida al editar. */
export function planInputFrom(
  answers: Answers,
  existing: Pick<NutritionProfile, "startWeightKg" | "startDate" | "goal"> | null = null,
  today = localDateKey(),
): PlanInput {
  const weightKg = weightKgOf(answers);
  const sameGoal = existing?.goal === answers.goal;
  const hasTarget = answers.goal !== "maintain";
  return {
    age: Number(answers.age),
    sex: answers.sex,
    heightCm: Number(answers.height),
    weightKg,
    activity: answers.activity,
    goal: answers.goal,
    weightUnit: answers.unit,
    // Cambiar de objetivo reinicia el punto de partida: el avance se mide desde hoy.
    startWeightKg: sameGoal ? (existing?.startWeightKg ?? weightKg) : weightKg,
    startDate: sameGoal ? (existing?.startDate ?? today) : today,
    ...(hasTarget ? { goalWeightKg: goalWeightKgOf(answers), pace: answers.pace } : {}),
    ...(answers.bodyFat.trim() ? { bodyFatPct: Number(answers.bodyFat) } : {}),
    trainingDays: answers.trainingDays,
    sessionMinutes: answers.trainingDays > 0 ? answers.sessionMinutes : 0,
    trainingType: answers.trainingType,
    experience: answers.experience,
    ...(answers.knownIntake.trim()
      ? { knownIntake: Number(answers.knownIntake), recentTrend: answers.recentTrend }
      : {}),
    proteinLevel: answers.proteinLevel,
    adjustMode: answers.adjustMode,
    checkInDays: answers.checkInDays,
    mealStyle: answers.mealStyle,
    mealsPerDay: answers.mealsPerDay,
  };
}
