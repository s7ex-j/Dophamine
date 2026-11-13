import { getDatabase } from "@/src/db/database";
import { getBiometricsByDate, saveDayNutrition } from "@/src/features/biometrics/biometrics.repository";
import type { Food } from "@/src/features/nutrition/foods";
import {
  copyEntries,
  legacyDraft,
  totalsOf,
  type MealDraft,
  type MealEntry,
  type MealSlot,
} from "@/src/features/nutrition/meals";

// Variante para Android e iOS (SQLite). Los alimentos propios, las recetas y los
// traídos de internet se guardan completos como JSON: son pocos y se buscan en
// memoria junto con los incluidos en la app.

type EntryRow = {
  id: string;
  date: string;
  slot: MealSlot;
  food_id: string | null;
  name: string;
  grams: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
};

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ONLINE_KEY = "online_lookup";
const fromRow = (row: EntryRow): MealEntry => ({
  id: row.id,
  date: row.date,
  slot: row.slot,
  ...(row.food_id ? { foodId: row.food_id } : {}),
  name: row.name,
  ...(row.grams === null ? {} : { grams: row.grams }),
  kcal: row.kcal,
  proteinG: row.protein_g,
  carbsG: row.carbs_g,
  fatsG: row.fats_g,
});

export const newFoodId = (prefix: "c" | "r") => `${prefix}:${newId()}`;

export async function getUserFoods(): Promise<Food[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ data: string }>("SELECT data FROM foods ORDER BY rowid DESC");
  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.data) as Food];
    } catch {
      return [];
    }
  });
}

export async function saveFood(food: Food) {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO foods (id, data, barcode) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, barcode = excluded.barcode",
    food.id,
    JSON.stringify(food),
    food.barcode ?? null,
  );
}

export async function deleteFood(foodId: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM foods WHERE id = ?", foodId);
}

export async function getMealEntries(date: string): Promise<MealEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<EntryRow>(
    "SELECT * FROM meal_entries WHERE date = ? ORDER BY rowid",
    date,
  );
  return rows.map(fromRow);
}

/** Las entradas más recientes primero, para saber qué come la persona y cuándo. */
export async function getMealHistory(limit = 600): Promise<MealEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<EntryRow>(
    "SELECT * FROM meal_entries ORDER BY date DESC, rowid DESC LIMIT ?",
    limit,
  );
  return rows.map(fromRow);
}

async function insertEntries(entries: MealEntry[]) {
  const db = await getDatabase();
  for (const entry of entries)
    await db.runAsync(
      "INSERT INTO meal_entries (id, date, slot, food_id, name, grams, kcal, protein_g, carbs_g, fats_g) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      entry.id,
      entry.date,
      entry.slot,
      entry.foodId ?? null,
      entry.name,
      entry.grams ?? null,
      entry.kcal,
      entry.proteinG,
      entry.carbsG,
      entry.fatsG,
    );
}

// El total del día siempre es la suma de sus comidas.
async function syncTotals(date: string) {
  await saveDayNutrition(totalsOf(await getMealEntries(date)), date);
}

// Un día registrado antes de que existieran las comidas solo tiene el total:
// se conserva como una entrada para que agregar una comida no lo borre.
async function keepLegacyTotal(date: string) {
  if ((await getMealEntries(date)).length) return;
  const day = await getBiometricsByDate(date);
  const draft = day
    ? legacyDraft({ kcal: day.caloriesIn, proteinG: day.proteinG, carbsG: day.carbsG, fatsG: day.fatsG })
    : null;
  if (draft) await insertEntries([{ ...draft, id: newId(), date, slot: "snack" }]);
}

export async function addMealEntries(date: string, slot: MealSlot, drafts: MealDraft[]) {
  await keepLegacyTotal(date);
  await insertEntries(drafts.map((draft) => ({ ...draft, id: newId(), date, slot })));
  await syncTotals(date);
}

export async function deleteMealEntry(entry: Pick<MealEntry, "id" | "date">) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM meal_entries WHERE id = ?", entry.id);
  await syncTotals(entry.date);
}

/** Copia todas las comidas de un día a otro. Devuelve cuántas copió. */
export async function copyDay(fromDate: string, toDate: string): Promise<number> {
  const source = await getMealEntries(fromDate);
  if (!source.length) return 0;
  await keepLegacyTotal(toDate);
  await insertEntries(copyEntries(source, toDate, newId));
  await syncTotals(toDate);
  return source.length;
}

export async function deleteDayMeals(date: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM meal_entries WHERE date = ?", date);
}

/** Búsqueda en línea de alimentos: apagada hasta que la persona la enciende. */
export async function getOnlineLookup(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = ?",
    ONLINE_KEY,
  );
  return row?.value === "on";
}

export async function setOnlineLookup(enabled: boolean) {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    ONLINE_KEY,
    enabled ? "on" : "off",
  );
}

/** Reemplaza una entrada (cantidad, momento del día o alimento) y recalcula su día. */
export async function updateMealEntry(entry: MealEntry) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE meal_entries SET slot = ?, food_id = ?, name = ?, grams = ?, kcal = ?, protein_g = ?, carbs_g = ?, fats_g = ? WHERE id = ?",
    entry.slot,
    entry.foodId ?? null,
    entry.name,
    entry.grams ?? null,
    entry.kcal,
    entry.proteinG,
    entry.carbsG,
    entry.fatsG,
    entry.id,
  );
  await syncTotals(entry.date);
}
