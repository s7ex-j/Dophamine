import { readStore, webId, writeStore } from "@/src/db/web-storage";
import { DEFAULT_ROUTINES, normalizeRoutine, type Routine } from "./training.plans";

export type Workout = { id: string; name: string; completedAt: string; exerciseCount: number };
export type SessionLog = { exerciseName: string; loadKg: number | null; reps: number | null; rir: number | null };
export type ProgressionHint = { exerciseName: string; detail: string; action: string };

export async function getRoutine(): Promise<Routine> {
  const routine = readStore().routines?.[0];
  return routine ? normalizeRoutine(routine) : { ...DEFAULT_ROUTINES.posterior, days: [...DEFAULT_ROUTINES.posterior.days], exercises: [...DEFAULT_ROUTINES.posterior.exercises] };
}

export async function saveRoutine(routine: Routine) {
  const store = readStore();
  store.routines = [routine];
  writeStore(store);
}

export async function completeRoutine(routine: Routine, logs: SessionLog[] = []) {
  const store = readStore();
  store.workouts.unshift({ id: webId(), name: routine.name, completedAt: new Date().toISOString(), exerciseCount: routine.exercises.length, sessionLogs: logs });
  writeStore(store);
}

export async function getRecentWorkouts(): Promise<Workout[]> {
  return readStore().workouts.slice(0, 8).map((workout) => ({ ...workout, exerciseCount: workout.exerciseCount ?? 0 }));
}

export async function getProgressionHints(routine: Routine): Promise<ProgressionHint[]> {
  const workouts = readStore().workouts;
  return routine.exercises.flatMap((exercise) => {
    const log = workouts.flatMap((workout) => workout.sessionLogs ?? []).find((item) => item.exerciseName === exercise.name && item.loadKg && item.reps);
    if (!log?.loadKg || !log.reps) return [];
    const upper = Number(exercise.reps.split("–").at(-1)?.replace(/\D/g, "")) || 12;
    return [{ exerciseName: exercise.name, detail: `${log.loadKg} kg × ${log.reps}${log.rir === null ? "" : ` · RIR ${log.rir}`}`, action: log.reps >= upper && (log.rir === null || log.rir >= exercise.rir) ? "Prueba subir la carga un paso" : "Repite y busca mejorar una repetición" }];
  });
}
