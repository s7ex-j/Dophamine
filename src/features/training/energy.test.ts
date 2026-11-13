import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { exercisesInGroup } from "@/src/features/exercises/catalog";
import { buildNutritionProfile } from "@/src/features/profile/profile";
import { contextualCheckIn } from "@/src/features/tdee/checkin";
import { analyzeMetabolism } from "@/src/features/tdee/tdee";
import { sessionDurationMinutes, sessionEnergyKcal, trainingLoad } from "@/src/features/training/energy";
import type { CompletedSession } from "@/src/features/training/workout";

const session = (start: string, end: string, sets: CompletedSession["sets"]): CompletedSession => ({
  id: start,
  name: "x",
  startedAt: start,
  completedAt: end,
  sets,
});
const strengthSet = (index: number) => ({
  exerciseName: "Press de banca",
  setNumber: index,
  type: "working" as const,
  loadKg: 60,
  reps: 10,
  rir: 2,
});

describe("energía del entreno", () => {
  it("usa la hora de inicio y fin; sin horario creíble, ~2.5 min por serie", () => {
    const timed = session("2026-11-13T18:00:00.000Z", "2026-11-13T19:00:00.000Z", [strengthSet(1)]);
    expect(sessionDurationMinutes(timed)).toBe(60);
    const instant = session(
      "2026-11-13T18:00:00.000Z",
      "2026-11-13T18:00:30.000Z",
      [1, 2, 3, 4].map(strengthSet),
    );
    expect(sessionDurationMinutes(instant)).toBe(10);
  });

  it("una hora de fuerza a 70 kg ≈ 245 kcal netas; el cardio suma con su MET", () => {
    const strength = session("2026-11-13T18:00:00.000Z", "2026-11-13T19:00:00.000Z", [strengthSet(1)]);
    expect(sessionEnergyKcal(strength, 70)).toBe(245);
    const run = exercisesInGroup("cardio").find((item) => item.met && item.met > 5);
    const mixed = session("2026-11-13T18:00:00.000Z", "2026-11-13T19:00:00.000Z", [
      strengthSet(1),
      { exerciseName: run!.name, setNumber: 1, type: "working", loadKg: null, reps: 20, rir: null },
    ]);
    expect(sessionEnergyKcal(mixed, 70)).toBeGreaterThan(245);
    const load = trainingLoad([strength, mixed], "2026-11-13", "2026-11-13", 70, () => "2026-11-13");
    expect(load).toMatchObject({ sessions: 2, minutes: 120 });
  });
});

describe("la revisión del plan tiene en cuenta el entreno", () => {
  const record = (index: number): DailyBiometrics => {
    const date = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
    return { id: date, date, weightKg: 70, caloriesIn: 2600, proteinG: 0, carbsG: 0, fatsG: 0 };
  };
  const records = Array.from({ length: 21 }, (_, index) => record(index));
  // Volumen con el peso estable comiendo 2600: toca subir.
  const profile = {
    ...buildNutritionProfile({
      age: 25,
      sex: "male",
      heightCm: 175,
      weightKg: 70,
      activity: "moderate",
      goal: "gain",
      pace: "moderate",
    }),
    checkInDays: 7 as const,
    calorieTarget: 2600,
  };
  const analysis = analyzeMetabolism(records);
  const recent = records.slice(-7);

  it("si entrenaste lo planeado, sube como siempre", () => {
    const checkIn = contextualCheckIn(analysis, profile, {
      recent,
      sleepMinutes: 450,
      training: { done: 4, planned: 4, kcalPerDay: 140, plannedKcalPerDay: 140 },
    });
    expect(checkIn.delta).toBeGreaterThan(0);
    expect(checkIn.reasons).not.toContain("training");
  });

  it("en volumen, sin la mitad de los entrenos no sube calorías", () => {
    const checkIn = contextualCheckIn(analysis, profile, {
      recent,
      sleepMinutes: 450,
      training: { done: 1, planned: 4, kcalPerDay: 35, plannedKcalPerDay: 140 },
    });
    expect(checkIn.delta).toBe(0);
    expect(checkIn.reasons).toContain("training");
    expect(checkIn.message).toContain("1 de 4 sesiones");
  });

  it("mientras se construye el gasto, dice cuánto difiere el entreno real del previsto", () => {
    const building = contextualCheckIn(analyzeMetabolism(records.slice(0, 5)), profile, {
      recent,
      sleepMinutes: null,
      training: { done: 1, planned: 4, kcalPerDay: 35, plannedKcalPerDay: 140 },
    });
    expect(building.message).toContain("105 kcal por día menos de lo previsto");
  });
});
