import { describe, expect, it } from "vitest";

import { buildWeek, nutritionGrid } from "./dashboard";

const record = (date: string, caloriesIn: number) => ({
  id: date,
  date,
  weightKg: 78,
  caloriesIn,
  proteinG: 0,
  carbsG: 0,
  fatsG: 0,
});

describe("tablero de hoy", () => {
  it("arma siete días con hoy al final y enlaza los registros", () => {
    const week = buildWeek([record("2026-11-10", 2300)], new Date(2026, 10, 11, 21, 30));
    expect(week).toHaveLength(7);
    expect(week[6].key).toBe("2026-11-11");
    expect(week[5].record?.caloriesIn).toBe(2300);
    expect(week[0].record).toBeUndefined();
  });
});

describe("cuadrícula de nutrición", () => {
  const targets = { calories: 2000, protein: 150, fats: 60, carbs: 200 };
  const week = buildWeek(
    [
      {
        id: "1",
        date: "2026-11-11",
        weightKg: null,
        caloriesIn: 1500,
        proteinG: 120,
        carbsG: 150,
        fatsG: 50,
      },
    ],
    new Date(2026, 10, 11, 12),
  );

  it("da una fila por dato y un valor por día", () => {
    const grid = nutritionGrid(week, targets, "consumed");
    expect(grid.map((row) => row.key)).toEqual(["kcal", "protein", "fats", "carbs"]);
    expect(grid[0].values).toEqual([0, 0, 0, 0, 0, 0, 1500]);
    expect(grid[1]).toMatchObject({ target: 150, values: [0, 0, 0, 0, 0, 0, 120] });
  });

  it("en modo restante muestra lo que falta y nunca negativo", () => {
    const grid = nutritionGrid(week, { ...targets, protein: 100 }, "remaining");
    expect(grid[0].values.at(-1)).toBe(500);
    expect(grid[0].values[0]).toBe(2000);
    expect(grid[1].values.at(-1)).toBe(0);
  });
});
