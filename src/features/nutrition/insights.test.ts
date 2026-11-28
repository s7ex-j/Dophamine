import { describe, expect, it } from "vitest";

import {
  microsCoverage,
  nutrientRings,
  proteinPerMeal,
  slotDistribution,
  topContributors,
  topMeals,
} from "@/src/features/nutrition/insights";
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

describe("0.43.0: resumen de nutrientes", () => {
  const withMicros = [
    entry("2026-11-01", "breakfast", "Avena", 380, 13, { micros: { fiberG: 10, ironMg: 4 } }),
    entry("2026-11-01", "lunch", "Lentejas", 230, 18, { micros: { fiberG: 16, ironMg: 6.6 } }),
    entry("2026-11-01", "lunch", "Arroz", 260, 5, { micros: { fiberG: 0.6 } }),
    entry("2026-11-02", "dinner", "Pollo", 330, 62, { micros: { ironMg: 2 } }),
    entry("2026-11-02", "dinner", "Pan", 270, 9),
  ];

  it("los principales aportes también sirven para un micro", () => {
    expect(topContributors(withMicros, "fiberG").map((item) => [item.name, item.amount])).toEqual([
      ["Lentejas", 16],
      ["Avena", 10],
      ["Arroz", 0.6],
    ]);
  });

  it("la comida que más aportó, con sus alimentos", () => {
    const [best] = topMeals(withMicros, "ironMg");
    expect(best).toMatchObject({ date: "2026-11-01", slot: "lunch", label: "Almuerzo", amount: 6.6 });
    expect(best.foods).toEqual(["Lentejas"]);
    expect(topMeals(withMicros, "proteinG")[0]).toMatchObject({ slot: "dinner", amount: 71 });
  });

  it("los anillos son por día y comparan con el plan o la referencia", () => {
    const rings = nutrientRings(withMicros, { calories: 2000, protein: 140, carbs: 200, fats: 70 });
    expect(rings.find((ring) => ring.key === "kcal")).toMatchObject({ amount: 735, target: 2000 });
    const fiber = rings.find((ring) => ring.key === "fiberG");
    expect(fiber?.amount).toBeCloseTo(13.3, 1);
    expect(fiber?.progress).toBeCloseTo(13.3 / 28, 2);
    expect(rings.find((ring) => ring.key === "sodiumMg")?.limit).toBe(true);
    expect(rings).toHaveLength(4 + 14);
  });

  it("dice qué parte de lo comido trae micros", () => {
    expect(microsCoverage(withMicros)).toBe(82);
    expect(microsCoverage([])).toBe(0);
  });
});
