import { describe, expect, it } from "vitest";

import { buildSessionLogs, withLogField } from "./session";
import {
  formatExerciseLines,
  generateRoutine,
  parseExerciseLines,
  trainingGoalLabel,
} from "./training.plans";

describe("editor de rutina", () => {
  it("lee y escribe el mismo formato", () => {
    const exercises = [
      { name: "Sentadilla", sets: 4, reps: "6-8", rir: 2 },
      { name: "Press banca", sets: 3, reps: "8-10", rir: 1 },
    ];
    expect(parseExerciseLines(formatExerciseLines(exercises))).toEqual(exercises);
  });

  it("completa lo que falta y descarta líneas vacías", () => {
    expect(parseExerciseLines("Dominadas\n\n  | 3 | 8\nRemo | x | | y")).toEqual([
      { name: "Dominadas", sets: 3, reps: "8–12", rir: 2 },
      { name: "Remo", sets: 3, reps: "8–12", rir: 2 },
    ]);
  });

  it("nombra el objetivo del bloque", () => {
    expect(trainingGoalLabel("strength")).toBe("Fuerza");
    expect(trainingGoalLabel("general")).toBe("Acondicionamiento");
  });
});

describe("registro de sesión", () => {
  const routine = generateRoutine({
    variant: "full_body",
    gymProfile: "full_gym",
    trainingGoal: "hypertrophy",
    sessionMinutes: 50,
  });
  const first = routine.exercises[0];

  it("guarda cada campo sin perder los otros y parte del RIR objetivo", () => {
    let draft = withLogField({}, first, "load", "80");
    expect(draft[first.name]).toEqual({ load: "80", reps: "", rir: String(first.rir) });
    draft = withLogField(draft, first, "reps", "8");
    expect(draft[first.name]).toEqual({ load: "80", reps: "8", rir: String(first.rir) });
  });

  it("convierte el borrador en registros y deja en null lo que no se llenó", () => {
    const logs = buildSessionLogs(routine, withLogField({}, first, "load", "62.5"));
    expect(logs).toHaveLength(routine.exercises.length);
    expect(logs[0]).toEqual({ exerciseName: first.name, loadKg: 62.5, reps: null, rir: first.rir || null });
    expect(logs[1]).toMatchObject({ loadKg: null, reps: null, rir: null });
  });
});
