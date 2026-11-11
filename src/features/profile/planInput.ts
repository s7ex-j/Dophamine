export type PlanInput = { age: number; heightCm: number; weightKg: number };

/** Rangos razonables para crear un plan. Evita cálculos con datos imposibles. */
export function isValidPlanInput({ age, heightCm, weightKg }: PlanInput): boolean {
  return (
    Number.isInteger(age) &&
    age >= 13 &&
    age <= 100 &&
    heightCm >= 120 &&
    heightCm <= 230 &&
    weightKg > 30 &&
    weightKg <= 300
  );
}
