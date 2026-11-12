import { readStore, webId, writeStore } from "@/src/db/web-storage";
import { progressionHintFor, type ProgressionHint } from "./progression";
import { DEFAULT_ROUTINES, normalizeRoutine, type Routine } from "./training.plans";

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
  const logs = readStore().workouts.flatMap((workout) => workout.sessionLogs ?? []);
  return routine.exercises.flatMap((exercise) => {
    const last = logs.find((item) => item.exerciseName === exercise.name && item.loadKg && item.reps);
    const hint = progressionHintFor(exercise, last);
    return hint ? [hint] : [];
  });
}
