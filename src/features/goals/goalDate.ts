import { forecastWeight, type AdaptiveEstimate } from "@/src/features/tdee/adaptive";
import { addDays } from "@/src/lib/dates";

/**
 * Meta con fecha: llegar a un peso un día concreto (un viaje, una boda, una
 * prueba física, un pesaje). Con el motor de autoajuste activo proyecta dónde
 * llegarías comiendo tu objetivo actual, con su margen, la probabilidad de
 * estar en la meta ese día y el cambio de calorías más chico que la sube al
 * 70 %. Se guarda en ajustes (`goal_date`). Módulo puro.
 */
export const GOAL_DATE_KEY = "goal_date";
export const TARGET_PROBABILITY = 0.7;
const STEPS = [50, 100, 150, 200, 250, 300];

export type GoalDate = { date: string; weightKg: number; label?: string };
export type GoalDatePlan = {
  daysLeft: number;
  /** kg por semana que hacen falta desde el peso real de hoy. */
  requiredWeeklyKg: number;
  /** Dónde llegarías con el objetivo actual (null sin motor activo). */
  projection: { kg: number; sd: number } | null;
  /** Probabilidad de estar en la meta o mejor ese día (null sin motor activo). */
  probability: number | null;
  /** Cambio de kcal diarias más chico que sube la probabilidad al 70 %; 0 si ya se llega; null si ni con 300. */
  suggestion: number | null;
  /** Puntos del camino proyectado, para dibujar: día, peso y margen (±1.96 σ). */
  path: Array<{ day: number; kg: number; band: number }>;
  /** Últimas dos semanas: no cambiar la dieta y entrenar más suave. */
  finalStretch: boolean;
  /** kg que te pasarías de la meta (más allá de su margen); 0 si no te pasas. */
  overshootKg: number;
};

export function readGoalDate(value: unknown): GoalDate | null {
  const raw = value as Partial<GoalDate> | null;
  if (!raw || typeof raw.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) return null;
  if (typeof raw.weightKg !== "number" || !(raw.weightKg > 25 && raw.weightKg < 350)) return null;
  return {
    date: raw.date,
    weightKg: raw.weightKg,
    ...(typeof raw.label === "string" ? { label: raw.label } : {}),
  };
}

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** Función de distribución de la normal estándar (Abramowitz y Stegun 7.1.26). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

export function goalDatePlan(
  goal: GoalDate,
  today: string,
  currentKg: number,
  calorieTarget: number,
  engine: AdaptiveEstimate | null,
): GoalDatePlan {
  const daysLeft = Math.max(0, daysBetween(today, goal.date));
  const losing = goal.weightKg < currentKg;
  const requiredWeeklyKg = daysLeft ? ((goal.weightKg - currentKg) / daysLeft) * 7 : 0;
  const chance = (calories: number) => {
    if (!engine) return null;
    const { kg, sd } = forecastWeight(engine, calories, daysLeft);
    const z = sd > 0 ? (goal.weightKg - kg) / sd : goal.weightKg >= kg ? 9 : -9;
    return losing ? normalCdf(z) : 1 - normalCdf(z);
  };
  const projection = engine ? forecastWeight(engine, calorieTarget, daysLeft) : null;
  const probability = chance(calorieTarget);
  let suggestion: number | null = null;
  if (probability !== null) {
    if (probability >= TARGET_PROBABILITY) suggestion = 0;
    else
      for (const step of STEPS) {
        const delta = losing ? -step : step;
        if ((chance(calorieTarget + delta) ?? 0) >= TARGET_PROBABILITY) {
          suggestion = delta;
          break;
        }
      }
  }
  const samples = Math.min(daysLeft, 8);
  const path = engine
    ? Array.from({ length: samples + 1 }, (_, index) => {
        const day = samples ? Math.round((daysLeft * index) / samples) : 0;
        const point = forecastWeight(engine, calorieTarget, day);
        return { day, kg: point.kg, band: 1.96 * point.sd };
      })
    : [];
  return {
    daysLeft,
    requiredWeeklyKg,
    projection,
    probability,
    suggestion,
    path,
    finalStretch: daysLeft > 0 && daysLeft <= 14,
    overshootKg: projection
      ? Math.max(
          0,
          (losing ? goal.weightKg - projection.kg : projection.kg - goal.weightKg) - 1.96 * projection.sd,
        )
      : 0,
  };
}

/** La fecha que queda a `weeks` semanas de hoy (para proponer una fecha al crear la meta). */
export const inWeeks = (today: string, weeks: number) => addDays(today, weeks * 7);
