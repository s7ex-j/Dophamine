import { readStore, writeStore } from "@/src/db/web-storage";

// Ajustes sueltos (variante web). Mismas claves que la variante SQLite.
export async function getSetting(key: string): Promise<unknown> {
  return readStore().settings?.[key] ?? null;
}

export async function setSetting(key: string, value: unknown) {
  const store = readStore();
  store.settings = { ...store.settings, [key]: value };
  writeStore(store);
}
