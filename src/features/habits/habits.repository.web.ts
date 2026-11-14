import { readStore, writeStore } from "@/src/db/web-storage";
import { dateKey, type Habit } from "@/src/features/habits/habits";

export type HabitEntry = { id: string; date: string; completed: boolean };
export async function toggleHabit(habitId: string, date = dateKey()) {
  const store = readStore();
  store.habits ??= [];
  const entry = store.habits.find((item) => item.id === habitId && item.date === date);
  const completed = !(entry?.completed ?? false);
  if (entry) entry.completed = completed;
  else store.habits.push({ id: habitId, date, completed });
  writeStore(store);
  return completed;
}
