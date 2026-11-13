import { readStore, webId, writeStore } from "@/src/db/web-storage";
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

// Variante web (localStorage). Mismas funciones que la de SQLite.

export const newFoodId = (prefix: "c" | "r") => `${prefix}:${webId()}`;

export async function getUserFoods(): Promise<Food[]> {
  return [...(readStore().foods ?? [])].reverse();
}

export async function saveFood(food: Food) {
  const store = readStore();
  store.foods = [...(store.foods ?? []).filter((item) => item.id !== food.id), food];
  writeStore(store);
}

export async function deleteFood(foodId: string) {
  const store = readStore();
  store.foods = (store.foods ?? []).filter((item) => item.id !== foodId);
  writeStore(store);
}

export async function getMealEntries(date: string): Promise<MealEntry[]> {
  return (readStore().meals ?? []).filter((entry) => entry.date === date);
}

/** Las entradas más recientes primero, para saber qué come la persona y cuándo. */
export async function getMealHistory(limit = 600): Promise<MealEntry[]> {
  const meals = readStore().meals ?? [];
  return meals
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.index - a.index)
    .slice(0, limit)
    .map((item) => item.entry);
}

function insertEntries(entries: MealEntry[]) {
  const store = readStore();
  store.meals = [...(store.meals ?? []), ...entries];
  writeStore(store);
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
  if (draft) insertEntries([{ ...draft, id: webId(), date, slot: "snack" }]);
}

export async function addMealEntries(date: string, slot: MealSlot, drafts: MealDraft[]) {
  await keepLegacyTotal(date);
  insertEntries(drafts.map((draft) => ({ ...draft, id: webId(), date, slot })));
  await syncTotals(date);
}

export async function deleteMealEntry(entry: Pick<MealEntry, "id" | "date">) {
  const store = readStore();
  store.meals = (store.meals ?? []).filter((item) => item.id !== entry.id);
  writeStore(store);
  await syncTotals(entry.date);
}

/** Copia todas las comidas de un día a otro. Devuelve cuántas copió. */
export async function copyDay(fromDate: string, toDate: string): Promise<number> {
  const source = await getMealEntries(fromDate);
  if (!source.length) return 0;
  await keepLegacyTotal(toDate);
  insertEntries(copyEntries(source, toDate, webId));
  await syncTotals(toDate);
  return source.length;
}

export async function deleteDayMeals(date: string) {
  const store = readStore();
  store.meals = (store.meals ?? []).filter((item) => item.date !== date);
  writeStore(store);
}

/** Búsqueda en línea de alimentos: apagada hasta que la persona la enciende. */
export async function getOnlineLookup(): Promise<boolean> {
  return readStore().settings?.onlineLookup === true;
}

export async function setOnlineLookup(enabled: boolean) {
  const store = readStore();
  store.settings = { ...store.settings, onlineLookup: enabled };
  writeStore(store);
}

/** Reemplaza una entrada (cantidad, momento del día o alimento) y recalcula su día. */
export async function updateMealEntry(entry: MealEntry) {
  const store = readStore();
  store.meals = (store.meals ?? []).map((item) => (item.id === entry.id ? entry : item));
  writeStore(store);
  await syncTotals(entry.date);
}
