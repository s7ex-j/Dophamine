import { describe, expect, it } from "vitest";

import { buildWeek, heroMessageFor, nextStepFor } from "./dashboard";

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

  it("propone el siguiente paso según lo que falta", () => {
    expect(nextStepFor(false, 0, 5).route).toBe("/biometrics");
    expect(nextStepFor(true, 3, 5)).toMatchObject({
      route: "/habits",
      detail: "Llevas 3 de 5 compromisos diarios.",
    });
    expect(nextStepFor(true, 5, 5).route).toBe("/training");
  });

  it("resume la energía del día", () => {
    expect(heroMessageFor(null, 2750)).toContain("no has registrado");
    expect(heroMessageFor(1510, 2750)).toBe("1240 kcal para cerrar tu objetivo.");
    expect(heroMessageFor(3000, 2750)).toContain("superaste");
  });
});
