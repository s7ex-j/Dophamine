import { describe, expect, it } from "vitest";

import { parseBackup } from "@/src/features/backup/backup";
import { BUILTIN_FOODS } from "./builtin.foods";
import { BUILTIN_MICROS } from "./builtin.micros";
import { nutrientsFor, sumNutrients } from "./foods";
import { scaleIngredient } from "./library";
import {
  MICRO_INFO,
  MICRO_KEYS,
  formatMicro,
  microsColumn,
  microsFrom,
  scaleMicros,
  sumMicros,
} from "./micros";
import { foodFromOffProduct } from "./openfoodfacts";

const food = (name: string) => {
  const found = BUILTIN_FOODS.find((item) => item.name === name);
  if (!found) throw new Error(`No existe ${name}`);
  return found;
};

describe("0.43.0: micronutrientes de los alimentos incluidos", () => {
  it("casi todos los alimentos incluidos los traen, y cada fila tiene los 14", () => {
    const withMicros = BUILTIN_FOODS.filter((item) => item.per100.micros);
    expect(withMicros.length).toBeGreaterThanOrEqual(230);
    expect(Object.values(BUILTIN_MICROS).every((row) => row.length === MICRO_KEYS.length)).toBe(true);
    // Todo nombre de la tabla existe en la lista de alimentos (si se renombra uno, falla aquí).
    const names = new Set(BUILTIN_FOODS.map((item) => item.name));
    expect(Object.keys(BUILTIN_MICROS).filter((name) => !names.has(name))).toEqual([]);
  });

  it("los valores son los del USDA por 100 g", () => {
    expect(food("Leche entera").per100.micros?.calciumMg).toBe(113);
    expect(food("Espinaca cocida").per100.micros?.ironMg).toBeCloseTo(3.57, 2);
    expect(food("Naranja").per100.micros?.vitaminCMg).toBeCloseTo(53.2, 1);
    expect(food("Hígado de res crudo").per100.micros?.vitaminB12Ug).toBeGreaterThan(50);
    expect(food("Lentejas cocidas").per100.micros?.fiberG).toBeCloseTo(7.9, 1);
  });

  it("sin una ficha parecida en el USDA, el alimento queda sin micros", () => {
    expect(food("Lúcuma, pulpa").per100.micros).toBeUndefined();
    expect(food("Creatina monohidrato").per100.micros).toBeUndefined();
  });
});

describe("0.43.0: micros al registrar y sumar", () => {
  it("una porción lleva sus micros en proporción y la suma los junta", () => {
    const milk = nutrientsFor(food("Leche entera"), 250);
    expect(milk.micros?.calciumMg).toBe(283);
    const lentils = nutrientsFor(food("Lentejas cocidas"), 200);
    expect(lentils.micros?.fiberG).toBeCloseTo(15.8, 1);
    const day = sumNutrients([milk, lentils, { kcal: 100, proteinG: 0, carbsG: 25, fatsG: 0 }]);
    expect(day.micros?.calciumMg).toBe(283 + (lentils.micros?.calciumMg ?? 0));
    expect(day.micros?.fiberG).toBeCloseTo(15.8, 1);
  });

  it("sin micros en ningún alimento, la suma no inventa ceros", () => {
    expect(sumNutrients([{ kcal: 100, proteinG: 1, carbsG: 2, fatsG: 3 }]).micros).toBeUndefined();
    expect(sumMicros([undefined, {}])).toBeUndefined();
    expect(scaleMicros(undefined, 2)).toBeUndefined();
  });

  it("un ingrediente de receta con otra cantidad cambia sus micros", () => {
    const ingredient = {
      foodId: "b:x",
      name: "X",
      grams: 100,
      kcal: 100,
      proteinG: 10,
      carbsG: 0,
      fatsG: 5,
      micros: { ironMg: 2, sodiumMg: 300 },
    };
    expect(scaleIngredient(ingredient, 50).micros).toEqual({ ironMg: 1, sodiumMg: 150 });
  });

  it("lee solo claves conocidas con números válidos", () => {
    expect(microsFrom({ ironMg: 2, raro: 5, sodiumMg: -1, calciumMg: "10" })).toEqual({ ironMg: 2 });
    expect(microsFrom([1, 2])).toBeUndefined();
    expect(microsColumn('{"fiberG":3}')).toEqual({ micros: { fiberG: 3 } });
    expect(microsColumn("{roto")).toEqual({});
    expect(microsColumn(null)).toEqual({});
  });

  it("muestra cada uno en su unidad", () => {
    expect(formatMicro("sodiumMg", 812.4)).toBe("812 mg");
    expect(formatMicro("fiberG", 12.44)).toBe("12.4 g");
    expect(formatMicro("vitaminB12Ug", 1.234)).toBe("1.23 µg");
    expect(MICRO_INFO.sodiumMg.limit).toBe(true);
  });
});

describe("0.43.0: micros de Open Food Facts", () => {
  it("pasa de gramos a la unidad de cada uno", () => {
    const off = foodFromOffProduct({
      code: "123",
      product_name: "Avena",
      nutriments: {
        "energy-kcal_100g": 380,
        proteins_100g: 13,
        carbohydrates_100g: 60,
        fat_100g: 7,
        fiber_100g: 10,
        sodium_100g: 0.004,
        iron_100g: 0.0042,
        "vitamin-d_100g": 0.0000025,
      },
    });
    expect(off?.per100.micros).toEqual({ fiberG: 10, sodiumMg: 4, ironMg: 4.2, vitaminDUg: 2.5 });
  });
});

describe("0.43.0: respaldo formato 11", () => {
  const meal = {
    id: "m",
    date: "2026-11-20",
    slot: "lunch",
    name: "Lentejas",
    grams: 200,
    kcal: 232,
    proteinG: 18,
    carbsG: 40,
    fatsG: 0.8,
  };
  const read = (format: number, meals: object[]) =>
    parseBackup(
      JSON.stringify({
        app: "dophamine",
        format,
        data: { biometrics: [], wellbeing: [], workouts: [], meals },
      }),
    );

  it("guarda y lee los micros de cada comida", () => {
    const backup = read(11, [{ ...meal, micros: { fiberG: 15.8, ironMg: 6.6 } }]);
    expect(backup.data.meals?.[0].micros).toEqual({ fiberG: 15.8, ironMg: 6.6 });
  });

  it("un respaldo de antes (formato 10) se lee igual, sin micros", () => {
    expect(read(10, [meal]).data.meals?.[0].micros).toBeUndefined();
  });

  it("rechaza micros que no son posibles", () => {
    expect(() => read(11, [{ ...meal, micros: { ironMg: -3 } }])).toThrow();
  });
});
