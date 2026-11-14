/**
 * Mesociclos: bloques de 4 a 8 semanas que se repiten. Si tiene descarga, la
 * última semana del bloque baja el trabajo (la mitad de las series, 10 % menos
 * de carga y 2 repeticiones más en reserva) para recuperarse y seguir
 * progresando. Módulo puro.
 */
export type Cycle = { weeks: number; startDate: string; deload: boolean };

const DAY = 86_400_000;
const dayIndex = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY);

export type CycleWeek = { week: number; total: number; isDeload: boolean; deloadNext: boolean };

/** En qué semana del bloque cae una fecha (el bloque se repite al terminar). */
export function cycleWeek(cycle: Cycle, today: string): CycleWeek {
  const days = Math.max(0, dayIndex(today) - dayIndex(cycle.startDate));
  const total = Math.max(2, Math.round(cycle.weeks));
  const week = (Math.floor(days / 7) % total) + 1;
  return {
    week,
    total,
    isDeload: cycle.deload && week === total,
    deloadNext: cycle.deload && week === total - 1,
  };
}

/** Un ejercicio del plan en semana de descarga. */
export const deloadPlan = <T extends { sets: number; rir: number }>(plan: T): T => ({
  ...plan,
  sets: Math.max(1, Math.ceil(plan.sets / 2)),
  rir: plan.rir + 2,
});

/** Carga sugerida en semana de descarga: 10 % menos. */
export const deloadLoad = (kg: number) => Math.round(kg * 0.9 * 4) / 4;

/** Lee un bloque guardado; null si no sirve. */
export function readCycle(value: unknown): Cycle | null {
  if (!value || typeof value !== "object") return null;
  const cycle = value as Partial<Cycle>;
  return typeof cycle.weeks === "number" &&
    cycle.weeks >= 2 &&
    typeof cycle.startDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(cycle.startDate)
    ? { weeks: cycle.weeks, startDate: cycle.startDate, deload: cycle.deload !== false }
    : null;
}
