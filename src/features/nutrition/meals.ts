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
/**
 * El momento del día de una entrada. Con nombres: breakfast, midmorning, lunch,
 * snack, dinner, latenight. Por número: meal1 … meal6. Cuáles se usan lo decide
 * la configuración de comidas del plan (`MealSetup`).
 */
export type MealSlot = string;
export type MealStyle = "named" | "numbered";
export type MealSetup = { style: MealStyle; count: number };
type SlotInfo = { id: MealSlot; label: string; hour: number };

const NAMED: Record<string, SlotInfo> = {
  breakfast: { id: "breakfast", label: "Desayuno", hour: 7 },
  midmorning: { id: "midmorning", label: "Media mañana", hour: 10 },
  lunch: { id: "lunch", label: "Almuerzo", hour: 13 },
  snack: { id: "snack", label: "Snacks", hour: 17 },
  dinner: { id: "dinner", label: "Cena", hour: 20 },
  latenight: { id: "latenight", label: "Antes de dormir", hour: 22 },
};
const NAMED_SETS: Record<number, string[]> = {
  2: ["lunch", "dinner"],
  3: ["breakfast", "lunch", "dinner"],
  4: ["breakfast", "lunch", "snack", "dinner"],
  5: ["breakfast", "midmorning", "lunch", "snack", "dinner"],
  6: ["breakfast", "midmorning", "lunch", "snack", "dinner", "latenight"],
};
const NUMBERED: SlotInfo[] = Array.from({ length: 6 }, (_, index) => ({
  id: `meal${index + 1}`,
  label: `Comida ${index + 1}`,
  hour: 0,
}));
export const MEAL_COUNTS = [2, 3, 4, 5, 6];
export const DEFAULT_MEAL_SETUP: MealSetup = { style: "named", count: 4 };
/** Todos los ids posibles, para validar entradas de un respaldo. */
export const KNOWN_SLOTS = [...Object.keys(NAMED), ...NUMBERED.map((slot) => slot.id)];

export function normalizeMealSetup(value: unknown): MealSetup {
  const candidate = (value ?? {}) as Partial<MealSetup>;
  const count = Number(candidate.count);
  return {
    style: candidate.style === "numbered" ? "numbered" : "named",
    count: MEAL_COUNTS.includes(count) ? count : DEFAULT_MEAL_SETUP.count,
  };
}

/** Los momentos del día de una configuración, en orden. Por número se reparten entre las 7 y las 21 h. */
export function mealSlots(setup: MealSetup = DEFAULT_MEAL_SETUP): SlotInfo[] {
  const { style, count } = normalizeMealSetup(setup);
  if (style === "named") return NAMED_SETS[count].map((id) => NAMED[id]);
  return NUMBERED.slice(0, count).map((slot, index) => ({
    ...slot,
    hour: count === 1 ? 13 : Math.round(7 + (14 * index) / (count - 1)),
  }));
}

/** Momentos de la configuración más los que tengan entradas de antes (si se cambió la configuración). */
export function slotsForDay(
  entries: Pick<MealEntry, "slot">[],
  setup: MealSetup = DEFAULT_MEAL_SETUP,
): SlotInfo[] {
  const slots = mealSlots(setup);
  const extra = [...new Set(entries.map((entry) => entry.slot))].filter(
    (slot) => !slots.some((item) => item.id === slot),
  );
  return [...slots, ...extra.map((id) => ({ id, label: slotLabel(id), hour: 24 }))];
}

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

export const slotLabel = (slot: MealSlot) =>
  NAMED[slot]?.label ?? NUMBERED.find((item) => item.id === slot)?.label ?? slot;

/** El momento que corresponde a una hora: el último cuya hora típica ya llegó (con 1 h de margen). */
export function slotForHour(hour: number, setup: MealSetup = DEFAULT_MEAL_SETUP): MealSlot {
  const slots = mealSlots(setup);
  const passed = slots.filter((slot) => slot.hour <= hour + 1);
  return (passed.at(-1) ?? slots[0]).id;
}

export const totalsOf = (entries: Nutrients[]): Nutrients => sumNutrients(entries);

export function draftFromFood(food: Food, grams: number): MealDraft {
  return { foodId: food.id, name: food.name, grams, ...nutrientsFor(food, grams) };
}

// Registro rápido: calorías y macros sin alimento, para cuando no vale la pena buscar.
export type QuickForm = {
  name: string;
  kcal: string;
  protein: string;
  carbs: string;
  fats: string;
  /** Gramos de alcohol, opcional. */
  alcohol?: string;
};
export const emptyQuick = (): QuickForm => ({ name: "", kcal: "", protein: "", carbs: "", fats: "" });

export function draftFromQuick(
  form: QuickForm,
): { draft: MealDraft; error: null } | { draft: null; error: string } {
  const amount = (text: string) => (Number(text) > 0 ? Number(text) : 0);
  const proteinG = amount(form.protein);
  const carbsG = amount(form.carbs);
  const fatsG = amount(form.fats);
  const alcoholG = amount(form.alcohol ?? "");
  const kcal = amount(form.kcal) || caloriesFromMacros(proteinG, carbsG, fatsG, alcoholG);
  if (kcal <= 0) return { draft: null, error: "Escribe las calorías o al menos un macronutriente." };
  return {
    draft: {
      name: form.name.trim() || "Registro rápido",
      kcal,
      proteinG,
      carbsG,
      fatsG,
      ...(alcoholG ? { alcoholG } : {}),
    },
    error: null,
  };
}

/** Las entradas de un día, en el orden de los momentos y con el subtotal de cada uno. */
export function groupBySlot(entries: MealEntry[], setup: MealSetup = DEFAULT_MEAL_SETUP) {
  return slotsForDay(entries, setup).map((slot) => {
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
    slotCounts[entry.slot] ??= {};
    slotCounts[entry.slot][entry.foodId] = (slotCounts[entry.slot][entry.foodId] ?? 0) + 1;
    if (!(entry.foodId in lastGrams) && entry.grams) lastGrams[entry.foodId] = entry.grams;
    if (!recent.includes(entry.foodId)) recent.push(entry.foodId);
  }
  const ranked = (slot: MealSlot) =>
    Object.entries(slotCounts[slot] ?? {})
      .sort((a, b) => b[1] - a[1] || recent.indexOf(a[0]) - recent.indexOf(b[0]))
      .map(([id]) => id);
  return {
    counts,
    lastGrams,
    bySlot: Object.fromEntries(Object.keys(slotCounts).map((slot) => [slot, ranked(slot)])),
    recent,
  };
}

/** Sugerencias para un momento: primero lo habitual a esa hora, luego lo reciente. */
export function suggestionsFor(slot: MealSlot, usage: FoodUsage, foods: Food[], limit = 8): Food[] {
  const ids = [...new Set([...(usage.bySlot[slot] ?? []), ...usage.recent])];
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
    KNOWN_SLOTS.includes(value.slot as string) &&
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

/** Un registro rápido (sin alimento detrás) es una estimación: sus números los escribió la persona. */
export const isEstimate = (entry: MealEntry) => !entry.foodId;

/** Qué parte de las calorías del día salió de registros rápidos (0 a 1). */
export function estimatedShare(entries: MealEntry[]): number {
  const total = entries.reduce((sum, entry) => sum + entry.kcal, 0);
  if (total <= 0) return 0;
  return entries.filter(isEstimate).reduce((sum, entry) => sum + entry.kcal, 0) / total;
}

/**
 * Si más de la mitad de las calorías del día son estimadas, conviene marcarlo
 * como incompleto: así no distorsiona el cálculo del gasto.
 */
export const suggestPartial = (entries: MealEntry[], partial: boolean | undefined) =>
  !partial && estimatedShare(entries) > 0.5;
