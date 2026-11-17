import { describe, expect, it } from "vitest";

import example from "@/docs/formatos/dieta.dophamine-diet.json";
import { coach } from "@/src/features/diet/coach";
import { dayTotals, dietDayFor, isWeekly, readDiet } from "@/src/features/diet/diet";
import { DietFormatError, importDietFile, isDietFile } from "@/src/features/diet/format";
import { EMPTY_HEALTH } from "@/src/features/health/health";

const copy = () => JSON.parse(JSON.stringify(example)) as typeof example;

describe("archivo de dieta (dophamine-diet)", () => {
  const plan = importDietFile(example, "2026-11-17");

  it("la plantilla publicada se lee completa", () => {
    expect(isDietFile(example)).toBe(true);
    expect(plan.name).toBe("Dieta de ejemplo");
    expect(isWeekly(plan)).toBe(true);
    expect(plan.days.map((day) => day.weekday)).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
    expect(plan.targets).toEqual({ kcal: 2600, proteinG: 160, carbsG: 330, fatsG: 70 });
    expect(plan.rules).toHaveLength(2);
  });

  it("cada alimento se calcula con sus valores por 100 y su cantidad", () => {
    const monday = plan.days[0];
    expect(monday.gym).toEqual({ start: "18:00", end: "19:30" });
    expect(monday.meals.map((meal) => meal.slot)).toEqual(["meal1", "meal2", "meal3", "meal4"]);
    expect(monday.meals[0]).toMatchObject({ label: "Avena con huevo y plátano", time: "07:30" });
    // 70 g de avena a 389 kcal y 16.9 g de proteína por 100 g.
    expect(monday.meals[0].items[0]).toEqual({
      name: "Avena (seca)",
      grams: 70,
      kcal: 272,
      proteinG: 11.8,
      carbsG: 46.2,
      fatsG: 4.8,
    });
    expect(monday.meals[2].tags).toEqual(["pre_gym"]);
    expect(dayTotals(monday).kcal).toBeGreaterThan(2000);
  });

  it("cada día de la semana usa su propio horario", () => {
    expect(dietDayFor(plan, true, "sat")?.meals[0].label).toBe("Pan con plátano");
    expect(dietDayFor(plan, false, "tue")?.meals).toHaveLength(3);
    const partial = copy();
    delete (partial.week as Record<string, unknown>).sun;
    expect(dietDayFor(importDietFile(partial, "2026-11-17"), false, "sun")).toBeNull();
  });

  it("sobrevive a guardarse y leerse de ajustes", () => {
    expect(readDiet(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
  });

  it("dice exactamente qué corregir", () => {
    expect(() => importDietFile({ format: "otra-cosa" }, "")).toThrow(DietFormatError);
    expect(() => importDietFile({ format: "dophamine-diet", version: 1 }, "")).toThrow(
      '"foods", "meals" y "week"',
    );
    const missing = copy();
    missing.meals.cena.items[0].food = "quinua";
    expect(() => importDietFile(missing, "")).toThrow('La comida "cena" usa el alimento "quinua"');
    const zero = copy();
    zero.meals.cena.items[0].amount = 0;
    expect(() => importDietFile(zero, "")).toThrow("no tiene una cantidad válida");
    const unknownMeal = copy();
    unknownMeal.week.mon.meals[0].meal = "brunch";
    expect(() => importDietFile(unknownMeal, "")).toThrow('Lunes usa la comida "brunch"');
    expect(() => importDietFile({ ...copy(), version: 2 }, "")).toThrow("versión más nueva");
  });

  it("el asesor respeta la comida marcada para antes y después de entrenar", () => {
    const monday = plan.days[0];
    const result = coach({
      day: monday,
      state: { date: "2026-11-16", swaps: [], trainTime: 18 * 60 },
      logged: [],
      now: 9 * 60,
      trainingDay: true,
      feeling: {},
      health: EMPTY_HEALTH,
      foods: [],
      targets: { calories: 2600, protein: 160 },
    });
    expect(result.askTraining).toBe(false);
    expect(result.meals.find((meal) => meal.around === "pre")?.label).toBe("Pan con plátano");
    expect(result.meals.find((meal) => meal.around === "post")?.label).toBe("Pollo con arroz");
  });
});
