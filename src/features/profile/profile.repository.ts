import { getDatabase } from "@/src/db/database";
import type { NutritionProfile } from "@/src/features/profile/profile";

const key = "nutrition_profile";
export async function getNutritionProfile(): Promise<NutritionProfile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_settings WHERE key = ?", key);
  return row ? JSON.parse(row.value) as NutritionProfile : null;
}
export async function saveNutritionProfile(profile: NutritionProfile) {
  const db = await getDatabase();
  await db.runAsync("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP", key, JSON.stringify(profile));
}

