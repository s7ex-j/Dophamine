import { getDatabase } from "@/src/db/database";
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
const SETTINGS_KEY = "training_routine";
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function getRoutine(): Promise<Routine> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = ?",
    SETTINGS_KEY,
  );
  if (!row?.value)
    return {
      ...DEFAULT_ROUTINES.posterior,
      days: [...DEFAULT_ROUTINES.posterior.days],
      exercises: [...DEFAULT_ROUTINES.posterior.exercises],
    };
  try {
    return normalizeRoutine(JSON.parse(row.value));
  } catch {
    return DEFAULT_ROUTINES.posterior;
  }
}

export async function saveRoutine(routine: Routine) {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    SETTINGS_KEY,
    JSON.stringify(routine),
  );
}

export async function completeRoutine(routine: Routine, logs: SessionLog[] = []) {
  const db = await getDatabase();
  const workoutId = id();
  const timestamp = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "INSERT INTO workouts (id, name, started_at, completed_at) VALUES (?, ?, ?, ?)",
      workoutId,
      routine.name,
      timestamp,
      timestamp,
    );
    for (const exercise of routine.exercises) {
      const log = logs.find((item) => item.exerciseName === exercise.name);
      for (let set = 1; set <= exercise.sets; set += 1) {
        await db.runAsync(
          "INSERT INTO exercise_sets (id, workout_id, exercise_name, set_number, reps, load_kg, rpe) VALUES (?, ?, ?, ?, ?, ?, ?)",
          id(),
          workoutId,
          exercise.name,
          set,
          log?.reps ?? null,
          log?.loadKg ?? null,
          log?.rir === null || log?.rir === undefined ? null : 10 - log.rir,
        );
      }
    }
  });
}

export async function getRecentWorkouts(): Promise<Workout[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    completed_at: string;
    exercise_count: number;
  }>(
    "SELECT w.id, w.name, w.completed_at, COUNT(DISTINCT es.exercise_name) AS exercise_count FROM workouts w LEFT JOIN exercise_sets es ON es.workout_id = w.id WHERE w.completed_at IS NOT NULL GROUP BY w.id ORDER BY w.completed_at DESC LIMIT 8",
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    completedAt: row.completed_at,
    exerciseCount: row.exercise_count,
  }));
}

export async function deleteWorkoutSession(workoutId: string) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM exercise_sets WHERE workout_id = ?", workoutId);
    await db.runAsync("DELETE FROM workouts WHERE id = ?", workoutId);
  });
}

export async function getProgressionHints(routine: Routine): Promise<ProgressionHint[]> {
  const db = await getDatabase();
  const hints: ProgressionHint[] = [];
  for (const exercise of routine.exercises) {
    const row = await db.getFirstAsync<{ load_kg: number | null; reps: number | null; rpe: number | null }>(
      "SELECT load_kg, reps, rpe FROM exercise_sets WHERE exercise_name = ? AND load_kg IS NOT NULL ORDER BY rowid DESC LIMIT 1",
      exercise.name,
    );
    const hint = progressionHintFor(
      exercise,
      row ? { loadKg: row.load_kg, reps: row.reps, rir: row.rpe === null ? null : 10 - row.rpe } : null,
    );
    if (hint) hints.push(hint);
  }
  return hints;
}
