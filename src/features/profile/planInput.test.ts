import { describe, expect, it } from "vitest";

import { isValidPlanInput } from "./planInput";

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
});
