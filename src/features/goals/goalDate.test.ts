import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { goalDatePlan, normalCdf, readGoalDate } from "@/src/features/goals/goalDate";
import { adaptiveEngine, type AdaptiveEstimate } from "@/src/features/tdee/adaptive";
import { addDays } from "@/src/lib/dates";

// Peso estable en 80 kg comiendo 2500: el motor encuentra un gasto cercano a 2500.
const records: DailyBiometrics[] = Array.from({ length: 40 }, (_, index) => ({
  id: String(index),
  date: addDays("2026-10-01", index),
  weightKg: 80 + (index % 2 ? 0.2 : -0.2),
  caloriesIn: 2500,
  proteinG: 150,
  carbsG: 250,
  fatsG: 70,
}));
const engine = adaptiveEngine(records) as AdaptiveEstimate;
const today = addDays("2026-10-01", 39);

describe("meta con fecha", () => {
  it("la normal estándar da los valores conocidos", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.645)).toBeCloseTo(0.05, 3);
  });

  it("comiendo lo mismo que gastas no llegas a bajar; propone el recorte más chico que llega al 70 %", () => {
    const plan = goalDatePlan(
      { date: addDays(today, 84), weightKg: 78 },
      today,
      80,
      Math.round(engine.tdee),
      engine,
    );
    expect(plan.daysLeft).toBe(84);
    expect(plan.requiredWeeklyKg).toBeCloseTo(-0.167, 2);
    expect(plan.probability).toBeLessThan(0.2);
    expect(plan.suggestion).toBeLessThan(0);
    expect(plan.suggestion).toBeGreaterThanOrEqual(-300);
    expect(plan.path.at(-1)?.day).toBe(84);
  });

  it("si ya vas a llegar no propone cambios; sin motor no inventa probabilidad", () => {
    const easy = goalDatePlan(
      { date: addDays(today, 60), weightKg: 79 },
      today,
      80,
      Math.round(engine.tdee) - 400,
      engine,
    );
    expect(easy.probability).toBeGreaterThan(0.7);
    expect(easy.suggestion).toBe(0);
    // Con 900 kcal de déficit 60 días bajarías unos 7 kg: te pasarías de la meta, más allá del margen.
    const over = goalDatePlan(
      { date: addDays(today, 60), weightKg: 79 },
      today,
      80,
      Math.round(engine.tdee) - 900,
      engine,
    );
    expect(over.overshootKg).toBeGreaterThan(1);
    const blind = goalDatePlan({ date: addDays(today, 10), weightKg: 79 }, today, 80, 2300, null);
    expect(blind).toMatchObject({
      probability: null,
      projection: null,
      suggestion: null,
      finalStretch: true,
    });
  });

  it("para subir de peso la probabilidad mira hacia arriba", () => {
    const plan = goalDatePlan(
      { date: addDays(today, 84), weightKg: 82 },
      today,
      80,
      Math.round(engine.tdee) + 300,
      engine,
    );
    expect(plan.probability).toBeGreaterThan(0.5);
  });

  it("lee lo guardado con cuidado", () => {
    expect(readGoalDate({ date: "2027-03-14", weightKg: 74 })).toEqual({ date: "2027-03-14", weightKg: 74 });
    expect(readGoalDate({ date: "mañana", weightKg: 74 })).toBeNull();
    expect(readGoalDate({ date: "2027-03-14", weightKg: 4 })).toBeNull();
  });
});
