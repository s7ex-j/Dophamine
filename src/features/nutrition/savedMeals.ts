import { totalsOf, type MealDraft, type MealEntry } from "@/src/features/nutrition/meals";

/**
 * Comidas guardadas: un grupo de alimentos que la persona come seguido ("mi
 * desayuno de siempre") y registra con un toque. Las arma cada uno desde lo que
 * ya anotó; la app no trae plantillas. Se guardan en ajustes (`saved_meals`) y
 * viajan en el respaldo con ellos.
 */
export const SAVED_MEALS_KEY = "saved_meals";

export type SavedMeal = { id: string; name: string; items: MealDraft[] };

const toDraft = ({ id: _id, date: _date, slot: _slot, ...draft }: MealEntry): MealDraft => draft;

/** Arma una comida guardada con los alimentos de un momento del día. */
export function buildSavedMeal(name: string, entries: MealEntry[], id: string): SavedMeal | null {
  const clean = name.trim();
  if (!clean || !entries.length) return null;
  return { id, name: clean, items: entries.map(toDraft) };
}

/** Agrega o reemplaza (mismo nombre, sin importar mayúsculas) y deja la más reciente primero. */
export function upsertSavedMeal(list: SavedMeal[], meal: SavedMeal): SavedMeal[] {
  const key = meal.name.toLowerCase();
  return [meal, ...list.filter((item) => item.name.toLowerCase() !== key && item.id !== meal.id)];
}

export const removeSavedMeal = (list: SavedMeal[], id: string) => list.filter((item) => item.id !== id);

export const savedMealTotals = (meal: SavedMeal) => totalsOf(meal.items);

const isNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);

/** Lee lo guardado en ajustes. Lo que no tenga forma de comida se descarta. */
export function readSavedMeals(value: unknown): SavedMeal[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): SavedMeal[] => {
    if (!item || typeof item !== "object") return [];
    const meal = item as Partial<SavedMeal>;
    if (typeof meal.id !== "string" || typeof meal.name !== "string" || !Array.isArray(meal.items)) return [];
    const items = meal.items.filter(
      (draft): draft is MealDraft =>
        Boolean(draft) &&
        typeof draft.name === "string" &&
        isNumber(draft.kcal) &&
        isNumber(draft.proteinG) &&
        isNumber(draft.carbsG) &&
        isNumber(draft.fatsG),
    );
    return items.length ? [{ id: meal.id, name: meal.name, items }] : [];
  });
}
