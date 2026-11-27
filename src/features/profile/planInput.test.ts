import { describe, expect, it } from "vitest";

import { isValidPlanInput, planInputProblem, weightRangeText } from "./planInput";

describe("datos del plan", () => {
  it("acepta valores normales", () => {
    expect(isValidPlanInput({ age: 24, heightCm: 176, weightKg: 77 })).toBe(true);
  });
  it("rechaza edades, alturas y pesos fuera de rango o vacíos", () => {
    expect(isValidPlanInput({ age: 12, heightCm: 176, weightKg: 77 })).toBe(false);
    expect(isValidPlanInput({ age: 24.5, heightCm: 176, weightKg: 77 })).toBe(false);
    expect(isValidPlanInput({ age: 24, heightCm: 119, weightKg: 77 })).toBe(false);
    expect(isValidPlanInput({ age: 24, heightCm: 176, weightKg: 30 })).toBe(false);
    expect(isValidPlanInput({ age: Number(""), heightCm: Number(""), weightKg: Number("") })).toBe(false);
  });
  it("dice qué dato está mal y su rango, en la unidad de la persona", () => {
    const ok = { age: 24, heightCm: 176, weightKg: 77 };
    expect(planInputProblem({ ...ok, age: 999 })).toBe(
      "Escribe tu edad: entre 13 y 100 años, sin decimales.",
    );
    expect(planInputProblem({ ...ok, heightCm: 1760 })).toContain("entre 120 y 230 cm");
    expect(planInputProblem({ ...ok, weightKg: 770 })).toBe("Escribe tu peso: entre 30 y 300 kg.");
    expect(planInputProblem({ ...ok, weightKg: 770 }, "lb")).toBe("Escribe tu peso: entre 66 y 661 lb.");
    expect(weightRangeText("kg")).toBe("30 y 300 kg");
    expect(planInputProblem(ok)).toBeNull();
  });
});
