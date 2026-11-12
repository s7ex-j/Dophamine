import { localDateKey } from "@/src/lib/dates";
import { toKg, weightValue, type WeightUnit } from "@/src/lib/units";
import type { RecentTrend, TrainingType } from "@/src/features/profile/expenditure";
import { isValidPlanInput } from "@/src/features/profile/planInput";
import {
  adjustModeOf,
  checkInDaysOf,
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
  | "composition"
  | "activity"
  | "training"
  | "intake"
  | "target"
  | "protein"
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
};

/** Mantener no tiene peso meta ni ritmo, así que se salta ese paso. */
export function stepsFor(goal: Goal): OnboardingStep[] {
  const steps: OnboardingStep[] = [
    "goal",
    "body",
    "composition",
    "activity",
    "training",
    "intake",
    "target",
    "protein",
    "tracking",
  ];
  return [...steps.filter((step) => goal !== "maintain" || step !== "target"), "summary"];
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

export function answersFrom(profile: NutritionProfile | null, weightKg: number | null): Answers {
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
  };
}

const weightKgOf = (answers: Answers) => toKg(Number(answers.weight), answers.unit);
const goalWeightKgOf = (answers: Answers) => toKg(Number(answers.goalWeight), answers.unit);

/** Mensaje a mostrar si el paso no se puede dar por bueno, o null si está completo. */
export function stepError(step: OnboardingStep, answers: Answers): string | null {
  if (step === "body") {
    const input = {
      age: Number(answers.age),
      heightCm: Number(answers.height),
      weightKg: weightKgOf(answers),
    };
    return isValidPlanInput(input) ? null : "Revisa edad, altura y peso: alguno falta o está fuera de rango.";
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
    if (!(target > 30 && target <= 300)) return "Escribe tu peso meta.";
    if (answers.goal === "lose" && target >= current)
      return "Para definición, el peso meta debe ser menor al actual.";
    if (answers.goal === "gain" && target <= current)
      return "Para volumen, el peso meta debe ser mayor al actual.";
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
  };
}
