import { daysBetween } from "@/src/features/calendar/calendar";
import type { GoalEta, GoalProgress } from "@/src/features/profile/profile";

/** Lo que dibuja Estrategia: la trayectoria hacia la meta y la energía del día. Módulo puro. */
export type TrajectoryPoint = { day: number; kg: number; trendKg: number };
export type Trajectory = {
  points: TrajectoryPoint[];
  /** Día 0 es el primer punto; `today` y `end` cuentan desde ahí. */
  today: number;
  end: number;
  currentKg: number;
  goalKg: number;
  /** Con el ritmo actual se llega a la meta en `end`. */
  arrives: boolean;
  min: number;
  max: number;
};

/** Cuánto de la proyección se muestra sin ritmo hacia la meta (días). */
const BLANK_DAYS = 21;
/** Lo pasado ocupa al menos esta parte del ancho: con una meta lejana no se aplasta. */
const PAST_SHARE = 0.3;

export function buildTrajectory(
  points: Array<{ date: string; weightKg: number; trendKg: number }>,
  progress: GoalProgress,
  eta: GoalEta | null,
  today: string,
): Trajectory | null {
  if (points.length < 2) return null;
  const start = points[0].date;
  const now = Math.max(1, daysBetween(start, today));
  const arrives = eta?.direction === "toward" && Boolean(eta.actualDate);
  const shown = points.map((point) => ({
    day: daysBetween(start, point.date),
    kg: point.weightKg,
    trendKg: point.trendKg,
  }));
  const values = [...shown.flatMap((point) => [point.kg, point.trendKg]), progress.goalKg];
  return {
    points: shown,
    today: now,
    end:
      arrives && eta?.actualDate ? Math.max(now + 1, daysBetween(start, eta.actualDate)) : now + BLANK_DAYS,
    currentKg: progress.currentKg,
    goalKg: progress.goalKg,
    arrives,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/** Posición horizontal (0 a 1) de un día: lo pasado y lo que falta, cada uno en su tramo. */
export function trajectoryX(trajectory: Trajectory, day: number): number {
  const { today, end } = trajectory;
  const split = Math.max(PAST_SHARE, Math.min(0.7, today / end));
  return day <= today ? (day / today) * split : split + ((day - today) / (end - today)) * (1 - split);
}

export type Energy = {
  eat: number;
  burn: number | null;
  /** Objetivo menos gasto: negativo es déficit. */
  balance: number | null;
  /** Ancho de cada barra, de 0 a 1. */
  eatShare: number;
  burnShare: number;
};

export function energyOf(eat: number, burn: number | null): Energy {
  const top = Math.max(eat, burn ?? 0, 1);
  return {
    eat,
    burn,
    balance: burn === null ? null : eat - burn,
    eatShare: eat / top,
    burnShare: burn === null ? 0 : burn / top,
  };
}

/** Número con signo tipográfico: "+50", "−0.70" o "0". */
export function signed(value: number, digits = 0): string {
  const text = Math.abs(value).toFixed(digits);
  return Number(text) === 0 ? text : `${value > 0 ? "+" : "−"}${text}`;
}
