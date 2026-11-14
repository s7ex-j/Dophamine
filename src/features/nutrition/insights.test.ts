import { describe, expect, it } from "vitest";

import { proteinPerMeal, slotDistribution, topContributors } from "@/src/features/nutrition/insights";
import type { MealEntry } from "@/src/features/nutrition/meals";

const entry = (
  date: string,
  slot: string,
  name: string,
  kcal: number,
  proteinG: number,
  extra: Partial<MealEntry> = {},
): MealEntry => ({
  id: `${date}-${slot}-${name}`,
  date,
  slot,
  foodId: `f-${name}`,
  name,
  kcal,
  proteinG,
  carbsG: 0,
  fatsG: 0,
  ...extra,
});

const entries = [
  entry("2026-11-01", "breakfast", "Avena", 380, 13),
  entry("2026-11-01", "lunch", "Pollo", 330, 62),
  entry("2026-11-01", "lunch", "Arroz", 260, 5),
  entry("2026-11-02", "breakfast", "Avena", 380, 13),
  entry("2026-11-02", "dinner", "Pollo", 330, 62),
  entry("2026-11-02", "dinner", "Cerveza", 150, 1, { alcoholG: 14 }),
];

describe("principales aportes", () => {
  it("suma por alimento y ordena por lo que aporta", () => {
    const protein = topContributors(entries, "proteinG");
    expect(protein[0]).toMatchObject({ name: "Pollo", amount: 124, times: 2, share: 79 });
    const kcal = topContributors(entries, "kcal", 2);
    expect(kcal.map((item) => item.name)).toEqual(["Avena", "Pollo"]);
    expect(topContributors(entries, "alcoholG")).toEqual([
      { name: "Cerveza", amount: 14, share: 100, times: 1 },
    ]);
    expect(topContributors([], "kcal")).toEqual([]);
  });
});

describe("reparto en el día", () => {
  it("promedia por día cada momento y su parte de las calorías", () => {
    const slots = slotDistribution(entries, { style: "named", count: 4 });
    const breakfast = slots.find((slot) => slot.slot === "breakfast");
    expect(breakfast).toMatchObject({ kcal: 380, share: 42 });
    expect(slots.find((slot) => slot.slot === "lunch")).toMatchObject({ kcal: 295, proteinG: 33.5 });
    expect(slots.reduce((sum, slot) => sum + slot.share, 0)).toBeGreaterThanOrEqual(99);
  });

  it("cuenta las comidas que llegan a 20 g de proteína", () => {
    expect(proteinPerMeal(entries)).toEqual({ meals: 4, withTwenty: 2, average: 39 });
  });
});
