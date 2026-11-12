import { describe, expect, it } from "vitest";

import { hintDetail, progressionHintFor } from "./progression";
import { buildSessionLogs, withLogField } from "./session";
import {
  formatClock,
  formatExerciseLines,
  generateRoutine,
  parseExerciseLines,
  restSeconds,
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

describe("unidades en la sesión", () => {
  const routine = generateRoutine({
    variant: "full_body",
    gymProfile: "full_gym",
    trainingGoal: "hypertrophy",
    sessionMinutes: 50,
  });
  const first = routine.exercises[0];

  it("guarda en kilogramos una carga escrita en libras", () => {
    const logs = buildSessionLogs(routine, withLogField({}, first, "load", "225"), "lb");
    expect(logs[0].loadKg).toBeCloseTo(102.06, 2);
  });

  it("no guarda cargas vacías, negativas o que no son números", () => {
    for (const texto of ["", "-20", "abc"])
      expect(buildSessionLogs(routine, withLogField({}, first, "load", texto))[0].loadKg).toBeNull();
  });
});

describe("temporizador de descanso", () => {
  it("sugiere más descanso para fuerza que para hipertrofia o acondicionamiento", () => {
    expect(restSeconds("strength")).toBe(180);
    expect(restSeconds("hypertrophy")).toBe(90);
    expect(restSeconds("general")).toBe(60);
  });

  it("agrega medio minuto a las series cerca del fallo", () => {
    expect(restSeconds("hypertrophy", 1)).toBe(120);
    expect(restSeconds("hypertrophy", 0)).toBe(120);
    expect(restSeconds("strength", 1)).toBe(210);
    expect(restSeconds("hypertrophy", 3)).toBe(90);
  });

  it("muestra los segundos como reloj y nunca baja de cero", () => {
    expect(formatClock(150)).toBe("2:30");
    expect(formatClock(59.2)).toBe("1:00");
    expect(formatClock(5)).toBe("0:05");
    expect(formatClock(-3)).toBe("0:00");
  });
});

describe("progresión sugerida", () => {
  const exercise = { name: "Sentadilla", sets: 3, reps: "8–12", rir: 2 };

  it("no sugiere nada sin una serie anterior con carga y repeticiones", () => {
    expect(progressionHintFor(exercise, null)).toBeNull();
    expect(progressionHintFor(exercise, { loadKg: null, reps: 10, rir: 2 })).toBeNull();
    expect(progressionHintFor(exercise, { loadKg: 80, reps: null, rir: 2 })).toBeNull();
  });

  it("propone subir la carga al llegar al tope de repeticiones con el RIR objetivo", () => {
    expect(progressionHintFor(exercise, { loadKg: 80, reps: 12, rir: 2 })?.action).toContain(
      "subir la carga",
    );
    expect(progressionHintFor(exercise, { loadKg: 80, reps: 12, rir: null })?.action).toContain("subir");
    expect(progressionHintFor(exercise, { loadKg: 80, reps: 12, rir: 0 })?.action).toContain("Repite");
    expect(progressionHintFor(exercise, { loadKg: 80, reps: 9, rir: 2 })?.action).toContain("Repite");
  });

  it("describe la última serie en la unidad elegida", () => {
    const hint = progressionHintFor(exercise, { loadKg: 80, reps: 9, rir: 2 });
    expect(hint && hintDetail(hint)).toBe("80 kg × 9 · RIR 2");
    expect(hint && hintDetail(hint, "lb")).toBe("176.4 lb × 9 · RIR 2");
    const sinRir = progressionHintFor(exercise, { loadKg: 80, reps: 9, rir: null });
    expect(sinRir && hintDetail(sinRir)).toBe("80 kg × 9");
  });
});
