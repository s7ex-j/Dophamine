import { getDatabase } from "@/src/db/database";
import { dateKey, type Habit } from "@/src/features/habits/habits";

export type HabitEntry = { id: string; date: string; completed: boolean };
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function toggleHabit(habitId: string, date = dateKey()) {
  const db = await getDatabase();
  const entry = await db.getFirstAsync<{ completed: number }>("SELECT completed FROM habit_entries WHERE habit_id = ? AND date = ?", habitId, date);
  const completed = entry?.completed !== 1;
  await db.runAsync("INSERT INTO habit_entries (id, habit_id, date, completed) VALUES (?, ?, ?, ?) ON CONFLICT(habit_id, date) DO UPDATE SET completed = excluded.completed", id(), habitId, date, completed ? 1 : 0);
  return completed;
}

export async function getHabitEntries(habits: Habit[], days: number): Promise<HabitEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ habit_id: string; date: string; completed: number }>("SELECT habit_id, date, completed FROM habit_entries WHERE date >= date('now', ?) ORDER BY date", `-${days - 1} days`);
  return rows.filter((row) => habits.some((habit) => habit.id === row.habit_id)).map((row) => ({ id: row.habit_id, date: row.date, completed: row.completed === 1 }));
}
