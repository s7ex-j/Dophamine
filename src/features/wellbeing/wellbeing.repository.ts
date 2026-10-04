import { getDatabase } from "@/src/db/database";

export type WellbeingInput = { mood: number; energy: number; stress: number; sleepHours: number; note: string };
export async function saveWellbeingEntry({ mood, energy, stress, sleepHours, note }: WellbeingInput) {
  const db = await getDatabase();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const date = new Date().toISOString().slice(0, 10);
  await db.runAsync("INSERT INTO wellbeing_entries (id, date, mood, energy, stress, sleep_hours, note) VALUES (?, ?, ?, ?, ?, ?, ?)", id, date, mood, energy, stress, sleepHours || null, note.trim());
}

export async function getLatestMood(): Promise<number | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ mood: number }>("SELECT mood FROM wellbeing_entries ORDER BY created_at DESC LIMIT 1");
  return row?.mood ?? null;
}

export type WellbeingEntry = { id: string; date: string; mood: number; energy: number | null; stress: number | null; sleepHours: number | null; note: string };
export async function getRecentWellbeingEntries(): Promise<WellbeingEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; date: string; mood: number; energy: number | null; stress: number | null; sleep_hours: number | null; note: string }>("SELECT id, date, mood, energy, stress, sleep_hours, note FROM wellbeing_entries ORDER BY created_at DESC LIMIT 14");
  return rows.map((row) => ({ id: row.id, date: row.date, mood: row.mood, energy: row.energy, stress: row.stress, sleepHours: row.sleep_hours, note: row.note }));
}
