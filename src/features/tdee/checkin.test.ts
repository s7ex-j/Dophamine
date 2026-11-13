import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { buildNutritionProfile } from "@/src/features/profile/profile";
import { addWaterMl, formatWater, waterTargetMl } from "@/src/features/water/water";
import { analyzeMetabolism } from "./tdee";
import { adherenceGap, averageIntake, contextualCheckIn, taperFactor } from "./checkin";

function days(count: number, record: (index: number) => Partial<DailyBiometrics>): DailyBiometrics[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
    return {
      id: date,
      date,
      weightKg: 75,
      caloriesIn: 2500,
      proteinG: 0,
      carbsG: 0,
      fatsG: 0,
      ...record(index),
    };
  });
}

// Definición: 75 kg → 70 kg a ritmo moderado (−0.375 kg/semana ≈ −413 kcal/día).
const profile = {
  ...buildNutritionProfile({
    age: 25,
    sex: "male",
    heightCm: 180,
    weightKg: 75,
    activity: "moderate",
    goal: "lose",
    pace: "moderate",
  }),
  goalWeightKg: 70,
  checkInDays: 7 as const,
  calorieTarget: 2300,
};
// Peso estable comiendo 2300: el gasto observado es ~2300 y toca bajar.
const stable = days(21, () => ({ caloriesIn: 2300 }));
const analysis = analyzeMetabolism(stable);
const recent = stable.slice(-7);

describe("revisión con contexto", () => {
  it("sin contexto especial propone bajar con el paso normal", () => {
    const checkIn = contextualCheckIn(analysis, profile, { recent, sleepMinutes: 450 });
    expect(checkIn.delta).toBe(-100);
    expect(checkIn.reasons).toEqual([]);
  });

  it("si no se comió lo planeado, mantiene la meta y lo explica", () => {
    const over = recent.map((record) => ({ ...record, caloriesIn: 2700 }));
    const checkIn = contextualCheckIn(analysis, profile, { recent: over, sleepMinutes: 450 });
    expect(checkIn.delta).toBe(0);
    expect(checkIn.reasons).toEqual(["adherence"]);
    expect(checkIn.message).toContain("17 % por encima");
    expect(adherenceGap(over, 2300)).toBeCloseTo(0.174, 2);
  });

  it("los días incompletos no cuentan para el cumplimiento", () => {
    const partial = recent.map((record, index) =>
      index < 3 ? { ...record, caloriesIn: 900, partial: true } : record,
    );
    expect(averageIntake(partial)).toBe(2300);
  });

  it("con poco sueño no profundiza el déficit", () => {
    const checkIn = contextualCheckIn(analysis, profile, { recent, sleepMinutes: 360 });
    expect(checkIn.delta).toBe(0);
    expect(checkIn.reasons).toContain("sleep");
    expect(checkIn.message).toContain("menos de 7 h");
  });

  it("cerca de la meta reduce el ritmo, y al llegar pasa a mantenimiento", () => {
    expect(taperFactor(-5, -0.375)).toBe(1);
    expect(taperFactor(-1, -0.4)).toBeCloseTo(0.625);
    expect(taperFactor(-0.1, -0.4)).toBe(0.5);
    const near = analyzeMetabolism(days(21, () => ({ weightKg: 70.8, caloriesIn: 2300 })));
    const nearCheck = contextualCheckIn(near, profile, { recent, sleepMinutes: 450 });
    expect(nearCheck.reasons).toContain("approachingGoal");
    const reached = analyzeMetabolism(days(21, () => ({ weightKg: 69.9, caloriesIn: 2300 })));
    const done = contextualCheckIn(reached, profile, { recent, sleepMinutes: 450 });
    expect(done.reasons).toEqual(["goalReached"]);
    expect(done.suggestedCalories).toBe(2300);
    expect(done.message).toContain("peso meta");
  });

  it("si el ritmo real va muy lejos del buscado, el paso es mayor", () => {
    // Sube de peso comiendo 2300 cuando debería bajar: la diferencia es grande.
    const gaining = analyzeMetabolism(
      days(21, (index) => ({ weightKg: 75 + index * 0.1, caloriesIn: 2300 })),
    );
    const checkIn = contextualCheckIn(gaining, profile, { recent, sleepMinutes: 450 });
    expect(checkIn.delta).toBe(-150);
    expect(checkIn.reasons).toContain("fastCorrection");
  });

  it("explica qué falta mientras no hay datos suficientes", () => {
    const building = contextualCheckIn(analyzeMetabolism(days(5, () => ({}))), profile, {
      recent,
      sleepMinutes: null,
    });
    expect(building).toMatchObject({ ready: false, delta: null, status: "building" });
  });
});

describe("agua", () => {
  it("35 ml por kg más el entrenamiento, en vasos de 250 ml", () => {
    expect(waterTargetMl(56)).toBe(2000);
    expect(waterTargetMl(80, 60)).toBe(3500);
    expect(waterTargetMl(null)).toBe(2500);
    expect(formatWater(2250)).toBe("2.25 L");
    expect(formatWater(750)).toBe("750 ml");
    expect(addWaterMl(250, -500)).toBe(0);
    expect(addWaterMl(9900, 500)).toBe(10000);
  });
});
