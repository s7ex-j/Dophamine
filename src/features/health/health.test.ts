import { describe, expect, it } from "vitest";

import { tagsOf, tagsOfName } from "@/src/features/health/foodTags";
import {
  EMPTY_HEALTH,
  foodFit,
  LAB_TESTS,
  labStatus,
  readHealth,
  suggestedConditions,
} from "@/src/features/health/health";
import { BUILTIN_FOODS } from "@/src/features/nutrition/builtin.foods";

const food = (name: string) => BUILTIN_FOODS.find((item) => item.name === name)!;
const allergens = (name: string) => tagsOf(food(name)).allergens;
const traits = (name: string) => tagsOf(food(name)).traits;

describe("etiquetas de alimentos", () => {
  it("reconoce los alérgenos comunes y no confunde parecidos", () => {
    expect(allergens("Pan francés")).toContain("gluten");
    expect(allergens("Leche entera")).toEqual(expect.arrayContaining(["dairy", "lactose"]));
    expect(allergens("Leche de almendras sin azúcar")).toEqual(["nuts"]);
    expect(allergens("Leche de soya sin azúcar")).toEqual(["soy"]);
    expect(allergens("Mantequilla de maní")).toEqual(["peanut"]);
    // Los quesos maduros casi no tienen lactosa, pero son lácteos.
    expect(allergens("Queso parmesano")).toEqual(["dairy"]);
    expect(allergens("Huevo duro")).toEqual(["egg"]);
    expect(allergens("Salmón cocido")).toEqual(["fish"]);
    expect(allergens("Camarones o langostinos cocidos")).toEqual(["shellfish"]);
    expect(allergens("Arroz blanco cocido")).toEqual([]);
    expect(allergens("Pechuga de pollo cocida, sin piel")).toEqual([]);
  });

  it("marca lo que aporta y lo que conviene limitar", () => {
    expect(traits("Hígado de res cocido")).toEqual(
      expect.arrayContaining(["iron", "b12", "folate", "purine"]),
    );
    expect(traits("Lentejas cocidas")).toEqual(expect.arrayContaining(["iron", "fiber", "folate", "fodmap"]));
    expect(traits("Naranja")).toEqual(expect.arrayContaining(["vitC", "acidic"]));
    expect(traits("Salmón cocido")).toEqual(expect.arrayContaining(["omega3", "vitD", "b12"]));
    expect(traits("Tocino frito")).toEqual(
      expect.arrayContaining(["satFat", "fried", "processedMeat", "sodium"]),
    );
    expect(traits("Gaseosa regular")).toContain("sugar");
    expect(traits("Gaseosa sin azúcar")).not.toContain("sugar");
    expect(traits("Cerveza")).toEqual(expect.arrayContaining(["alcohol", "purine"]));
    expect(traits("Cerveza sin alcohol")).not.toContain("alcohol");
    expect(traits("Carne molida de res 80/20 cocida")).toContain("satFat");
    expect(traits("Café negro sin azúcar")).toEqual(expect.arrayContaining(["caffeine", "acidic"]));
  });

  it("también etiqueta un nombre suelto", () => {
    expect(tagsOfName("Yogur griego con granola").allergens).toEqual(
      expect.arrayContaining(["gluten", "dairy", "lactose"]),
    );
  });
});

describe("perfil de salud", () => {
  it("compara un valor con el rango habitual según el sexo", () => {
    const hemoglobin = LAB_TESTS.find((test) => test.id === "hemoglobin")!;
    expect(labStatus(hemoglobin, 12.5, "male")).toBe("low");
    expect(labStatus(hemoglobin, 12.5, "female")).toBe("normal");
    const ldl = LAB_TESTS.find((test) => test.id === "ldl")!;
    expect(labStatus(ldl, 145, "male")).toBe("high");
    expect(labStatus(ldl, 100, "male")).toBe("normal");
  });

  it("sugiere condiciones con el último valor de cada examen, sin marcarlas", () => {
    const labs = [
      { id: "hemoglobin" as const, value: 11, date: "2026-06-01" },
      { id: "hemoglobin" as const, value: 14, date: "2026-10-01" },
      { id: "triglycerides" as const, value: 210, date: "2026-10-01" },
    ];
    expect(suggestedConditions(labs, "male")).toEqual(["highTriglycerides"]);
    expect(suggestedConditions(labs.slice(0, 1), "male")).toEqual(["lowIron"]);
  });

  it("bloquea lo que evitas y puntúa según tus condiciones", () => {
    const health = {
      avoid: ["lactose" as const],
      conditions: ["lowIron" as const, "gastritis" as const],
      labs: [],
    };
    expect(foodFit(food("Leche entera"), health).blocked).toEqual(["lactose"]);
    expect(foodFit(food("Queso parmesano"), health).blocked).toEqual([]);
    const lentils = foodFit(food("Lentejas cocidas"), health);
    expect(lentils.favored).toEqual(expect.arrayContaining(["iron", "folate"]));
    expect(lentils.score).toBeGreaterThan(0);
    const coffee = foodFit(food("Café negro sin azúcar"), health);
    expect(coffee.limited).toEqual(expect.arrayContaining(["caffeine", "acidic"]));
    expect(coffee.score).toBeLessThan(0);
    expect(foodFit(food("Leche entera"), EMPTY_HEALTH)).toMatchObject({ blocked: [], score: 0 });
  });

  it("descarta lo mal guardado", () => {
    expect(
      readHealth({ avoid: ["gluten", "piedras"], conditions: ["lowIron", "x"], labs: [{ id: "ldl" }] }),
    ).toEqual({
      avoid: ["gluten"],
      conditions: ["lowIron"],
      labs: [],
    });
    expect(readHealth(null)).toBe(EMPTY_HEALTH);
  });
});
