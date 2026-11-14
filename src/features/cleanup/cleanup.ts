import type { Store } from "@/src/db/web-storage";
import { localDateKey } from "@/src/lib/dates";

/**
 * Borrar datos con precisión: por rango de fechas y por tipo (peso y
 * composición, comida, sueño, entrenos, bienestar), o todas las series de un
 * ejercicio. Trabaja sobre una copia de todos los datos; guardarla es de la
 * pantalla, que reemplaza todo en una sola transacción. Módulo puro.
 */
export type DataKind = "body" | "food" | "sleep" | "workouts" | "wellbeing";

export const KIND_LABELS: Record<DataKind, string> = {
  body: "Peso y composición",
  food: "Comidas",
  sleep: "Sueño",
  workouts: "Entrenos",
  wellbeing: "Bienestar",
};

const inRange = (date: string, from: string, to: string) => date >= from && date <= to;
const workoutDate = (completedAt: string) => localDateKey(new Date(completedAt));

/** Cuántos registros de cada tipo hay en el rango, para confirmar antes de borrar. */
export function countInRange(store: Store, from: string, to: string): Record<DataKind, number> {
  const days = store.biometrics.filter((record) => inRange(record.date, from, to));
  return {
    body: days.filter((record) => record.weightKg || record.bodyFatPct).length,
    food:
      (store.meals ?? []).filter((entry) => inRange(entry.date, from, to)).length ||
      days.filter((record) => record.caloriesIn > 0).length,
    sleep: (store.sleep ?? []).filter((entry) => inRange(entry.date, from, to)).length,
    workouts: store.workouts.filter((workout) => inRange(workoutDate(workout.completedAt), from, to)).length,
    wellbeing: store.wellbeing.filter((entry) => inRange(entry.date, from, to)).length,
  };
}

/** Los datos sin lo elegido dentro del rango. Un día que queda sin nada se quita. */
export function deleteRange(store: Store, from: string, to: string, kinds: DataKind[]): Store {
  const has = (kind: DataKind) => kinds.includes(kind);
  const biometrics = store.biometrics
    .map((record) => {
      if (!inRange(record.date, from, to)) return record;
      let next = { ...record };
      if (has("body"))
        next = {
          ...next,
          weightKg: null,
          bodyFatPct: null,
          muscleMassKg: null,
          waterPct: null,
          boneMassKg: null,
        };
      if (has("food"))
        next = { ...next, caloriesIn: 0, proteinG: 0, carbsG: 0, fatsG: 0, partial: false, fasting: false };
      return next;
    })
    .filter(
      (record) =>
        !inRange(record.date, from, to) ||
        Boolean(
          record.weightKg || record.bodyFatPct || record.caloriesIn > 0 || record.waterMl || record.fasting,
        ),
    );
  return {
    ...store,
    biometrics,
    meals: has("food") ? (store.meals ?? []).filter((entry) => !inRange(entry.date, from, to)) : store.meals,
    sleep: has("sleep") ? (store.sleep ?? []).filter((entry) => !inRange(entry.date, from, to)) : store.sleep,
    workouts: has("workouts")
      ? store.workouts.filter((workout) => !inRange(workoutDate(workout.completedAt), from, to))
      : store.workouts,
    wellbeing: has("wellbeing")
      ? store.wellbeing.filter((entry) => !inRange(entry.date, from, to))
      : store.wellbeing,
  };
}

/** Ejercicios con series guardadas y cuántas tiene cada uno. */
export function exerciseCounts(store: Store): Array<{ name: string; sets: number }> {
  const counts = new Map<string, number>();
  for (const workout of store.workouts)
    for (const set of workout.sets ?? [])
      counts.set(set.exerciseName, (counts.get(set.exerciseName) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, sets]) => ({ name, sets }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Los datos sin ninguna serie de ese ejercicio. Una sesión que queda vacía se quita. */
export function deleteExercise(store: Store, name: string): Store {
  return {
    ...store,
    workouts: store.workouts
      .map((workout) => ({
        ...workout,
        sets: (workout.sets ?? []).filter((set) => set.exerciseName !== name),
      }))
      .filter((workout) => workout.sets.length || workout.sessionLogs?.length),
  };
}
