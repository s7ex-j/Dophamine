import { getDatabase } from "@/src/db/database";

// Ajustes sueltos guardados como JSON (variante SQLite). Claves en uso:
// "dashboard_layout" (orden del Panel) y "meal_reminders" (recordatorios).
export async function getSetting(key: string): Promise<unknown> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_settings WHERE key = ?", key);
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: unknown) {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    key,
    JSON.stringify(value),
  );
}
