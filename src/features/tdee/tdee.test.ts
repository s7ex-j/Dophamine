import { describe, expect, it } from "vitest";
import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { buildNutritionProfile } from "@/src/features/profile/profile";
import { analyzeMetabolism, buildWeeklyCheckIn, weeklyRecommendation } from "@/src/features/tdee/tdee";

function days(count: number, record: (index: number) => { weightKg: number; caloriesIn: number }): DailyBiometrics[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
    return { id: date, date, proteinG: 0, carbsG: 0, fatsG: 0, ...record(index) };
  });
}

const profile = buildNutritionProfile({ age: 25, sex: "male", heightCm: 180, weightKg: 75, activity: "moderate", goal: "maintain" });

describe("analyzeMetabolism", () => {
  it("no estima el TDEE con menos de 14 días de registros", () => {
    const analysis = analyzeMetabolism(days(13, () => ({ weightKg: 75, caloriesIn: 2500 })));
    expect(analysis.status).toBe("building");
    expect(analysis.tdee).toBeNull();
  });

  it("con peso estable, el TDEE es la ingesta media", () => {
    const analysis = analyzeMetabolism(days(21, () => ({ weightKg: 75, caloriesIn: 2500 })));
    expect(analysis.status).toBe("updating");
    expect(analysis.weeklyRateKg).toBeCloseTo(0);
    expect(analysis.tdee).toBe(2500);
  });

  it("si el peso baja, el gasto estimado supera a la ingesta", () => {
    const analysis = analyzeMetabolism(days(28, (index) => ({ weightKg: 80 - index * 0.07, caloriesIn: 2200 })));
    expect(analysis.weeklyRateKg).toBeLessThan(0);
    expect(analysis.tdee).toBeGreaterThan(2200);
  });

  it("ordena los registros por fecha antes de calcular la tendencia", () => {
    const ordered = days(21, (index) => ({ weightKg: 75 + index * 0.05, caloriesIn: 2600 }));
    expect(analyzeMetabolism([...ordered].reverse())).toEqual(analyzeMetabolism(ordered));
  });

  it("pasa a pausa si la última semana tiene pocos registros de ingesta", () => {
    const analysis = analyzeMetabolism(days(21, (index) => ({ weightKg: 75, caloriesIn: index < 14 || index === 20 ? 2500 : 0 })));
    expect(analysis.nutritionDaysLast7).toBe(1);
    expect(analysis.status).toBe("holding");
  });
});

describe("buildWeeklyCheckIn", () => {
  it("explica qué falta mientras la estimación se construye", () => {
    const checkIn = buildWeeklyCheckIn(analyzeMetabolism(days(5, () => ({ weightKg: 75, caloriesIn: 2500 }))), profile);
    expect(checkIn).toMatchObject({ status: "building", ready: false, suggestedCalories: null });
    expect(checkIn.message).toContain("5/10");
  });

  it("limita cada ajuste semanal a ±100 kcal", () => {
    const analysis = analyzeMetabolism(days(21, () => ({ weightKg: 75, caloriesIn: 3200 })));
    const checkIn = buildWeeklyCheckIn(analysis, profile);
    expect(checkIn.ready).toBe(true);
    expect(checkIn.delta).toBe(100);
    expect(checkIn.suggestedCalories).toBe(profile.calorieTarget + 100);
  });

  it("no propone cambios cuando el objetivo ya coincide con la estimación", () => {
    const analysis = analyzeMetabolism(days(21, () => ({ weightKg: 75, caloriesIn: profile.calorieTarget + 10 })));
    const checkIn = buildWeeklyCheckIn(analysis, profile);
    expect(Math.abs(checkIn.delta ?? 0)).toBeLessThan(25);
    expect(checkIn.message).toContain("coincide");
  });
});

describe("weeklyRecommendation", () => {
  it("pide más registros si todavía no hay TDEE", () => {
    const analysis = analyzeMetabolism(days(3, () => ({ weightKg: 75, caloriesIn: 2500 })));
    expect(weeklyRecommendation(analysis, "maintain", 75)).toContain("14 días");
  });

  it("mantiene el plan cuando la tendencia coincide con el objetivo", () => {
    const analysis = analyzeMetabolism(days(21, () => ({ weightKg: 75, caloriesIn: 2500 })));
    expect(weeklyRecommendation(analysis, "maintain", 75)).toContain("Mantén el plan");
  });
});
