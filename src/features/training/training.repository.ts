import { readSetType } from "./sets";
import { getDatabase } from "@/src/db/database";
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
          log?.rir === null || log?.rir === undefined ? null : Math.min(10, Math.max(1, 10 - log.rir)),
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

/** Fechas locales (AAAA-MM-DD) con al menos una sesión registrada desde `since`. */
export async function getWorkoutDates(since: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ completed_at: string }>(
    "SELECT completed_at FROM workouts WHERE completed_at IS NOT NULL",
  );
  return [...new Set(rows.map((row) => localDateKey(new Date(row.completed_at))))].filter(
    (date) => date >= since,
  );
}

type SetRowDb = {
  workout_id: string;
  exercise_name: string;
  exercise_id: string | null;
  set_number: number;
  set_type: string | null;
  reps: number | null;
  load_kg: number | null;
  rpe: number | null;
  side: string | null;
};

/** Guarda una sesión serie por serie. */
export async function completeSession(session: CompletedSession) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "INSERT INTO workouts (id, name, started_at, completed_at) VALUES (?, ?, ?, ?)",
      session.id,
      session.name,
      session.startedAt,
      session.completedAt,
    );
    for (const set of session.sets)
      await db.runAsync(
        "INSERT INTO exercise_sets (id, workout_id, exercise_name, set_number, reps, load_kg, rpe, set_type, exercise_id, side) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id(),
        session.id,
        set.exerciseName,
        set.setNumber,
        set.reps,
        set.loadKg,
        set.rir === null ? null : Math.min(10, Math.max(1, 10 - set.rir)),
        set.type,
        set.exerciseId ?? null,
        set.side ?? null,
      );
  });
}

/** Las sesiones con todas sus series, de la más reciente a la más antigua. */
export async function getSessionHistory(limit = 60): Promise<CompletedSession[]> {
  const db = await getDatabase();
  const workouts = await db.getAllAsync<{
    id: string;
    name: string;
    started_at: string | null;
    completed_at: string;
  }>(
    "SELECT id, name, started_at, completed_at FROM workouts WHERE completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT ?",
    limit,
  );
  if (!workouts.length) return [];
  const rows = await db.getAllAsync<SetRowDb>(
    `SELECT workout_id, exercise_name, exercise_id, set_number, set_type, reps, load_kg, rpe, side FROM exercise_sets
    WHERE workout_id IN (${workouts.map(() => "?").join(", ")}) ORDER BY rowid`,
    ...workouts.map((workout) => workout.id),
  );
  return workouts.map((workout) => ({
    id: workout.id,
    name: workout.name,
    startedAt: workout.started_at ?? workout.completed_at,
    completedAt: workout.completed_at,
    sets: rows
      .filter((row) => row.workout_id === workout.id)
      .map((row) => ({
        exerciseName: row.exercise_name,
        ...(row.exercise_id ? { exerciseId: row.exercise_id } : {}),
        setNumber: row.set_number,
        type: readSetType(row.set_type),
        loadKg: row.load_kg,
        reps: row.reps,
        rir: row.rpe === null ? null : 10 - row.rpe,
        ...(row.side === "left" || row.side === "right" ? { side: row.side } : {}),
      })),
  }));
}
