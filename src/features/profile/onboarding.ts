import { localDateKey } from "@/src/lib/dates";
import { toKg, weightValue, type WeightUnit } from "@/src/lib/units";
import { isValidPlanInput } from "@/src/features/profile/planInput";
import {
  adjustModeOf,
  checkInDaysOf,
  weightUnitOf,
  type ActivityLevel,
  type AdjustMode,
  type CheckInDays,
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
  "goal" | "body" | "composition" | "activity" | "target" | "protein" | "tracking" | "summary";

// Los campos de texto se guardan como texto porque vienen de formularios.
export type Answers = {
  goal: Goal;
  sex: Sex;
  age: string;
  height: string;
  weight: string;
  unit: WeightUnit;
  bodyFat: string;
  activity: ActivityLevel;
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
    "target",
    "protein",
    "tracking",
  ];
  return [...steps.filter((step) => goal !== "maintain" || step !== "target"), "summary"];
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
    activity: profile?.activity ?? "moderate",
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
    proteinLevel: answers.proteinLevel,
    adjustMode: answers.adjustMode,
    checkInDays: answers.checkInDays,
  };
}
