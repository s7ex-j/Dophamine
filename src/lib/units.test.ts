import { describe, expect, it } from "vitest";

import { convertWeight, formatWeight, toKg, weightValue } from "./units";

describe("unidades de peso", () => {
  it("no cambia nada si la unidad es la misma", () => {
    expect(convertWeight(78.4, "kg", "kg")).toBe(78.4);
    expect(toKg(78.4, "kg")).toBe(78.4);
  });

  it("convierte entre kilogramos y libras", () => {
    expect(convertWeight(100, "kg", "lb")).toBeCloseTo(220.46, 2);
    expect(convertWeight(220.46, "lb", "kg")).toBeCloseTo(100, 2);
  });

  it("ida y vuelta: lo que se ve en libras no cambia al guardar y volver a mostrar", () => {
    for (const kg of [45, 62.5, 78, 78.4, 101.3, 140]) {
      const shown = weightValue(kg, "lb");
      const saved = toKg(Number(shown), "lb");
      expect(Math.abs(saved - kg)).toBeLessThanOrEqual(0.05);
      expect(weightValue(saved, "lb")).toBe(shown);
    }
  });

  it("muestra los kilogramos tal como se guardaron y las libras con un decimal", () => {
    expect(formatWeight(78, "kg")).toBe("78 kg");
    expect(formatWeight(78.4, "kg")).toBe("78.4 kg");
    expect(formatWeight(78, "lb")).toBe("172 lb");
    expect(formatWeight(78.4, "lb")).toBe("172.8 lb");
    expect(formatWeight(78.44, "kg", 1)).toBe("78.4 kg");
    expect(formatWeight(0.25, "lb", 2)).toBe("0.55 lb");
  });
});
