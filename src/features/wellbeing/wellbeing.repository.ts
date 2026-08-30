import { getDatabase } from "@/src/db/database";

export async function saveWellbeingEntry({ mood, note }: { mood: number; note: string }) {
  const db = await getDatabase();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const date = new Date().toISOString().slice(0, 10);
  await db.runAsync("INSERT INTO wellbeing_entries (id, date, mood, note) VALUES (?, ?, ?, ?)", id, date, mood, note.trim());
}

export async function getLatestMood(): Promise<number | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ mood: number }>("SELECT mood FROM wellbeing_entries ORDER BY created_at DESC LIMIT 1");
  return row?.mood ?? null;
}

