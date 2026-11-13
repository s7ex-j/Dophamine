import { describe, expect, it } from "vitest";

import type { MealEntry } from "@/src/features/nutrition/meals";
import {
  buildSavedMeal,
  readSavedMeals,
  removeSavedMeal,
  savedMealTotals,
  upsertSavedMeal,
} from "@/src/features/nutrition/savedMeals";

const entry = (id: string, name: string, kcal: number): MealEntry => ({
  id,
  date: "2026-11-13",
  slot: "breakfast",
  foodId: `f-${name}`,
  name,
  grams: 100,
  kcal,
  proteinG: 10,
  carbsG: 20,
  fatsG: 5,
});

describe("comidas guardadas", () => {
  it("se arman con lo anotado, sin fecha ni momento", () => {
    const meal = buildSavedMeal(
      "  Mi desayuno ",
      [entry("1", "Avena", 380), entry("2", "Plátano", 90)],
      "m1",
    );
    expect(meal?.name).toBe("Mi desayuno");
    expect(meal?.items).toHaveLength(2);
    expect(meal?.items[0]).not.toHaveProperty("date");
    expect(meal?.items[0]).not.toHaveProperty("slot");
    expect(meal?.items[0]).toMatchObject({ foodId: "f-Avena", grams: 100 });
    expect(savedMealTotals(meal!)).toMatchObject({ kcal: 470, proteinG: 20 });
    expect(buildSavedMeal("", [entry("1", "Avena", 380)], "m2")).toBeNull();
    expect(buildSavedMeal("Vacía", [], "m3")).toBeNull();
  });

  it("guardar con el mismo nombre reemplaza y queda primera; se pueden borrar", () => {
    const first = buildSavedMeal("Almuerzo", [entry("1", "Arroz", 200)], "a")!;
    const other = buildSavedMeal("Cena", [entry("2", "Pollo", 250)], "b")!;
    const again = buildSavedMeal("almuerzo", [entry("3", "Quinua", 220)], "c")!;
    const list = upsertSavedMeal(upsertSavedMeal(upsertSavedMeal([], first), other), again);
    expect(list.map((meal) => meal.id)).toEqual(["c", "b"]);
    expect(removeSavedMeal(list, "c").map((meal) => meal.id)).toEqual(["b"]);
  });

  it("descarta lo guardado que no tiene forma de comida", () => {
    const good = buildSavedMeal("Cena", [entry("2", "Pollo", 250)], "b");
    expect(
      readSavedMeals([good, { id: 1 }, null, { id: "x", name: "Rota", items: [{ name: "?" }] }]),
    ).toEqual([good]);
    expect(readSavedMeals("nada")).toEqual([]);
  });
});
