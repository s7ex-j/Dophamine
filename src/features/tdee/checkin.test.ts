import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { buildNutritionProfile } from "@/src/features/profile/profile";
import { addWaterMl, formatWater, waterTargetMl } from "@/src/features/water/water";
import { analyzeMetabolism } from "./tdee";
import { adherenceGap, averageIntake, contextualCheckIn, inDeadZone, taperFactor } from "./checkin";

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

  it("con el motor de autoajuste, una diferencia menor que su incertidumbre no se persigue", () => {
    const engine = analysis.adaptive;
    if (!engine?.active) throw new Error("Con 21 días completos el motor debe estar activo.");
    const unsure = { ...analysis, adaptive: { ...engine, tdeeSd: 500 } };
    const checkIn = contextualCheckIn(unsure, profile, { recent, sleepMinutes: 450 });
    expect(checkIn.delta).toBe(0);
    expect(checkIn.reasons).toEqual(["withinMargin"]);
    expect(checkIn.message).toContain("incertidumbre de tu gasto (± 980 kcal)");
  });

  it("zona muerta: solo se mueve si el intervalo del 95 % no incluye el cero", () => {
    const engine = analysis.adaptive;
    if (!engine?.active) throw new Error("Con 21 días completos el motor debe estar activo.");
    // Toca bajar ~412 kcal: con ±1.96 × 200 = ±392 el intervalo ya no cruza el cero.
    const sure = contextualCheckIn({ ...analysis, adaptive: { ...engine, tdeeSd: 200 } }, profile, {
      recent,
      sleepMinutes: 450,
    });
    expect(sure.reasons).not.toContain("withinMargin");
    expect(sure.delta).toBe(-100);
    const unsure = contextualCheckIn({ ...analysis, adaptive: { ...engine, tdeeSd: 220 } }, profile, {
      recent,
      sleepMinutes: 450,
    });
    expect(unsure.reasons).toEqual(["withinMargin"]);
  });

  it("costo asimétrico: en volumen, recortar exige más certeza que sumar", () => {
    // Con σ = 170: el 95 % es ±333 y el 99 % es ±439.
    expect(inDeadZone(-400, 170, "lose")).toBe(false);
    expect(inDeadZone(-400, 170, "gain")).toBe(true);
    expect(inDeadZone(400, 170, "gain")).toBe(false);
    expect(inDeadZone(300, 170, "gain")).toBe(true);
  });

  it("si el gasto bajó más de lo que explica el peso, lo avisa antes de recortar otra vez", () => {
    const engine = analysis.adaptive;
    if (!engine?.active) throw new Error("Con 21 días completos el motor debe estar activo.");
    const adapted = {
      ...analysis,
      adaptive: { ...engine, adaptation: { kcal: -180, sd: 60, weeks: 6, flagged: "down" as const } },
    };
    const checkIn = contextualCheckIn(adapted, profile, { recent, sleepMinutes: 450 });
    expect(checkIn.reasons).toEqual(["adaptation"]);
    expect(checkIn.message).toContain("180 kcal más de lo que explica tu cambio de peso en 6 semanas");
    expect(checkIn.message).toContain("mantenimiento");
    // En volumen no aplica: el aviso es para un déficit largo.
    const gaining = contextualCheckIn(
      adapted,
      { ...profile, goal: "gain", goalWeightKg: 80 },
      {
        recent,
        sleepMinutes: 450,
      },
    );
    expect(gaining.reasons).not.toContain("adaptation");
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

  it("un día de ayuno marcado cuenta como ingesta real, aunque sea 0", () => {
    const week = recent.map((record, index) =>
      index === 0 ? { ...record, caloriesIn: 0, fasting: true } : record,
    );
    // 6 días a 2300 y un ayuno: la media baja a 1971.
    expect(Math.round(averageIntake(week) as number)).toBe(1971);
    // Sin marcarlo, un día en 0 no cuenta: pudo ser un olvido.
    const forgot = recent.map((record, index) => (index === 0 ? { ...record, caloriesIn: 0 } : record));
    expect(averageIntake(forgot)).toBe(2300);
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
