/**
 * Sobriedad: contadores de días sin un hábito que la persona quiere dejar
 * (alcohol, tabaco, azúcar…). Una recaída no borra nada: empieza un conteo
 * nuevo y la mejor racha se conserva. Módulo puro; se guarda en ajustes
 * (`sobriety`), solo en el dispositivo.
 */
export const SOBRIETY_KEY = "sobriety";

export type SoberHabit = {
  id: string;
  name: string;
  /** Desde cuándo (fecha y hora ISO). */
  since: string;
  /** Cuánto gastabas por día en eso, opcional. */
  costPerDay?: number;
  /** Mejor racha anterior, en días. */
  bestDays: number;
  /** Fechas (AAAA-MM-DD) de cada nuevo comienzo. */
  restarts: string[];
};

export const MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];
const DAY = 86_400_000;

export function elapsed(habit: SoberHabit, now: Date) {
  const ms = Math.max(0, now.getTime() - Date.parse(habit.since));
  return { days: Math.floor(ms / DAY), hours: Math.floor((ms % DAY) / 3_600_000), ms };
}

/** El próximo hito y cuánto falta (0 a 1) para llegar desde el anterior. */
export function nextMilestone(days: number): { target: number | null; previous: number; progress: number } {
  const target = MILESTONES.find((value) => value > days) ?? null;
  const previous = [...MILESTONES].reverse().find((value) => value <= days) ?? 0;
  if (target === null) return { target: null, previous, progress: 1 };
  return { target, previous, progress: (days - previous) / (target - previous) };
}

/** La mejor racha contando la actual. */
export const bestDays = (habit: SoberHabit, now: Date) => Math.max(habit.bestDays, elapsed(habit, now).days);

export const moneySaved = (habit: SoberHabit, now: Date) =>
  habit.costPerDay ? Math.round(elapsed(habit, now).days * habit.costPerDay) : 0;

export function createHabit(name: string, id: string, now: Date, costPerDay?: number): SoberHabit | null {
  const clean = name.trim();
  if (!clean) return null;
  return {
    id,
    name: clean,
    since: now.toISOString(),
    ...(costPerDay && costPerDay > 0 ? { costPerDay } : {}),
    bestDays: 0,
    restarts: [],
  };
}

/** Empezar de nuevo: guarda la mejor racha y reinicia el conteo. */
export function restart(habit: SoberHabit, now: Date, dateKey: string): SoberHabit {
  return {
    ...habit,
    bestDays: bestDays(habit, now),
    since: now.toISOString(),
    restarts: [...habit.restarts, dateKey],
  };
}

/** Lee lo guardado. Lo que no tenga forma de contador se descarta. */
export function readHabits(value: unknown): SoberHabit[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is SoberHabit =>
      Boolean(item) &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      typeof item.since === "string" &&
      !Number.isNaN(Date.parse(item.since)) &&
      typeof item.bestDays === "number" &&
      Array.isArray(item.restarts),
  );
}
