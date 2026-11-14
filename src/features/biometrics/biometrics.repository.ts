import { localDateKey } from "@/src/lib/dates";
import { getDatabase } from "@/src/db/database";

/**
 * Un día: el pesaje y la composición corporal (opcionales) y el total de lo
 * comido. El total lo escribe `nutrition.repository` al sumar las comidas.
 * Puede haber días con comida y sin pesaje, y al revés.
 */
export type DailyBiometrics = {
  id: string;
  date: string;
  weightKg: number | null;
  caloriesIn: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  // Composición corporal: opcional, se llena solo cuando hay una medición.
  bodyFatPct?: number | null;
  muscleMassKg?: number | null;
  waterPct?: number | null;
  boneMassKg?: number | null;
  /** La persona marcó que no registró todo lo que comió ese día. */
  partial?: boolean;
  /** Día de ayuno: lo comido (aunque sea 0) es real y cuenta para la ingesta media. */
  fasting?: boolean;
  /** Agua tomada en el día, en ml. */
  waterMl?: number;
};
export type BodyInput = Pick<DailyBiometrics, "weightKg"> &
  Partial<Pick<DailyBiometrics, "bodyFatPct" | "muscleMassKg" | "waterPct" | "boneMassKg">>;
export type NutritionTotals = { kcal: number; proteinG: number; carbsG: number; fatsG: number };

type Row = {
  id: string;
  date: string;
  weight_kg: number | null;
  calories_in: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  water_pct: number | null;
  bone_mass_kg: number | null;
  partial: number | null;
  fasting?: number | null;
  water_ml: number | null;
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
  partial: row.partial === 1,
  fasting: row.fasting === 1,
  waterMl: row.water_ml ?? 0,
});

/** Guarda el pesaje y la composición de un día sin tocar lo comido. */
export async function saveDayBody(input: BodyInput, date = today()) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO daily_biometrics (id, date, weight_kg, body_fat_pct, muscle_mass_kg, water_pct, bone_mass_kg)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg, body_fat_pct = excluded.body_fat_pct,
      muscle_mass_kg = excluded.muscle_mass_kg, water_pct = excluded.water_pct,
      bone_mass_kg = excluded.bone_mass_kg, updated_at = CURRENT_TIMESTAMP`,
    id(),
    date,
    input.weightKg,
    input.bodyFatPct ?? null,
    input.muscleMassKg ?? null,
    input.waterPct ?? null,
    input.boneMassKg ?? null,
  );
}

/** Guarda el total de lo comido en un día sin tocar el pesaje. */
export async function saveDayNutrition(totals: NutritionTotals, date = today()) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO daily_biometrics (id, date, calories_in, protein_g, carbs_g, fats_g)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET calories_in = excluded.calories_in, protein_g = excluded.protein_g,
      carbs_g = excluded.carbs_g, fats_g = excluded.fats_g, updated_at = CURRENT_TIMESTAMP`,
    id(),
    date,
    Math.round(totals.kcal),
    totals.proteinG,
    totals.carbsG,
    totals.fatsG,
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

/** Marca o desmarca un día como incompleto (no se registró todo lo comido). */
export async function setDayFasting(date: string, fasting: boolean) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO daily_biometrics (id, date, fasting) VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET fasting = excluded.fasting, updated_at = CURRENT_TIMESTAMP`,
    `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date,
    fasting ? 1 : 0,
  );
}

export async function setDayPartial(date: string, partial: boolean) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO daily_biometrics (id, date, partial) VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET partial = excluded.partial, updated_at = CURRENT_TIMESTAMP`,
    id(),
    date,
    partial ? 1 : 0,
  );
}

/** Suma (o resta) agua al día. Devuelve el total que quedó. */
export async function addWater(date: string, deltaMl: number): Promise<number> {
  const db = await getDatabase();
  const current = (await getBiometricsByDate(date))?.waterMl ?? 0;
  const total = Math.max(0, Math.min(10000, current + deltaMl));
  await db.runAsync(
    `INSERT INTO daily_biometrics (id, date, water_ml) VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET water_ml = excluded.water_ml, updated_at = CURRENT_TIMESTAMP`,
    id(),
    date,
    total,
  );
  return total;
}
