import { getDatabase } from "@/src/db/database";

export type DailyBiometrics = { id: string; date: string; weightKg: number; caloriesIn: number; proteinG: number; carbsG: number; fatsG: number };
export type BiometricsInput = Pick<DailyBiometrics, "weightKg" | "caloriesIn" | "proteinG" | "carbsG" | "fatsG">;

const today = () => new Date().toISOString().slice(0, 10);
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function saveDailyBiometrics(input: BiometricsInput) {
  const db = await getDatabase();
  await db.runAsync(`INSERT INTO daily_biometrics (id, date, weight_kg, calories_in, protein_g, carbs_g, fats_g)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg,
    calories_in = excluded.calories_in, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g, fats_g = excluded.fats_g, updated_at = CURRENT_TIMESTAMP`,
    id(), today(), input.weightKg, input.caloriesIn, input.proteinG, input.carbsG, input.fatsG);
}

export async function getLatestBiometrics(): Promise<DailyBiometrics | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string; date: string; weight_kg: number; calories_in: number; protein_g: number; carbs_g: number; fats_g: number }>("SELECT * FROM daily_biometrics ORDER BY date DESC LIMIT 1");
  return row ? { id: row.id, date: row.date, weightKg: row.weight_kg, caloriesIn: row.calories_in, proteinG: row.protein_g, carbsG: row.carbs_g, fatsG: row.fats_g } : null;
}

export async function getBiometricsWindow(days: number): Promise<DailyBiometrics[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; date: string; weight_kg: number; calories_in: number; protein_g: number; carbs_g: number; fats_g: number }>("SELECT * FROM daily_biometrics ORDER BY date DESC LIMIT ?", days);
  return rows.map((row) => ({ id: row.id, date: row.date, weightKg: row.weight_kg, caloriesIn: row.calories_in, proteinG: row.protein_g, carbsG: row.carbs_g, fatsG: row.fats_g }));
}

export async function getRecentBiometrics(): Promise<DailyBiometrics[]> {
  return getBiometricsWindow(7);
}

