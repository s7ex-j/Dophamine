import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import type { DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { buildNutritionProfile } from "@/src/features/profile/profile";
import { contextualCheckIn } from "@/src/features/tdee/checkin";
import { explainAlgorithm } from "@/src/features/tdee/explain";
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
    };
  };

  it("muestra los seis pasos con tus números", () => {
    const records = Array.from({ length: 21 }, (_, index) => record(index));
    const steps = explainAlgorithm(snapshot(records), "2026-11-21");
    expect(steps.map((step) => step.id)).toEqual([
      "initial",
      "trend",
      "density",
      "observed",
      "training",
      "review",
    ]);
    expect(steps[0].value).toMatch(/kcal$/);
    expect(steps[0].detail).toContain("Basal");
    expect(steps[3].value).toContain("2500");
    expect(steps[4].value).toBe("3/4 sesiones");
    expect(steps[5].detail).toContain("7 h 30 min");
    expect(steps.every((step) => !step.pending)).toBe(true);
  });

  it("marca como pendientes los pasos sin datos suficientes", () => {
    const steps = explainAlgorithm(snapshot([record(0), record(1)]), "2026-11-02");
    expect(steps.find((step) => step.id === "observed")?.pending).toBe(true);
    expect(steps.find((step) => step.id === "observed")?.detail).toContain("Llevas 2 días");
  });
});
