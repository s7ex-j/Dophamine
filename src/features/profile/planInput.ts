import { weightValue, type WeightUnit } from "@/src/lib/units";

export type PlanInput = { age: number; heightCm: number; weightKg: number };

/** Rangos razonables para crear un plan. Evitan cálculos con datos imposibles o mal escritos. */
export const PLAN_LIMITS = {
  age: { min: 13, max: 100 },
  heightCm: { min: 120, max: 230 },
  /** El mínimo no entra: más de 30 kg. Vale también para el peso meta y el del día. */
  weightKg: { min: 30, max: 300 },
} as const;

export const isValidWeightKg = (kg: number) =>
  Number.isFinite(kg) && kg > PLAN_LIMITS.weightKg.min && kg <= PLAN_LIMITS.weightKg.max;

/** El rango del peso en la unidad de la persona, sin decimales. */
export function weightRange(unit: WeightUnit): { min: string; max: string } {
  const { min, max } = PLAN_LIMITS.weightKg;
  return { min: weightValue(min, unit, 0), max: weightValue(max, unit, 0) };
}

/** Para un aviso: "30 y 300 kg". */
export function weightRangeText(unit: WeightUnit): string {
  const { min, max } = weightRange(unit);
  return `${min} y ${max} ${unit}`;
}

/** Qué dato está mal, con su rango; null si los tres sirven. Se revisan en el orden en que se ven. */
export function planInputProblem(
  { age, heightCm, weightKg }: PlanInput,
  unit: WeightUnit = "kg",
): string | null {
  const { age: ages, heightCm: heights } = PLAN_LIMITS;
  if (!(Number.isInteger(age) && age >= ages.min && age <= ages.max))
    return `Escribe tu edad: entre ${ages.min} y ${ages.max} años, sin decimales.`;
  if (!(heightCm >= heights.min && heightCm <= heights.max))
    return `Escribe tu altura en centímetros: entre ${heights.min} y ${heights.max} cm.`;
  if (!isValidWeightKg(weightKg)) return `Escribe tu peso: entre ${weightRangeText(unit)}.`;
  return null;
}

export function isValidPlanInput(input: PlanInput): boolean {
  return planInputProblem(input) === null;
}
