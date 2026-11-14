import { describe, expect, it } from "vitest";

import type { Store } from "@/src/db/web-storage";
import { countInRange, deleteExercise, deleteRange, exerciseCounts } from "@/src/features/cleanup/cleanup";

const set = (exerciseName: string) => ({
  exerciseName,
  setNumber: 1,
  type: "working" as const,
  loadKg: 50,
  reps: 10,
  rir: 2,
});
const store: Store = {
  biometrics: [
    { id: "1", date: "2026-11-01", weightKg: 70, caloriesIn: 2500, proteinG: 140, carbsG: 300, fatsG: 70 },
    { id: "2", date: "2026-11-05", weightKg: 69.8, caloriesIn: 0, proteinG: 0 },
    { id: "3", date: "2026-11-10", weightKg: 69.5, caloriesIn: 2400, proteinG: 130 },
  ],
  wellbeing: [{ id: "w", date: "2026-11-05", mood: 4, note: "" }],
  workouts: [
    {
      id: "a",
      name: "Torso",
      completedAt: "2026-11-05T18:00:00",
      sets: [set("Press de banca"), set("Remo con barra")],
    },
    { id: "b", name: "Brazos", completedAt: "2026-11-10T18:00:00", sets: [set("Curl martillo")] },
  ],
  meals: [
    {
      id: "m1",
      date: "2026-11-01",
      slot: "lunch",
      name: "Arroz",
      kcal: 260,
      proteinG: 5,
      carbsG: 56,
      fatsG: 1,
    },
    {
      id: "m2",
      date: "2026-11-10",
      slot: "lunch",
      name: "Pollo",
      kcal: 330,
      proteinG: 62,
      carbsG: 0,
      fatsG: 7,
    },
  ],
  sleep: [
    { id: "s", date: "2026-11-05", bedtime: "23:00", wakeTime: "07:00", quality: null, source: "manual" },
  ],
};

describe("borrar por rango", () => {
  it("cuenta lo que hay antes de borrar", () => {
    expect(countInRange(store, "2026-11-01", "2026-11-05")).toEqual({
      body: 2,
      food: 1,
      sleep: 1,
      workouts: 1,
      wellbeing: 1,
    });
  });

  it("borrar comidas deja el peso; un día vacío desaparece", () => {
    const next = deleteRange(store, "2026-11-01", "2026-11-05", ["food"]);
    expect(next.meals?.map((entry) => entry.id)).toEqual(["m2"]);
    expect(next.biometrics.find((record) => record.date === "2026-11-01")).toMatchObject({
      weightKg: 70,
      caloriesIn: 0,
    });
    expect(next.sleep).toHaveLength(1);
    const noBody = deleteRange(store, "2026-11-05", "2026-11-05", ["body"]);
    expect(noBody.biometrics.map((record) => record.date)).toEqual(["2026-11-01", "2026-11-10"]);
  });

  it("borra sueño, entrenos y bienestar del rango sin tocar el resto", () => {
    const next = deleteRange(store, "2026-11-01", "2026-11-07", ["sleep", "workouts", "wellbeing"]);
    expect(next.sleep).toEqual([]);
    expect(next.workouts.map((workout) => workout.id)).toEqual(["b"]);
    expect(next.wellbeing).toEqual([]);
    expect(next.biometrics).toEqual(store.biometrics);
  });
});

describe("borrar un ejercicio", () => {
  it("quita sus series y las sesiones que quedan vacías", () => {
    expect(exerciseCounts(store)).toEqual([
      { name: "Curl martillo", sets: 1 },
      { name: "Press de banca", sets: 1 },
      { name: "Remo con barra", sets: 1 },
    ]);
    const next = deleteExercise(store, "Curl martillo");
    expect(next.workouts.map((workout) => workout.id)).toEqual(["a"]);
    expect(deleteExercise(store, "Press de banca").workouts[0].sets).toHaveLength(1);
  });
});
