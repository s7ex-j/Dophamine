import { describe, expect, it } from "vitest";

import {
  clipboardKcal,
  copyMeal,
  copyWholeDay,
  pastePlan,
  readClipboard,
} from "@/src/features/nutrition/clipboard";
import type { MealEntry } from "@/src/features/nutrition/meals";

const entry = (slot: string, name: string, kcal: number): MealEntry => ({
  id: `${slot}-${name}`,
  date: "2026-11-12",
  slot,
  foodId: `f-${name}`,
  name,
  grams: 100,
  kcal,
  proteinG: 10,
  carbsG: 10,
  fatsG: 5,
});
const day = [entry("breakfast", "Avena", 380), entry("lunch", "Pollo", 330), entry("lunch", "Arroz", 260)];

describe("copiar y pegar comidas", () => {
  it("una comida se pega en el momento que elijas, sin ids ni fechas", () => {
    const clip = copyMeal(
      day.filter((item) => item.slot === "lunch"),
      "Almuerzo",
    )!;
    expect(clipboardKcal(clip)).toBe(590);
    const plan = pastePlan(clip, "dinner");
    expect(plan).toHaveLength(1);
    expect(plan[0].slot).toBe("dinner");
    expect(plan[0].drafts[0]).not.toHaveProperty("id");
    expect(pastePlan(clip)).toEqual([]);
    expect(copyMeal([], "Nada")).toBeNull();
  });

  it("un día entero se pega en sus mismos momentos", () => {
    const clip = copyWholeDay(day, "2026-11-12")!;
    expect(pastePlan(clip, "dinner").map((item) => item.slot)).toEqual(["breakfast", "lunch"]);
    expect(clipboardKcal(clip)).toBe(970);
    expect(readClipboard(JSON.parse(JSON.stringify(clip)))).toEqual(clip);
    expect(readClipboard({ kind: "meal", drafts: [] })).toBeNull();
  });
});
