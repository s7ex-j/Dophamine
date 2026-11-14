import { describe, expect, it } from "vitest";

import { BUILTIN_FOODS } from "./builtin.foods";
import { cleanBarcode, foodFromOffProduct } from "./openfoodfacts";
import {
  buildCustomFood,
  buildRecipe,
  caloriesFromMacros,
  counterpart,
  equivalentGrams,
  emptyCustomFood,
  isFood,
  normalizeText,
  nutrientsFor,
  searchFoods,
  sumNutrients,
  type Food,
} from "./foods";
import {
  copyEntries,
  estimatedShare,
  isEstimate,
  suggestPartial,
  draftFromFood,
  draftFromQuick,
  emptyQuick,
  foodUsage,
  groupBySlot,
  mealSlots,
  normalizeMealSetup,
  slotsForDay,
  ingredientsFromDrafts,
  isMealEntry,
  legacyDraft,
  rescaleEntry,
  toggleId,
  slotForHour,
  suggestionsFor,
  totalsOf,
  type MealEntry,
} from "./meals";

const food = (name: string): Food => {
  const found = BUILTIN_FOODS.find((item) => item.name === name);
  if (!found) throw new Error(`Falta "${name}" en los alimentos básicos`);
  return found;
};
const chicken = food("Pechuga de pollo cocida, sin piel");
const rice = food("Arroz blanco cocido");

const entry = (
  id: string,
  slot: MealEntry["slot"],
  source: Food,
  grams: number,
  date = "2026-11-11",
): MealEntry => ({
  id,
  date,
  slot,
  ...draftFromFood(source, grams),
});

describe("alimentos básicos incluidos", () => {
  it("tienen ids únicos y una forma válida", () => {
    expect(new Set(BUILTIN_FOODS.map((item) => item.id)).size).toBe(BUILTIN_FOODS.length);
    expect(BUILTIN_FOODS.length).toBeGreaterThan(200);
    expect(BUILTIN_FOODS.every(isFood)).toBe(true);
  });

  it("sus calorías cuadran con sus macros", () => {
    // El alcohol cuenta a 7 kcal/g; la cocoa es casi toda fibra.
    const exceptions = ["Cocoa en polvo sin azúcar"];
    const off = BUILTIN_FOODS.filter((item) => {
      if (exceptions.includes(item.name)) return false;
      const { kcal, proteinG, carbsG, fatsG, alcoholG } = item.per100;
      return (
        Math.abs(kcal - caloriesFromMacros(proteinG, carbsG, fatsG, alcoholG)) > Math.max(25, kcal * 0.25)
      );
    });
    expect(off.map((item) => item.name)).toEqual([]);
  });

  it("ningún alimento suma más de 100 g de macros por cada 100 g", () => {
    const over = BUILTIN_FOODS.filter(
      (item) => item.per100.proteinG + item.per100.carbsG + item.per100.fatsG > 100.5,
    );
    expect(over.map((item) => item.name)).toEqual([]);
  });
});

describe("porciones y búsqueda", () => {
  it("calcula los nutrientes de una cantidad en gramos", () => {
    expect(nutrientsFor(chicken, 200)).toEqual({ kcal: 330, proteinG: 62, carbsG: 0, fatsG: 7.2 });
    expect(nutrientsFor(chicken, 0).kcal).toBe(0);
    expect(nutrientsFor(chicken, -50).kcal).toBe(0);
  });

  it("busca sin distinguir tildes ni mayúsculas", () => {
    expect(normalizeText("  Plátano,  de SEDA ")).toBe("platano de seda");
    expect(searchFoods(BUILTIN_FOODS, "platano")[0].name).toContain("Plátano");
    expect(searchFoods(BUILTIN_FOODS, "QUINUA").length).toBeGreaterThan(0);
    expect(searchFoods(BUILTIN_FOODS, "")).toEqual([]);
    expect(searchFoods(BUILTIN_FOODS, "xyzzy")).toEqual([]);
  });

  it("exige todas las palabras y pone primero lo que empieza con lo buscado", () => {
    const results = searchFoods(BUILTIN_FOODS, "pollo cocida");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((item) => /pollo/i.test(item.name) && /cocida/i.test(item.name))).toBe(true);
    expect(searchFoods(BUILTIN_FOODS, "arroz")[0].name.startsWith("Arroz")).toBe(true);
  });

  it("sube lo que la persona usa más y sus propios alimentos", () => {
    const mine: Food = { ...rice, id: "c:1", source: "custom", name: "Arroz de casa" };
    const all = [...BUILTIN_FOODS, mine];
    expect(searchFoods(all, "arroz", { [rice.id]: 5 })[0].id).toBe(rice.id);
    const withoutUsage = searchFoods(all, "arroz");
    expect(withoutUsage.findIndex((item) => item.id === "c:1")).toBeLessThan(
      withoutUsage.findIndex((item) => item.name === "Arroz integral cocido"),
    );
  });
});

describe("alimento propio", () => {
  const form = {
    ...emptyCustomFood(),
    name: " Yogur de casa ",
    servingG: "200",
    protein: "12",
    carbs: "10",
    fats: "6",
  };

  it("convierte los valores por porción a valores por 100 g", () => {
    const { food: built } = buildCustomFood(form, "c:9");
    expect(built).toMatchObject({ id: "c:9", source: "custom", name: "Yogur de casa", servingG: 200 });
    // 12·4 + 10·4 + 6·9 = 142 kcal por porción de 200 g
    expect(built?.per100).toEqual({ kcal: 71, proteinG: 6, carbsG: 5, fatsG: 3 });
    expect(nutrientsFor(built as Food, 200)).toEqual({ kcal: 142, proteinG: 12, carbsG: 10, fatsG: 6 });
  });

  it("respeta las calorías escritas y guarda la marca", () => {
    const { food: built } = buildCustomFood({ ...form, kcal: "150", brand: "Gloria" }, "c:9");
    expect(built?.per100.kcal).toBe(75);
    expect(built?.brand).toBe("Gloria");
  });

  it("explica qué falta", () => {
    expect(buildCustomFood(emptyCustomFood(), "x").error).toContain("nombre");
    expect(buildCustomFood({ ...form, servingG: "0" }, "x").error).toContain("gramos");
    expect(buildCustomFood({ ...emptyCustomFood(), name: "Agua" }, "x").error).toContain("calorías");
    expect(buildCustomFood({ ...form, servingG: "20" }, "x").error).toContain("más gramos que la porción");
  });
});

describe("registro rápido y comidas del día", () => {
  it("acepta solo calorías, o las calcula de los macros", () => {
    expect(draftFromQuick({ ...emptyQuick(), kcal: "450" }).draft).toEqual({
      name: "Registro rápido",
      kcal: 450,
      proteinG: 0,
      carbsG: 0,
      fatsG: 0,
    });
    const computed = draftFromQuick({ name: "Menú", kcal: "", protein: "30", carbs: "60", fats: "15" }).draft;
    expect(computed).toMatchObject({ name: "Menú", kcal: 495 });
    expect(draftFromQuick(emptyQuick()).error).toContain("calorías");
  });

  it("propone el momento del día según la hora", () => {
    expect(slotForHour(7)).toBe("breakfast");
    expect(slotForHour(13)).toBe("lunch");
    expect(slotForHour(20)).toBe("dinner");
    expect(slotForHour(16)).toBe("snack");
    expect(slotForHour(2)).toBe("breakfast");
  });

  it("suma el día y da el subtotal de cada momento", () => {
    const entries = [
      entry("1", "lunch", chicken, 150),
      entry("2", "lunch", rice, 200),
      entry("3", "dinner", rice, 100),
    ];
    expect(totalsOf(entries)).toEqual({ kcal: 638, proteinG: 54.6, carbsG: 84.6, fatsG: 6.3 });
    const groups = groupBySlot(entries);
    expect(groups.map((group) => group.entries.length)).toEqual([0, 2, 0, 1]);
    expect(groups[1].totals.kcal).toBe(508);
    expect(totalsOf([])).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatsG: 0 });
  });

  it("copia comidas a otro día con ids nuevos, sin tocar las originales", () => {
    const original = [entry("1", "lunch", chicken, 150), entry("2", "dinner", rice, 100)];
    let counter = 0;
    const copies = copyEntries(original, "2026-11-12", () => `n${(counter += 1)}`);
    expect(copies.map((item) => [item.id, item.date, item.slot])).toEqual([
      ["n1", "2026-11-12", "lunch"],
      ["n2", "2026-11-12", "dinner"],
    ]);
    expect(copies[0].kcal).toBe(original[0].kcal);
    expect(original[0].date).toBe("2026-11-11");
    expect(
      copyEntries(original, "2026-11-12", () => "x", "snack").every((item) => item.slot === "snack"),
    ).toBe(true);
  });

  it("conserva como entrada el total de un día registrado antes de las comidas", () => {
    expect(legacyDraft({ kcal: 2100, proteinG: 150, carbsG: 220, fatsG: 65 })).toMatchObject({
      name: "Total registrado antes",
      kcal: 2100,
    });
    expect(legacyDraft({ kcal: 0, proteinG: 0, carbsG: 0, fatsG: 0 })).toBeNull();
  });

  it("valida las entradas de un respaldo", () => {
    expect(isMealEntry(entry("1", "lunch", chicken, 150))).toBe(true);
    expect(isMealEntry({ ...entry("1", "lunch", chicken, 150), slot: "brunch" })).toBe(false);
    expect(isMealEntry({ ...entry("1", "lunch", chicken, 150), kcal: "muchas" })).toBe(false);
  });
});

describe("historial inteligente", () => {
  // Del más reciente al más antiguo, como los entrega el repositorio.
  const history = [
    entry("5", "breakfast", food("Avena en hojuelas, cruda"), 50, "2026-11-11"),
    entry("4", "lunch", chicken, 180, "2026-11-11"),
    entry("3", "breakfast", food("Huevo entero"), 100, "2026-11-10"),
    entry("2", "breakfast", food("Avena en hojuelas, cruda"), 40, "2026-11-10"),
    entry("1", "lunch", chicken, 150, "2026-11-09"),
    {
      id: "0",
      date: "2026-11-09",
      slot: "snack" as const,
      name: "Registro rápido",
      kcal: 200,
      proteinG: 0,
      carbsG: 0,
      fatsG: 0,
    },
  ];
  const usage = foodUsage(history);

  it("cuenta usos y recuerda la última cantidad", () => {
    expect(usage.counts[chicken.id]).toBe(2);
    expect(usage.lastGrams[chicken.id]).toBe(180);
    expect(usage.recent[0]).toBe(food("Avena en hojuelas, cruda").id);
    expect(Object.keys(usage.counts)).toHaveLength(3);
  });

  it("sugiere primero lo habitual a esa hora y luego lo reciente", () => {
    const breakfast = suggestionsFor("breakfast", usage, BUILTIN_FOODS).map((item) => item.name);
    expect(breakfast.slice(0, 2)).toEqual(["Avena en hojuelas, cruda", "Huevo entero"]);
    expect(breakfast).toContain(chicken.name);
    expect(suggestionsFor("lunch", usage, BUILTIN_FOODS)[0].id).toBe(chicken.id);
    expect(suggestionsFor("dinner", foodUsage([]), BUILTIN_FOODS)).toEqual([]);
  });
});

describe("recetas", () => {
  const drafts = [draftFromFood(chicken, 300), draftFromFood(rice, 500)];

  it("reparte el total entre las porciones", () => {
    const { food: recipe } = buildRecipe(" Pollo con arroz ", 4, ingredientsFromDrafts(drafts), "r:1");
    expect(recipe).toMatchObject({
      source: "recipe",
      name: "Pollo con arroz",
      servingG: 200,
      servingLabel: "porción",
    });
    expect(recipe?.ingredients).toHaveLength(2);
    // Total: 495 + 650 = 1145 kcal; una porción (200 g de 800) ≈ 286 kcal
    expect(nutrientsFor(recipe as Food, 200).kcal).toBeGreaterThanOrEqual(285);
    expect(nutrientsFor(recipe as Food, 200).kcal).toBeLessThanOrEqual(287);
    expect(nutrientsFor(recipe as Food, 800).proteinG).toBeCloseTo(106.5, 0);
  });

  it("no acepta recetas sin nombre, sin ingredientes o sin peso", () => {
    const ingredients = ingredientsFromDrafts(drafts);
    expect(buildRecipe("", 4, ingredients, "r").error).toContain("nombre");
    expect(buildRecipe("Vacía", 4, [], "r").error).toContain("ingrediente");
    expect(buildRecipe("Mala", 0, ingredients, "r").error).toContain("porciones");
    const quick = ingredientsFromDrafts([
      { name: "Registro rápido", kcal: 300, proteinG: 0, carbsG: 0, fatsG: 0 },
    ]);
    expect(buildRecipe("Rápida", 1, quick, "r").error).toContain("peso");
  });
});

describe("productos de Open Food Facts", () => {
  const product = {
    code: "3017620422003",
    product_name: "Nutella",
    brands: "Ferrero, Nutella",
    serving_quantity: "15",
    nutriments: { "energy-kcal_100g": 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 },
  };

  it("convierte un producto en un alimento con su código de barras", () => {
    expect(foodFromOffProduct(product)).toEqual({
      id: "off:3017620422003",
      source: "off",
      name: "Nutella",
      brand: "Ferrero",
      barcode: "3017620422003",
      servingG: 15,
      per100: { kcal: 539, proteinG: 6.3, carbsG: 57.5, fatsG: 30.9 },
    });
  });

  it("acepta la marca como lista y prefiere el nombre en español", () => {
    const food = foodFromOffProduct({
      ...product,
      product_name_es: "Crema de avellanas",
      brands: ["Ferrero"],
    });
    expect(food).toMatchObject({ name: "Crema de avellanas", brand: "Ferrero" });
  });

  it("calcula las calorías desde kilojulios o desde los macros si faltan", () => {
    const kj = foodFromOffProduct({ ...product, nutriments: { energy_100g: 2255, proteins_100g: 6.3 } });
    expect(kj?.per100.kcal).toBe(539);
    const macros = foodFromOffProduct({
      ...product,
      nutriments: { proteins_100g: 10, carbohydrates_100g: 20, fat_100g: 5 },
    });
    expect(macros?.per100.kcal).toBe(165);
    expect(macros?.servingG).toBe(15);
  });

  it("descarta productos sin nombre, sin datos o con valores imposibles", () => {
    expect(foodFromOffProduct(null)).toBeNull();
    expect(foodFromOffProduct({ ...product, product_name: "" })).toBeNull();
    expect(foodFromOffProduct({ ...product, nutriments: {} })).toBeNull();
    expect(foodFromOffProduct({ ...product, nutriments: { "energy-kcal_100g": 5390 } })).toBeNull();
    expect(foodFromOffProduct({ ...product, serving_quantity: undefined })?.servingG).toBe(100);
  });

  it("reconoce códigos de barras de 8 a 14 dígitos", () => {
    expect(cleanBarcode(" 7751271-012345 ")).toBe("7751271012345");
    expect(cleanBarcode("12345678")).toBe("12345678");
    expect(cleanBarcode("1234")).toBeNull();
    expect(cleanBarcode("avena")).toBeNull();
  });
});

describe("crudo y cocido", () => {
  const raw = food("Arroz blanco crudo");
  const cooked = food("Arroz blanco cocido");

  it("cada alimento con estado tiene su otra versión, y solo una", () => {
    const withState = BUILTIN_FOODS.filter((item) => item.state);
    expect(withState.length).toBeGreaterThan(80);
    const lonely = withState.filter((item) => {
      const other = counterpart(item, BUILTIN_FOODS);
      return !other || counterpart(other, BUILTIN_FOODS)?.id !== item.id;
    });
    expect(lonely.map((item) => item.name)).toEqual([]);
    const groups = new Map<string, number>();
    for (const item of withState) groups.set(item.pair as string, (groups.get(item.pair as string) ?? 0) + 1);
    expect([...groups.values()].every((count) => count === 2)).toBe(true);
  });

  it("pasa de crudo a cocido y al revés", () => {
    expect(counterpart(raw, BUILTIN_FOODS)?.id).toBe(cooked.id);
    expect(counterpart(cooked, BUILTIN_FOODS)?.id).toBe(raw.id);
    expect(counterpart(food("Manzana"), BUILTIN_FOODS)).toBeNull();
  });

  it("convierte la cantidad para que las calorías sean las mismas", () => {
    // 60 g crudos (219 kcal) son unos 168 g cocidos
    expect(equivalentGrams(raw, cooked, 60)).toBe(168);
    expect(equivalentGrams(cooked, raw, 168)).toBe(60);
    expect(nutrientsFor(cooked, 168).kcal).toBeCloseTo(nutrientsFor(raw, 60).kcal, -1);
    expect(equivalentGrams(raw, cooked, 0)).toBe(0);
  });

  it("no incluye platos armados: cada alimento se registra por separado", () => {
    const dishes = ["Lomo saltado", "Arroz con pollo", "Ají de gallina", "Hamburguesa", "Pizza", "Ceviche"];
    const found = BUILTIN_FOODS.filter((item) => dishes.some((dish) => item.name.includes(dish)));
    expect(found.map((item) => item.name)).toEqual([]);
  });
});

describe("editar una entrada", () => {
  const original = entry("1", "lunch", rice, 200);

  it("recalcula desde el alimento con otra cantidad", () => {
    const edited = rescaleEntry(original, 100, rice);
    expect(edited).toMatchObject({ id: "1", slot: "lunch", grams: 100, kcal: 130 });
  });

  it("escala proporcionalmente si el alimento ya no existe", () => {
    const edited = rescaleEntry(original, 300, null);
    expect(edited.kcal).toBe(Math.round(original.kcal * 1.5));
    expect(edited.grams).toBe(300);
    const quick = { ...original, grams: undefined };
    expect(rescaleEntry(quick, 300, null)).toBe(quick);
  });

  it("marca y desmarca favoritos", () => {
    expect(toggleId([], "a")).toEqual(["a"]);
    expect(toggleId(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("configuración de comidas", () => {
  it("con nombres: de 2 a 6 comidas en el orden del día", () => {
    expect(mealSlots({ style: "named", count: 3 }).map((slot) => slot.label)).toEqual([
      "Desayuno",
      "Almuerzo",
      "Cena",
    ]);
    expect(mealSlots({ style: "named", count: 5 }).map((slot) => slot.id)).toEqual([
      "breakfast",
      "midmorning",
      "lunch",
      "snack",
      "dinner",
    ]);
  });

  it("por número: Comida 1 … N, repartidas entre las 7 y las 21 h", () => {
    const slots = mealSlots({ style: "numbered", count: 5 });
    expect(slots.map((slot) => slot.label)).toEqual([
      "Comida 1",
      "Comida 2",
      "Comida 3",
      "Comida 4",
      "Comida 5",
    ]);
    expect(slots.map((slot) => slot.hour)).toEqual([7, 11, 14, 18, 21]);
    expect(slotForHour(15, { style: "numbered", count: 5 })).toBe("meal3");
  });

  it("corrige configuraciones inválidas", () => {
    expect(normalizeMealSetup(null)).toEqual({ style: "named", count: 4 });
    expect(normalizeMealSetup({ style: "numbered", count: 9 })).toEqual({ style: "numbered", count: 4 });
  });

  it("muestra también las entradas de momentos que ya no están en la configuración", () => {
    const entries = [entry("1", "lunch", rice, 100), entry("2", "meal2", rice, 100)];
    const slots = slotsForDay(entries, { style: "named", count: 3 });
    expect(slots.map((slot) => slot.label)).toEqual(["Desayuno", "Almuerzo", "Cena", "Comida 2"]);
    expect(isMealEntry(entry("3", "meal6", rice, 50))).toBe(true);
  });
});

describe("alcohol", () => {
  it("las bebidas alcohólicas traen su alcohol y suma aparte de los macros", () => {
    const beer = BUILTIN_FOODS.find((item) => item.name === "Cerveza")!;
    expect(beer.per100.alcoholG).toBe(3.9);
    const can = nutrientsFor(beer, 355);
    expect(can.alcoholG).toBeCloseTo(13.8, 1);
    expect(sumNutrients([can, can]).alcoholG).toBeCloseTo(27.6, 1);
    // Sin alcohol no aparece el campo.
    expect(sumNutrients([{ kcal: 100, proteinG: 1, carbsG: 1, fatsG: 1 }])).not.toHaveProperty("alcoholG");
    expect(caloriesFromMacros(0, 0, 0, 10)).toBe(70);
  });

  it("el registro rápido acepta gramos de alcohol", () => {
    const { draft } = draftFromQuick({ ...emptyQuick(), name: "Pisco sour", alcohol: "14", carbs: "12" });
    expect(draft).toMatchObject({ kcal: 146, alcoholG: 14, carbsG: 12 });
  });
});

describe("registros estimados", () => {
  const food = {
    id: "1",
    date: "2026-11-13",
    slot: "lunch",
    foodId: "b:arroz",
    name: "Arroz",
    kcal: 300,
    proteinG: 6,
    carbsG: 60,
    fatsG: 1,
  };
  const quick = {
    id: "2",
    date: "2026-11-13",
    slot: "dinner",
    name: "Cena fuera",
    kcal: 700,
    proteinG: 30,
    carbsG: 70,
    fatsG: 30,
  };

  it("un registro sin alimento detrás es una estimación", () => {
    expect(isEstimate(quick)).toBe(true);
    expect(isEstimate(food)).toBe(false);
    expect(estimatedShare([food, quick])).toBeCloseTo(0.7);
    expect(estimatedShare([])).toBe(0);
  });

  it("si más de la mitad del día es estimada, sugiere marcarlo incompleto (si no lo está)", () => {
    expect(suggestPartial([food, quick], false)).toBe(true);
    expect(suggestPartial([food, quick], true)).toBe(false);
    expect(suggestPartial([food, { ...quick, kcal: 200 }], false)).toBe(false);
  });
});
