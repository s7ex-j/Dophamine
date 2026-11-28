import { mealSlots, slotLabel, type MealEntry, type MealSetup } from "@/src/features/nutrition/meals";
import { MICRO_INFO, MICRO_KEYS, type MicroKey } from "@/src/features/nutrition/micros";

/**
 * Qué alimentos y comidas aportan más de cada nutriente (macros y micros), cuánto se come por día frente
 * al plan o a la referencia, y cómo se reparte lo comido en el día. Sale de lo ya registrado. Módulo puro.
 */
export type MacroKey = "kcal" | "proteinG" | "carbsG" | "fatsG" | "alcoholG";
export type NutrientKey = MacroKey | MicroKey;
export const NUTRIENT_LABELS: Record<NutrientKey, { label: string; unit: string }> = {
  kcal: { label: "Calorías", unit: "kcal" },
  proteinG: { label: "Proteína", unit: "g" },
  carbsG: { label: "Carbos", unit: "g" },
  fatsG: { label: "Grasas", unit: "g" },
  alcoholG: { label: "Alcohol", unit: "g" },
  ...(Object.fromEntries(
    MICRO_KEYS.map((key) => [key, { label: MICRO_INFO[key].label, unit: MICRO_INFO[key].unit }]),
  ) as Record<MicroKey, { label: string; unit: string }>),
};

const isMacro = (key: NutrientKey): key is MacroKey =>
  key === "kcal" || key === "proteinG" || key === "carbsG" || key === "fatsG" || key === "alcoholG";
/** Cuánto de un nutriente trae una entrada (0 si no lo trae). */
export const amountOf = (entry: MealEntry, key: NutrientKey) =>
  isMacro(key) ? (key === "alcoholG" ? (entry.alcoholG ?? 0) : entry[key]) : (entry.micros?.[key] ?? 0);
const round1 = (value: number) => Math.round(value * 10) / 10;
const roundFor = (key: NutrientKey, value: number) =>
  key === "kcal" || value >= 100
    ? Math.round(value)
    : value >= 10
      ? round1(value)
      : Math.round(value * 100) / 100;

export type Contributor = { name: string; amount: number; share: number; times: number };

/** Los alimentos que más aportan de un nutriente en el periodo, con su parte del total. */
export function topContributors(entries: MealEntry[], key: NutrientKey, limit = 10): Contributor[] {
  const total = entries.reduce((sum, entry) => sum + amountOf(entry, key), 0);
  if (total <= 0) return [];
  const groups = new Map<string, { name: string; amount: number; times: number }>();
  for (const entry of entries) {
    const amount = amountOf(entry, key);
    if (amount <= 0) continue;
    const id = entry.foodId ?? entry.name.toLowerCase();
    const group = groups.get(id) ?? { name: entry.name, amount: 0, times: 0 };
    group.amount += amount;
    group.times += 1;
    groups.set(id, group);
  }
  return [...groups.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((group) => ({
      name: group.name,
      amount: roundFor(key, group.amount),
      share: Math.round((group.amount / total) * 100),
      times: group.times,
    }));
}

export type SlotShare = { slot: string; label: string; kcal: number; proteinG: number; share: number };

/** Promedio por día de calorías y proteína en cada momento, y su parte de las calorías del día. */
export function slotDistribution(entries: MealEntry[], setup: MealSetup): SlotShare[] {
  const days = new Set(entries.map((entry) => entry.date)).size || 1;
  const total = entries.reduce((sum, entry) => sum + entry.kcal, 0);
  const known = mealSlots(setup);
  const extra = [...new Set(entries.map((entry) => entry.slot))].filter(
    (slot) => !known.some((item) => item.id === slot),
  );
  return [
    ...known.map((item) => ({ id: item.id, label: item.label })),
    ...extra.map((id) => ({ id, label: id })),
  ].map((item) => {
    const inSlot = entries.filter((entry) => entry.slot === item.id);
    const kcal = inSlot.reduce((sum, entry) => sum + entry.kcal, 0);
    return {
      slot: item.id,
      label: item.label,
      kcal: Math.round(kcal / days),
      proteinG: round1(inSlot.reduce((sum, entry) => sum + entry.proteinG, 0) / days),
      share: total ? Math.round((kcal / total) * 100) : 0,
    };
  });
}

/**
 * Proteína por comida: cuántas comidas (momento de un día con algo anotado)
 * llegaron a 20 g, la cantidad que suele recomendarse para aprovecharla.
 */
export function proteinPerMeal(entries: MealEntry[]): { meals: number; withTwenty: number; average: number } {
  const meals = new Map<string, number>();
  for (const entry of entries) {
    const key = `${entry.date}|${entry.slot}`;
    meals.set(key, (meals.get(key) ?? 0) + entry.proteinG);
  }
  const values = [...meals.values()];
  return {
    meals: values.length,
    withTwenty: values.filter((value) => value >= 20).length,
    average: values.length ? round1(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
  };
}

export type TopMeal = { date: string; slot: string; label: string; amount: number; foods: string[] };

/** Las comidas (un momento de un día) que más aportaron de un nutriente, con lo que llevaban. */
export function topMeals(entries: MealEntry[], key: NutrientKey, limit = 3): TopMeal[] {
  const meals = new Map<string, TopMeal>();
  for (const entry of entries) {
    const amount = amountOf(entry, key);
    const id = [entry.date, entry.slot].join("|");
    const meal = meals.get(id) ?? {
      date: entry.date,
      slot: entry.slot,
      label: slotLabel(entry.slot),
      amount: 0,
      foods: [],
    };
    meal.amount += amount;
    if (amount > 0) meal.foods.push(entry.name);
    meals.set(id, meal);
  }
  return [...meals.values()]
    .filter((meal) => meal.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((meal) => ({ ...meal, amount: roundFor(key, meal.amount) }));
}

export type DailyTargets = { calories: number; protein: number; carbs: number; fats: number };
export type NutrientRing = {
  key: NutrientKey;
  label: string;
  unit: string;
  /** Promedio por día con comidas registradas. */
  amount: number;
  /** Meta del plan (macros) o valor de referencia (micros). */
  target: number;
  /** amount / target, sin tope (1 = llegó). */
  progress: number;
  /** Un tope que conviene no pasar (azúcar, grasa saturada, sodio). */
  limit: boolean;
};

/** Los anillos del resumen: macros contra el plan y micros contra su valor de referencia, por día. */
export function nutrientRings(entries: MealEntry[], targets: DailyTargets): NutrientRing[] {
  const days = new Set(entries.map((entry) => entry.date)).size || 1;
  const ring = (key: NutrientKey, target: number, limit = false): NutrientRing => {
    const amount = roundFor(key, entries.reduce((sum, entry) => sum + amountOf(entry, key), 0) / days);
    return {
      key,
      label: NUTRIENT_LABELS[key].label,
      unit: NUTRIENT_LABELS[key].unit,
      amount,
      target,
      progress: target > 0 ? amount / target : 0,
      limit,
    };
  };
  return [
    ring("kcal", targets.calories),
    ring("proteinG", targets.protein),
    ring("carbsG", targets.carbs),
    ring("fatsG", targets.fats),
    ...MICRO_KEYS.map((key) => ring(key, MICRO_INFO[key].reference, Boolean(MICRO_INFO[key].limit))),
  ];
}

/** Qué parte de las calorías registradas viene de alimentos con micros (los demás no suman). */
export function microsCoverage(entries: MealEntry[]): number {
  const total = entries.reduce((sum, entry) => sum + entry.kcal, 0);
  if (total <= 0) return 0;
  const known = entries.reduce((sum, entry) => sum + (entry.micros ? entry.kcal : 0), 0);
  return Math.round((known / total) * 100);
}
