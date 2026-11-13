import { readStore, webId, writeStore } from "@/src/db/web-storage";
import type { SleepEntry, SleepInput } from "@/src/features/sleep/sleep";

// Variante web. Mismas funciones que la de SQLite.
export async function saveSleep(input: SleepInput, date: string, source: SleepEntry["source"] = "manual") {
  const store = readStore();
  const existing = (store.sleep ?? []).find((entry) => entry.date === date);
  const entry: SleepEntry = { id: existing?.id ?? webId(), date, ...input, source };
  store.sleep = [...(store.sleep ?? []).filter((item) => item.date !== date), entry];
  writeStore(store);
}

export async function deleteSleep(date: string) {
  const store = readStore();
  store.sleep = (store.sleep ?? []).filter((entry) => entry.date !== date);
  writeStore(store);
}

/** Las noches desde una fecha, de la más antigua a la más reciente. */
export async function getSleepSince(date: string): Promise<SleepEntry[]> {
  return (readStore().sleep ?? [])
    .filter((entry) => entry.date >= date)
    .sort((a, b) => a.date.localeCompare(b.date));
}
