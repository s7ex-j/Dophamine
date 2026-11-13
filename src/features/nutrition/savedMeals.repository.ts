import type { MealEntry } from "@/src/features/nutrition/meals";
import {
  buildSavedMeal,
  readSavedMeals,
  removeSavedMeal,
  SAVED_MEALS_KEY,
  upsertSavedMeal,
  type SavedMeal,
} from "@/src/features/nutrition/savedMeals";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";

// Las comidas guardadas viven en ajustes, que ya tienen versión SQLite y web
// (y viajan en el respaldo): este archivo sirve a las dos plataformas.

export const getSavedMeals = async (): Promise<SavedMeal[]> =>
  readSavedMeals(await getSetting(SAVED_MEALS_KEY));

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Guarda los alimentos de un momento del día como comida con nombre. */
export async function saveMealFromEntries(name: string, entries: MealEntry[]) {
  const meal = buildSavedMeal(name, entries, newId());
  if (!meal) return;
  await setSetting(SAVED_MEALS_KEY, upsertSavedMeal(await getSavedMeals(), meal));
}

export async function deleteSavedMeal(id: string) {
  await setSetting(SAVED_MEALS_KEY, removeSavedMeal(await getSavedMeals(), id));
}
