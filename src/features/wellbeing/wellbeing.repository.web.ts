import { readStore, webId, webToday, writeStore } from "@/src/db/web-storage";

export type WellbeingEntry = { id: string; date: string; mood: number; note: string };
export async function saveWellbeingEntry({ mood, note }: { mood: number; note: string }) {
  const store = readStore();
  store.wellbeing.unshift({ id: webId(), date: webToday(), mood, note: note.trim() });
  writeStore(store);
}
export async function getLatestMood(): Promise<number | null> { return readStore().wellbeing[0]?.mood ?? null; }
export async function getRecentWellbeingEntries(): Promise<WellbeingEntry[]> { return readStore().wellbeing.slice(0, 7); }

