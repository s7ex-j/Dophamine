import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import type { DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { buildNutritionProfile } from "@/src/features/profile/profile";
import { contextualCheckIn } from "@/src/features/tdee/checkin";
import { energyBalance, explainAlgorithm } from "@/src/features/tdee/explain";
import { analyzeMetabolism } from "@/src/features/tdee/tdee";

const record = (index: number): DailyBiometrics => {
  const date = new Date(Date.UTC(2026, 10, 1 + index)).toISOString().slice(0, 10);
  return { id: date, date, weightKg: 70, caloriesIn: 2500, proteinG: 120, carbsG: 0, fatsG: 0 };
};

describe("cómo se calcula", () => {
  const profile = {
    ...buildNutritionProfile({
      age: 18,
      sex: "male",
      heightCm: 170,
      weightKg: 70,
      activity: "moderate",
      goal: "gain",
      pace: "moderate",
      trainingDays: 4,
      sessionMinutes: 60,
      trainingType: "strength",
    }),
    checkInDays: 7 as const,
  };
  const snapshot = (records: DailyBiometrics[]): DashboardSnapshot => {
    const analysis = analyzeMetabolism(records);
    const training = {
      sessions: 3,
      minutes: 180,
      kcal: 735,
      done: 3,
      planned: 4,
      kcalPerDay: 105,
      plannedKcalPerDay: 140,
    };
    return {
      weightKg: 70,
      trendKg: 70,
      caloriesIn: 2500,
      proteinG: 120,
      carbsG: 0,
      fatsG: 0,
      tdee: analysis.tdee,
      mood: null,
      profile,
      analysis,
      checkIn: contextualCheckIn(analysis, profile, {
        recent: records.slice(-7),
        sleepMinutes: 450,
        training,
      }),
      recentRecords: records.slice(-7),
      records: [...records].reverse(),
      lastReview: null,
      reviewDue: false,
      training,
      period: 7,
      sleepMinutes: 450,
      periods: [],
    };
  };

  it("muestra los siete pasos con tus números", () => {
    const records = Array.from({ length: 21 }, (_, index) => record(index));
    const steps = explainAlgorithm(snapshot(records), "2026-11-21");
    expect(steps.map((step) => step.id)).toEqual([
      "initial",
      "trend",
      "density",
      "observed",
      "engine",
      "training",
      "review",
    ]);
    expect(steps[0].value).toMatch(/kcal$/);
    expect(steps[0].detail).toContain("basal");
    expect(steps[3].value).toContain("2500");
    expect(steps[3].detail).toContain("motor de autoajuste");
    expect(steps[4].value).toMatch(/^Activo · certeza/);
    expect(steps[4].detail).toContain("Peso real estimado: 70.0 kg");
    expect(steps[4].detail).toContain("en 14 días");
    expect(steps[5].value).toBe("3/4 sesiones");
    expect(steps[6].detail).toContain("7 h 30 min");
    expect(steps.every((step) => !step.pending)).toBe(true);
  });

  it("la cuenta central usa lo comido y el peso de los mismos días", () => {
    const steady = energyBalance(snapshot(Array.from({ length: 21 }, (_, index) => record(index))));
    expect(steady).toMatchObject({ intake: 2500, energyPerKg: 7700, engine: true });
    expect(Math.abs(steady?.fromWeight ?? 99)).toBeLessThan(20);
    // Bajando 0.1 kg al día, el cuerpo pone unas 770 kcal.
    const losing = Array.from({ length: 20 }, (_, index) => ({
      ...record(index),
      weightKg: index % 5 === 4 ? null : 70 - index * 0.1,
    }));
    const simple = energyBalance(snapshot(losing));
    expect(simple?.engine).toBe(false);
    expect(simple?.fromWeight).toBeCloseTo(-770, -1);
    expect(
      Math.abs((simple?.tdee ?? 0) - ((simple?.intake ?? 0) - (simple?.fromWeight ?? 0))),
    ).toBeLessThanOrEqual(10);
    expect(energyBalance(snapshot([record(0), record(1)]))).toBeNull();
  });

  it("con el motor, comida vieja no entra en la cuenta de los últimos 14 días", () => {
    const records = Array.from({ length: 30 }, (_, index) => ({
      ...record(index),
      caloriesIn: index < 16 ? 3200 : 2500,
    }));
    expect(energyBalance(snapshot(records))?.intake).toBe(2500);
  });

  it("marca como pendientes los pasos sin datos suficientes", () => {
    const steps = explainAlgorithm(snapshot([record(0), record(1)]), "2026-11-02");
    expect(steps.find((step) => step.id === "observed")?.pending).toBe(true);
    expect(steps.find((step) => step.id === "observed")?.detail).toContain("último pesaje: 1.");
    const engine = steps.find((step) => step.id === "engine");
    expect(engine?.pending).toBe(true);
    expect(engine?.value).toBe("2/15 días seguidos");
  });
});
