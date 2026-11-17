import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { weeklyStory, weeklySummary } from "@/src/features/dashboard/weekly";

const record = (date: string, weightKg: number | null, caloriesIn = 0, proteinG = 0): DailyBiometrics => ({
  id: date,
  date,
  weightKg,
  caloriesIn,
  proteinG,
  carbsG: 0,
  fatsG: 0,
});

describe("resumen de la semana pasada", () => {
  it("compara el peso medio, cuenta comida, proteína, entrenos y sueño", () => {
    const summary = weeklySummary({
      // Semana actual desde el lunes 16; la pasada es del 9 al 15 de noviembre.
      thisMonday: "2026-11-16",
      records: [
        record("2026-11-03", 80),
        record("2026-11-05", 80.4),
        record("2026-11-09", 79.6, 2400, 150),
        record("2026-11-10", null, 2600, 120),
        record("2026-11-12", 79.4, 0, 0),
        { ...record("2026-11-13", null, 900, 30), partial: true },
        record("2026-11-16", 79, 2000, 140),
      ],
      workoutDates: ["2026-11-10", "2026-11-11", "2026-11-11", "2026-11-17"],
      sleep: [
        { id: "a", date: "2026-11-10", bedtime: "23:00", wakeTime: "07:00", quality: 4, source: "manual" },
        { id: "b", date: "2026-11-11", bedtime: "00:00", wakeTime: "06:00", quality: null, source: "manual" },
      ],
      targets: { calories: 2500, protein: 140 },
    });
    expect(summary).toMatchObject({
      weekStart: "2026-11-09",
      weekEnd: "2026-11-15",
      avgWeightKg: 79.5,
      weightChangeKg: -0.7,
      // El día incompleto no cuenta para la media de calorías.
      avgKcal: 2500,
      proteinDays: 1,
      workouts: 2,
      avgSleepMinutes: 420,
      loggedDays: 5,
    });
  });

  it("sin datos queda en blanco", () => {
    const summary = weeklySummary({
      thisMonday: "2026-11-16",
      records: [],
      workoutDates: [],
      sleep: [],
      targets: { calories: 2000, protein: 100 },
    });
    expect(summary).toMatchObject({ avgWeightKg: null, weightChangeKg: null, avgKcal: null, loggedDays: 0 });
  });
});

describe("la semana en tres frases", () => {
  const base = {
    weekStart: "2026-11-09",
    weekEnd: "2026-11-15",
    loggedDays: 7,
    avgWeightKg: 78.6,
    weightChangeKg: -0.6,
    avgKcal: 2310,
    kcalTarget: 2300,
    proteinDays: 6,
    workouts: 4,
    avgSleepMinutes: 455,
  };
  it("pone primero el peso, luego la comida y el entreno", () => {
    expect(weeklyStory(base, -1)).toEqual({
      title: "Semana sólida",
      lines: [
        "Bajaste 0.6 kg, en la dirección de tu meta.",
        "Comiste en tu objetivo: 2310 kcal al día.",
        "Entrenaste 4 veces.",
      ],
    });
  });
  it("no inventa lo que no se registró", () => {
    const story = weeklyStory(
      {
        ...base,
        loggedDays: 3,
        weightChangeKg: null,
        avgKcal: null,
        workouts: 0,
        proteinDays: 2,
        avgSleepMinutes: null,
      },
      -1,
    );
    expect(story).toEqual({ title: "Semana para retomar", lines: [] });
  });
});
