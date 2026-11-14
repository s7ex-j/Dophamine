import { mealSlots, type MealEntry, type MealSetup } from "@/src/features/nutrition/meals";

/**
 * Qué alimentos aportan más de cada nutriente y cómo se reparte lo comido en
 * el día (nutrient timing). Sale de lo ya registrado. Módulo puro.
 */
export type NutrientKey = "kcal" | "proteinG" | "carbsG" | "fatsG" | "alcoholG";
export const NUTRIENT_LABELS: Record<NutrientKey, { label: string; unit: string }> = {
  kcal: { label: "Calorías", unit: "kcal" },
  proteinG: { label: "Proteína", unit: "g" },
  carbsG: { label: "Carbos", unit: "g" },
  fatsG: { label: "Grasas", unit: "g" },
  alcoholG: { label: "Alcohol", unit: "g" },
};

const amountOf = (entry: MealEntry, key: NutrientKey) =>
  key === "alcoholG" ? (entry.alcoholG ?? 0) : entry[key];
const round1 = (value: number) => Math.round(value * 10) / 10;

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
      amount: key === "kcal" ? Math.round(group.amount) : round1(group.amount),
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
