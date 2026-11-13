import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { SLEEP_ENOUGH_MINUTES } from "@/src/features/sleep/sleep";

/**
 * Cumplimiento del día: siete compromisos que se marcan solos con lo que ya se
 * registró. Reemplaza a los hábitos que había que marcar a mano. Módulo puro.
 */
export type ComplianceKey = "calories" | "protein" | "water" | "weight" | "training" | "sleep" | "wellbeing";

export const COMPLIANCE_ITEMS: Array<{ key: ComplianceKey; label: string; rule: string }> = [
  { key: "calories", label: "Calorías", rule: "Dentro de ±10 % de tu meta" },
  { key: "protein", label: "Proteína", rule: "Al menos el 90 % de tu meta" },
  { key: "water", label: "Agua", rule: "Llegar a tu meta de agua" },
  { key: "weight", label: "Pesaje", rule: "Peso registrado" },
  { key: "training", label: "Entreno", rule: "Sesión registrada, o día de descanso" },
  { key: "sleep", label: "Sueño", rule: "7 horas o más" },
  { key: "wellbeing", label: "Bienestar", rule: "Chequeo hecho" },
];

export type DayFacts = {
  record: DailyBiometrics | null;
  /** Hubo una sesión de entreno registrada ese día. */
  trained: boolean;
  /** La rutina tiene entreno ese día de la semana. */
  trainingDay: boolean;
  sleepMinutes: number | null;
  wellbeingDone: boolean;
};
export type Targets = { calories: number; protein: number; water: number };
export type DayCompliance = Record<ComplianceKey, boolean>;

export function dayCompliance(facts: DayFacts, targets: Targets): DayCompliance {
  const calories = facts.record?.caloriesIn ?? 0;
  const protein = facts.record?.proteinG ?? 0;
  return {
    calories: calories > 0 && Math.abs(calories - targets.calories) <= targets.calories * 0.1,
    protein: targets.protein > 0 && protein >= targets.protein * 0.9,
    water: targets.water > 0 && (facts.record?.waterMl ?? 0) >= targets.water,
    weight: (facts.record?.weightKg ?? 0) > 0,
    // Un día de descanso cuenta como cumplido: descansar también es parte del plan.
    training: facts.trained || !facts.trainingDay,
    sleep: (facts.sleepMinutes ?? 0) >= SLEEP_ENOUGH_MINUTES,
    wellbeing: facts.wellbeingDone,
  };
}

export const complianceScore = (compliance: DayCompliance) =>
  Object.values(compliance).filter(Boolean).length;

/** Días seguidos, contando hacia atrás desde el último, que cumplieron un compromiso. */
export function streak(days: DayCompliance[], key: ComplianceKey): number {
  let count = 0;
  for (let index = days.length - 1; index >= 0 && days[index][key]; index -= 1) count += 1;
  return count;
}

/** Porcentaje de días que cumplieron cada compromiso. */
export function complianceRates(days: DayCompliance[]): Record<ComplianceKey, number> {
  return Object.fromEntries(
    COMPLIANCE_ITEMS.map(({ key }) => [
      key,
      days.length ? Math.round((days.filter((day) => day[key]).length / days.length) * 100) : 0,
    ]),
  ) as Record<ComplianceKey, number>;
}
