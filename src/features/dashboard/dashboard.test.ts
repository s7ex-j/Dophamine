import { describe, expect, it } from "vitest";

import { buildWeek, dailyTip, nutritionGrid } from "./dashboard";

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

describe("aviso del día", () => {
  const targets = { calories: 2400, protein: 160 };
  it("prioriza la proteína cuando faltan muchas y quedan pocas calorías", () => {
    expect(dailyTip({ kcal: 2000, proteinG: 100 }, targets, 18)).toBe(
      "Te faltan 60 g de proteína y quedan 400 kcal: elige proteína magra.",
    );
    expect(dailyTip({ kcal: 900, proteinG: 60 }, targets, 13)).toBe(
      "Te faltan 100 g de proteína para tu meta de hoy.",
    );
  });
  it("avisa al pasarse, al final del día y si aún no hay nada", () => {
    expect(dailyTip({ kcal: 2900, proteinG: 170 }, targets, 21)).toContain(
      "Pasaste tu objetivo por 500 kcal",
    );
    expect(dailyTip({ kcal: 1900, proteinG: 150 }, targets, 20)).toBe(
      "Te quedan 500 kcal para cerrar el día.",
    );
    expect(dailyTip({ kcal: 0, proteinG: 0 }, targets, 9)).toBeNull();
    expect(dailyTip({ kcal: 0, proteinG: 0 }, targets, 14)).toBe("Aún no registras comida hoy.");
    expect(dailyTip({ kcal: 2350, proteinG: 158 }, targets, 21)).toBeNull();
  });
});
