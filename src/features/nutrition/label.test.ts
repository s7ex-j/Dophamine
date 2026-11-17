import { describe, expect, it } from "vitest";

import { readLabel } from "@/src/features/nutrition/label";

describe("leer una etiqueta nutricional", () => {
  it("encuentra porción, calorías y macros, sin confundir saturadas ni azúcares", () => {
    const reading = readLabel(`INFORMACIÓN NUTRICIONAL
Porción: 30 g (3 galletas)
                 Por porción
Energía  470 kJ / 112 kcal
Grasas totales   3,7 g
  Grasas saturadas 1,1 g
Carbohidratos    17 g
  Azúcares 6 g
Proteínas        2,1 g`);
    expect(reading).toEqual({
      servingG: 30,
      basis: "serving",
      values: { kcal: 112, protein: 2.1, carbs: 17, fats: 3.7 },
      suspicious: [],
      fix: null,
    });
  });

  it("si las calorías no cuadran, propone el dato con la coma perdida", () => {
    const reading = readLabel(
      "Valor energético 373 kcal\nProteínas 10,7 g\nCarbohidratos 66,7 g\nGrasas 70 g",
    );
    expect(reading.fix).toEqual({ field: "fats", value: 7 });
    expect(reading.suspicious).toEqual(["fats"]);
    expect(reading.basis).toBe("100g");
  });

  it("marca lo que no encontró", () => {
    expect(readLabel("Calorías 200\nProteína 10 g").suspicious).toEqual(["carbs", "fats"]);
  });
});
