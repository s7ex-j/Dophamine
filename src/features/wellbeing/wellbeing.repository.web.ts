import { readStore, webId, webToday, writeStore } from "@/src/db/web-storage";

export type WellbeingEntry = { id: string; date: string; mood: number; energy: number | null; stress: number | null; sleepHours: number | null; note: string };
export async function saveWellbeingEntry({ mood, energy, stress, sleepHours, note }: { mood: number; energy: number; stress: number; sleepHours: number; note: string }) {
  const store = readStore();
  store.wellbeing.unshift({ id: webId(), date: webToday(), mood, energy, stress, sleepHours: sleepHours || undefined, note: note.trim() });
  writeStore(store);
}
export async function getLatestMood(): Promise<number | null> { return readStore().wellbeing[0]?.mood ?? null; }
export async function getRecentWellbeingEntries(): Promise<WellbeingEntry[]> { return readStore().wellbeing.slice(0, 14).map((entry) => ({ ...entry, energy: entry.energy ?? null, stress: entry.stress ?? null, sleepHours: entry.sleepHours ?? null })); }
