import {
  caloriesFromMacros,
  nutrientsFor,
  sumNutrients,
  type Food,
  type Nutrients,
  type RecipeIngredient,
} from "@/src/features/nutrition/foods";

/**
 * Comidas del día: cada cosa que se come es una entrada con su momento, su
 * cantidad y sus nutrientes. El total del día es la suma de las entradas.
 *
 * La entrada guarda una copia de los nutrientes: si después se corrige el
 * alimento, lo ya registrado no cambia.
 */
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export type MealEntry = {
  id: string;
  date: string;
  slot: MealSlot;
  /** Alimento del que salió. Sin él es un registro rápido (solo calorías y macros). */
  foodId?: string;
  name: string;
  /** Gramos consumidos. Un registro rápido no tiene. */
  grams?: number;
} & Nutrients;

export type MealDraft = Omit<MealEntry, "id" | "date" | "slot">;

export const MEAL_SLOTS: Array<{ id: MealSlot; label: string }> = [
  { id: "breakfast", label: "Desayuno" },
  { id: "lunch", label: "Almuerzo" },
  { id: "dinner", label: "Cena" },
  { id: "snack", label: "Snacks" },
];
export const slotLabel = (slot: MealSlot) => MEAL_SLOTS.find((item) => item.id === slot)?.label ?? slot;

/** El momento del día que corresponde a una hora, para proponerlo al abrir "Agregar". */
export function slotForHour(hour: number): MealSlot {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 18 && hour < 23) return "dinner";
  return "snack";
}

export const totalsOf = (entries: Nutrients[]): Nutrients => sumNutrients(entries);

export function draftFromFood(food: Food, grams: number): MealDraft {
  return { foodId: food.id, name: food.name, grams, ...nutrientsFor(food, grams) };
}

// Registro rápido: calorías y macros sin alimento, para cuando no vale la pena buscar.
export type QuickForm = { name: string; kcal: string; protein: string; carbs: string; fats: string };
export const emptyQuick = (): QuickForm => ({ name: "", kcal: "", protein: "", carbs: "", fats: "" });

export function draftFromQuick(
  form: QuickForm,
): { draft: MealDraft; error: null } | { draft: null; error: string } {
  const amount = (text: string) => (Number(text) > 0 ? Number(text) : 0);
  const proteinG = amount(form.protein);
  const carbsG = amount(form.carbs);
  const fatsG = amount(form.fats);
  const kcal = amount(form.kcal) || caloriesFromMacros(proteinG, carbsG, fatsG);
  if (kcal <= 0) return { draft: null, error: "Escribe las calorías o al menos un macronutriente." };
  return {
    draft: { name: form.name.trim() || "Registro rápido", kcal, proteinG, carbsG, fatsG },
    error: null,
  };
}

/** Las entradas de un día, en el orden de los momentos y con el subtotal de cada uno. */
export function groupBySlot(entries: MealEntry[]) {
  return MEAL_SLOTS.map((slot) => {
    const items = entries.filter((entry) => entry.slot === slot.id);
    return { ...slot, entries: items, totals: totalsOf(items) };
  });
}

/** Copia entradas a otro día (y, si se indica, a otro momento) con ids nuevos. */
export function copyEntries(
  entries: MealEntry[],
  toDate: string,
  newId: () => string,
  toSlot?: MealSlot,
): MealEntry[] {
  return entries.map((entry) => ({ ...entry, id: newId(), date: toDate, slot: toSlot ?? entry.slot }));
}

/** Los ingredientes de una receta a partir de lo que hay en el plato. */
export const ingredientsFromDrafts = (drafts: MealDraft[]): RecipeIngredient[] =>
  drafts.map((draft) => ({
    foodId: draft.foodId ?? "",
    name: draft.name,
    grams: draft.grams ?? 0,
    kcal: draft.kcal,
    proteinG: draft.proteinG,
    carbsG: draft.carbsG,
    fatsG: draft.fatsG,
  }));

export type FoodUsage = {
  /** Veces que se registró cada alimento. */
  counts: Record<string, number>;
  /** Última cantidad usada de cada alimento, para proponerla. */
  lastGrams: Record<string, number>;
  /** Ids de los alimentos más habituales en cada momento del día, del más usado al menos. */
  bySlot: Record<MealSlot, string[]>;
  /** Ids en orden de uso reciente, sin repetir. */
  recent: string[];
};

/**
 * Qué come la persona y cuándo, a partir de sus registros (los más recientes
 * primero). Sirve para ordenar la búsqueda y para sugerir sin escribir.
 */
export function foodUsage(entries: MealEntry[]): FoodUsage {
  const counts: Record<string, number> = {};
  const lastGrams: Record<string, number> = {};
  const slotCounts: Record<MealSlot, Record<string, number>> = {
    breakfast: {},
    lunch: {},
    dinner: {},
    snack: {},
  };
  const recent: string[] = [];
  for (const entry of entries) {
    if (!entry.foodId) continue;
    counts[entry.foodId] = (counts[entry.foodId] ?? 0) + 1;
    slotCounts[entry.slot][entry.foodId] = (slotCounts[entry.slot][entry.foodId] ?? 0) + 1;
    if (!(entry.foodId in lastGrams) && entry.grams) lastGrams[entry.foodId] = entry.grams;
    if (!recent.includes(entry.foodId)) recent.push(entry.foodId);
  }
  const ranked = (slot: MealSlot) =>
    Object.entries(slotCounts[slot])
      .sort((a, b) => b[1] - a[1] || recent.indexOf(a[0]) - recent.indexOf(b[0]))
      .map(([id]) => id);
  return {
    counts,
    lastGrams,
    bySlot: {
      breakfast: ranked("breakfast"),
      lunch: ranked("lunch"),
      dinner: ranked("dinner"),
      snack: ranked("snack"),
    },
    recent,
  };
}

/** Sugerencias para un momento: primero lo habitual a esa hora, luego lo reciente. */
export function suggestionsFor(slot: MealSlot, usage: FoodUsage, foods: Food[], limit = 8): Food[] {
  const ids = [...new Set([...usage.bySlot[slot], ...usage.recent])];
  const byId = new Map(foods.map((food) => [food.id, food]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id) as Food] : [])).slice(0, limit);
}

/**
 * Los días anteriores a esta versión guardaban solo el total. Al agregar la
 * primera comida a uno de esos días, el total se conserva como una entrada.
 */
export function legacyDraft(totals: Nutrients): MealDraft | null {
  return totals.kcal > 0 || totals.proteinG > 0 || totals.carbsG > 0 || totals.fatsG > 0
    ? { name: "Total registrado antes", ...totals }
    : null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Comprueba la forma de una entrada leída de un respaldo. */
export function isMealEntry(value: unknown): value is MealEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    MEAL_SLOTS.some((slot) => slot.id === value.slot) &&
    ["kcal", "proteinG", "carbsG", "fatsG"].every((key) => Number.isFinite(value[key]))
  );
}

/**
 * Una entrada con otra cantidad. Si se conoce el alimento, se recalcula desde
 * él; si no (alimento borrado), se escala proporcionalmente.
 */
export function rescaleEntry(entry: MealEntry, grams: number, food: Food | null): MealEntry {
  if (food) return { ...entry, ...draftFromFood(food, grams) };
  if (!entry.grams) return entry;
  const factor = grams / entry.grams;
  const round1 = (value: number) => Math.round(value * factor * 10) / 10;
  return {
    ...entry,
    grams,
    kcal: Math.round(entry.kcal * factor),
    proteinG: round1(entry.proteinG),
    carbsG: round1(entry.carbsG),
    fatsG: round1(entry.fatsG),
  };
}

/** Agrega o quita un id de una lista (favoritos). */
export const toggleId = (ids: string[], id: string) =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
