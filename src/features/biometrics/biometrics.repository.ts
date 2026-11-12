import { localDateKey } from "@/src/lib/dates";
import { getDatabase } from "@/src/db/database";

export type DailyBiometrics = {
  id: string;
  date: string;
  weightKg: number;
  caloriesIn: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  // Composición corporal: opcional, se llena solo cuando hay una medición.
  bodyFatPct?: number | null;
  muscleMassKg?: number | null;
  waterPct?: number | null;
  boneMassKg?: number | null;
};
export type BiometricsInput = Pick<
  DailyBiometrics,
  "weightKg" | "caloriesIn" | "proteinG" | "carbsG" | "fatsG"
> &
  Partial<Pick<DailyBiometrics, "bodyFatPct" | "muscleMassKg" | "waterPct" | "boneMassKg">>;

type Row = {
  id: string;
  date: string;
  weight_kg: number;
  calories_in: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  water_pct: number | null;
  bone_mass_kg: number | null;
};

const today = () => localDateKey();
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fromRow = (row: Row): DailyBiometrics => ({
  id: row.id,
  date: row.date,
  weightKg: row.weight_kg,
  caloriesIn: row.calories_in,
  proteinG: row.protein_g,
  carbsG: row.carbs_g,
  fatsG: row.fats_g,
  bodyFatPct: row.body_fat_pct,
  muscleMassKg: row.muscle_mass_kg,
  waterPct: row.water_pct,
  boneMassKg: row.bone_mass_kg,
});

export async function saveDailyBiometrics(input: BiometricsInput, date = today()) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO daily_biometrics
      (id, date, weight_kg, calories_in, protein_g, carbs_g, fats_g, body_fat_pct, muscle_mass_kg, water_pct, bone_mass_kg)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg,
      calories_in = excluded.calories_in, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g,
      fats_g = excluded.fats_g, body_fat_pct = excluded.body_fat_pct, muscle_mass_kg = excluded.muscle_mass_kg,
      water_pct = excluded.water_pct, bone_mass_kg = excluded.bone_mass_kg, updated_at = CURRENT_TIMESTAMP`,
    id(),
    date,
    input.weightKg,
    input.caloriesIn,
    input.proteinG,
    input.carbsG,
    input.fatsG,
    input.bodyFatPct ?? null,
    input.muscleMassKg ?? null,
    input.waterPct ?? null,
    input.boneMassKg ?? null,
  );
}

export async function deleteDailyBiometrics(date: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM daily_biometrics WHERE date = ?", date);
}

export async function getBiometricsByDate(date: string): Promise<DailyBiometrics | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Row>("SELECT * FROM daily_biometrics WHERE date = ?", date);
  return row ? fromRow(row) : null;
}

export async function getLatestBiometrics(): Promise<DailyBiometrics | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Row>("SELECT * FROM daily_biometrics ORDER BY date DESC LIMIT 1");
  return row ? fromRow(row) : null;
}

export async function getBiometricsWindow(days: number): Promise<DailyBiometrics[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>("SELECT * FROM daily_biometrics ORDER BY date DESC LIMIT ?", days);
  return rows.map(fromRow);
}

export async function getRecentBiometrics(): Promise<DailyBiometrics[]> {
  return getBiometricsWindow(7);
}
