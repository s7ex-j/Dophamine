import { describe, expect, it } from "vitest";

import {
  dayTotals,
  dietDayFor,
  dietToText,
  matchFood,
  otherState,
  parseDietText,
  parseItem,
  readDiet,
  replaceItem,
  scaleItem,
  splitQuantity,
  unresolved,
} from "@/src/features/diet/diet";
import { BUILTIN_FOODS } from "@/src/features/nutrition/builtin.foods";

const TEXT = `
Día de entreno
Desayuno 7:30
- Avena 60 g
- 2 huevos
- 1 plátano de seda
Almuerzo:
- Arroz blanco cocido 200 g
- Pechuga de pollo 150 g
- 1/2 palta
Pre entreno 17:00
- Pan francés 2 unidades
- Mermelada 1 cucharada
Cena
- Fruta del dragón 100 g

Día de descanso
Desayuno
- Avena 40 g
Cena
- Lentejas cocidas 250 g
`;

describe("leer cantidades", () => {
  it("entiende cantidad antes o después, medidas caseras y fracciones", () => {
    expect(splitQuantity("- Avena 60 g")).toEqual({ name: "avena", amount: 60, unit: "g" });
    expect(splitQuantity("60 g de avena")).toEqual({ name: "avena", amount: 60, unit: "g" });
    expect(splitQuantity("2 huevos")).toEqual({ name: "huevos", amount: 2, unit: null });
    expect(splitQuantity("1/2 palta")).toEqual({ name: "palta", amount: 0.5, unit: null });
    expect(splitQuantity("1 taza de arroz cocido")).toEqual({
      name: "arroz cocido",
      amount: 1,
      unit: "taza",
    });
    expect(splitQuantity("Leche descremada 250 ml")).toEqual({
      name: "leche descremada",
      amount: 250,
      unit: "ml",
    });
    expect(splitQuantity("Queso 1,5 porciones")).toMatchObject({ amount: 1.5, unit: "porciones" });
  });

  it("enlaza con el alimento; entre crudo y cocido elige el habitual", () => {
    expect(matchFood("pechuga de pollo", BUILTIN_FOODS)?.name).toBe("Pechuga de pollo cocida, sin piel");
    expect(matchFood("pechuga de pollo cruda", BUILTIN_FOODS)?.name).toBe("Pechuga de pollo cruda, sin piel");
    // La avena se pesa seca.
    expect(matchFood("avena", BUILTIN_FOODS)?.name).toBe("Avena en hojuelas, cruda");
    expect(matchFood("huevos", BUILTIN_FOODS)?.name).toContain("Huevo");
    expect(matchFood("fruta del dragon", BUILTIN_FOODS)).toBeNull();
  });

  it("usa la porción del alimento para unidades y marca lo dudoso", () => {
    const eggs = parseItem("2 huevos", BUILTIN_FOODS);
    expect(eggs.grams).toBeGreaterThan(80);
    expect(eggs.proteinG).toBeGreaterThan(10);
    const chicken = parseItem("Pechuga de pollo 150 g", BUILTIN_FOODS);
    expect(chicken).toMatchObject({ grams: 150, ambiguous: true });
    expect(parseItem("Pechuga de pollo cocida 150 g", BUILTIN_FOODS).ambiguous).toBeUndefined();
    expect(parseItem("Fruta del dragón 100 g", BUILTIN_FOODS)).toMatchObject({ unknown: true, kcal: 0 });
  });
});

describe("leer una dieta", () => {
  const { plan, unknown, ambiguous } = parseDietText(TEXT, BUILTIN_FOODS, "Volumen", "2026-11-16");

  it("separa días, comidas con hora e ítems", () => {
    expect(plan.days.map((day) => day.kind)).toEqual(["training", "rest"]);
    const training = plan.days[0];
    expect(training.meals.map((meal) => [meal.slot, meal.label, meal.time])).toEqual([
      ["breakfast", "Desayuno", "07:30"],
      ["lunch", "Almuerzo", undefined],
      ["midmorning", "Pre entreno", "17:00"],
      ["dinner", "Cena", undefined],
    ]);
    expect(training.meals[0].items).toHaveLength(3);
    expect(training.meals[1].items[2].grams).toBeGreaterThan(20);
    expect(unknown).toBe(1);
    expect(ambiguous).toBeGreaterThanOrEqual(1);
    expect(dayTotals(training).kcal).toBeGreaterThan(1200);
  });

  it("elige el día según si se entrena", () => {
    expect(dietDayFor(plan, true)?.kind).toBe("training");
    expect(dietDayFor(plan, false)?.kind).toBe("rest");
    const single = parseDietText("Desayuno\n- Avena 60 g", BUILTIN_FOODS).plan;
    expect(dietDayFor(single, true)?.kind).toBe("any");
  });

  it("se guarda y se vuelve a leer; el texto exportado se vuelve a entender", () => {
    expect(readDiet(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
    expect(readDiet({ name: "x", days: [] })).toBeNull();
    const again = parseDietText(dietToText(plan), BUILTIN_FOODS, "Volumen", "2026-11-16").plan;
    expect(again.days[0].meals.map((meal) => meal.items.length)).toEqual(
      plan.days[0].meals.map((meal) => meal.items.length),
    );
  });

  it("cambia la cantidad de un ítem en proporción", () => {
    const rice = plan.days[0].meals[1].items[0];
    const less = scaleItem(rice, 0.75);
    expect(less.grams).toBe(150);
    expect(less.kcal).toBe(Math.round(rice.kcal * 0.75));
  });
});

describe("editar la dieta", () => {
  const { plan } = parseDietText(
    "Almuerzo\n- Pechuga de pollo 150 g\n- Fruta del dragón 100 g",
    BUILTIN_FOODS,
  );

  it("cambia entre crudo y cocido con los mismos gramos", () => {
    const chicken = plan.days[0].meals[0].items[0];
    const raw = otherState(chicken, BUILTIN_FOODS);
    expect(raw?.name).toBe("Pechuga de pollo cruda, sin piel");
    expect(raw?.grams).toBe(150);
    expect(raw!.kcal).toBeLessThan(chicken.kcal);
  });

  it("reemplaza o quita ítems y cuenta lo que falta resolver", () => {
    expect(unresolved(plan)).toBe(1);
    const fixed = replaceItem(plan, { day: 0, meal: 0, item: 1 }, parseItem("Mango 100 g", BUILTIN_FOODS));
    expect(unresolved(fixed)).toBe(0);
    const removed = replaceItem(fixed, { day: 0, meal: 0, item: 0 }, null);
    expect(removed.days[0].meals[0].items).toHaveLength(1);
    expect(replaceItem(removed, { day: 0, meal: 0, item: 0 }, null).days).toEqual([]);
  });
});
