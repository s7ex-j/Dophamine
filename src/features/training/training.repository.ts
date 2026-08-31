import { getDatabase } from "@/src/db/database";

export type Workout = { id: string; name: string; completedAt: string };
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function completePosteriorWorkout() {
  const db = await getDatabase();
  const workoutId = id();
  const timestamp = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync("INSERT INTO workouts (id, name, started_at, completed_at) VALUES (?, ?, ?, ?)", workoutId, "Rutina A · cadena posterior", timestamp, timestamp);
    const exercises = ["Hip thrust", "Peso muerto rumano", "Curl femoral", "Plancha"];
    for (const [index, exerciseName] of exercises.entries()) {
      await db.runAsync("INSERT INTO exercise_sets (id, workout_id, exercise_name, set_number) VALUES (?, ?, ?, ?)", id(), workoutId, exerciseName, index + 1);
    }
  });
}

export async function getRecentWorkouts(): Promise<Workout[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; name: string; completed_at: string }>("SELECT id, name, completed_at FROM workouts WHERE completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 6");
  return rows.map((row) => ({ id: row.id, name: row.name, completedAt: row.completed_at }));
}

