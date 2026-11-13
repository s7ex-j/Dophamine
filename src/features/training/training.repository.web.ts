import { readStore, webId, writeStore } from "@/src/db/web-storage";
import { localDateKey } from "@/src/lib/dates";
import { progressionHintFor, type ProgressionHint } from "./progression";
import { DEFAULT_ROUTINES, normalizeRoutine, type Routine } from "./training.plans";
import type { CompletedSession } from "./workout";

export type Workout = { id: string; name: string; completedAt: string; exerciseCount: number };
export type SessionLog = {
  exerciseName: string;
  loadKg: number | null;
  reps: number | null;
  rir: number | null;
};
export type { ProgressionHint };

export async function getRoutine(): Promise<Routine> {
  const routine = readStore().routines?.[0];
  return routine
    ? normalizeRoutine(routine)
    : {
        ...DEFAULT_ROUTINES.posterior,
        days: [...DEFAULT_ROUTINES.posterior.days],
        exercises: [...DEFAULT_ROUTINES.posterior.exercises],
      };
}

export async function saveRoutine(routine: Routine) {
  const store = readStore();
  store.routines = [routine];
  writeStore(store);
}

export async function completeRoutine(routine: Routine, logs: SessionLog[] = []) {
  const store = readStore();
  store.workouts.unshift({
    id: webId(),
    name: routine.name,
    completedAt: new Date().toISOString(),
    exerciseCount: routine.exercises.length,
    sessionLogs: logs,
  });
  writeStore(store);
}

export async function getRecentWorkouts(): Promise<Workout[]> {
  return readStore()
    .workouts.slice(0, 8)
    .map((workout) => ({ ...workout, exerciseCount: workout.exerciseCount ?? 0 }));
}

export async function deleteWorkoutSession(workoutId: string) {
  const store = readStore();
  store.workouts = store.workouts.filter((workout) => workout.id !== workoutId);
  writeStore(store);
}

export async function getProgressionHints(routine: Routine): Promise<ProgressionHint[]> {
  // La línea por ejercicio de cada sesión, o sus series efectivas si solo tiene series.
  const logs = readStore().workouts.flatMap(
    (workout) => workout.sessionLogs ?? (workout.sets ?? []).filter((set) => set.type === "working"),
  );
  return routine.exercises.flatMap((exercise) => {
    const last = logs.find((item) => item.exerciseName === exercise.name && item.loadKg && item.reps);
    const hint = progressionHintFor(exercise, last);
    return hint ? [hint] : [];
  });
}

/** Fechas locales (AAAA-MM-DD) con al menos una sesión registrada desde `since`. */
export async function getWorkoutDates(since: string): Promise<string[]> {
  return [
    ...new Set(readStore().workouts.map((workout) => localDateKey(new Date(workout.completedAt)))),
  ].filter((date) => date >= since);
}

/** Guarda una sesión serie por serie. También deja una línea por ejercicio para las versiones anteriores. */
export async function completeSession(session: CompletedSession) {
  const store = readStore();
  const names = [...new Set(session.sets.map((set) => set.exerciseName))];
  store.workouts.unshift({
    id: session.id,
    name: session.name,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    exerciseCount: names.length,
    sessionLogs: names.map((exerciseName) => {
      const sets = session.sets.filter((set) => set.exerciseName === exerciseName);
      const main = sets.find((set) => set.type === "working") ?? sets[0];
      return { exerciseName, loadKg: main.loadKg, reps: main.reps, rir: main.rir };
    }),
    sets: session.sets,
  });
  writeStore(store);
}

/** Las sesiones con todas sus series, de la más reciente a la más antigua. */
export async function getSessionHistory(limit = 60): Promise<CompletedSession[]> {
  return [...readStore().workouts]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, limit)
    .map((workout) => ({
      id: workout.id,
      name: workout.name,
      startedAt: workout.startedAt ?? workout.completedAt,
      completedAt: workout.completedAt,
      // Las sesiones anteriores a la 0.12.0 tienen una sola línea por ejercicio.
      sets:
        workout.sets ??
        (workout.sessionLogs ?? []).map((log) => ({
          exerciseName: log.exerciseName,
          setNumber: 1,
          type: "working" as const,
          loadKg: log.loadKg,
          reps: log.reps,
          rir: log.rir,
        })),
    }));
}
