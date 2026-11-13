import { describe, expect, it } from "vitest";

import { exercisesInGroup, findExercise } from "@/src/features/exercises/catalog";
import {
  addExerciseToDay,
  defaultPlan,
  focusName,
  generateRoutine,
  setDayFocus,
  toggleRoutineDay,
  workoutFor,
} from "@/src/features/training/training.plans";
import { recommendTemplates, TEMPLATES } from "@/src/features/training/training.templates";
import { sessionClock, setsPerMuscle, withStartTime } from "@/src/features/training/workout";

const build = (
  variant: Parameters<typeof generateRoutine>[0]["variant"],
  gymProfile: "full_gym" | "home" = "full_gym",
) => generateRoutine({ variant, gymProfile, trainingGoal: "hypertrophy", sessionMinutes: 70 });

describe("plantillas de semana", () => {
  it("PPL de 6 días: lunes y jueves empuje, martes y viernes tirón, miércoles y sábado pierna", () => {
    const routine = build("ppl6");
    expect(routine.schedule.map((day) => `${day.day}:${day.name}`)).toEqual([
      "mon:Empuje A",
      "tue:Tirón A",
      "wed:Pierna A",
      "thu:Empuje B",
      "fri:Tirón B",
      "sat:Pierna B",
    ]);
    expect(workoutFor(routine, "mon")?.focus).toEqual(["chest", "shoulders", "triceps"]);
    expect(workoutFor(routine, "tue")?.focus).toEqual(["back", "biceps", "forearms"]);
  });

  it("híbrida: PPL de lunes a miércoles, jueves descanso, torso el viernes y pierna el sábado", () => {
    const routine = build("hybrid");
    expect(routine.days).toEqual(["mon", "tue", "wed", "fri", "sat"]);
    expect(workoutFor(routine, "thu")).toBeNull();
    expect(workoutFor(routine, "fri")?.name).toBe("Torso");
    expect(workoutFor(routine, "sat")?.name).toBe("Pierna (inferior)");
  });

  it("todas usan ejercicios del catálogo, en gimnasio y en casa", () => {
    for (const template of TEMPLATES)
      for (const profile of ["full_gym", "home"] as const)
        for (const day of build(template.id, profile).schedule)
          for (const exercise of day.exercises)
            expect(findExercise(exercise.name), exercise.name).not.toBeNull();
  });

  it("recomienda según la experiencia y los días disponibles", () => {
    expect(recommendTemplates("beginner", 3)[0]).toMatchObject({ id: "full_body", recommended: true });
    const advanced = recommendTemplates("advanced", 6)
      .filter((item) => item.recommended)
      .map((item) => item.id);
    expect(advanced).toEqual(expect.arrayContaining(["ppl6", "hybrid", "upper_lower"]));
    // Con 4 días no se recomienda una de 6.
    expect(recommendTemplates("advanced", 4).find((item) => item.id === "ppl6")?.recommended).toBe(false);
  });
});

describe("armar la semana a mano", () => {
  it("cada día con su enfoque (cardio incluido) y nombre automático", () => {
    let routine = toggleRoutineDay(build("full_body"), "sat");
    routine = setDayFocus(routine, "sat", ["chest", "triceps", "shoulders", "cardio"]);
    expect(workoutFor(routine, "sat")?.name).toBe("Pecho + Tríceps + Hombros + Cardio");
    routine = setDayFocus(routine, "sat", ["chest", "triceps"]);
    expect(workoutFor(routine, "sat")?.name).toBe(focusName(["chest", "triceps"]));
    // Un nombre escrito a mano no se pisa.
    routine = setDayFocus(routine, "mon", ["back"]);
    expect(workoutFor(routine, "mon")?.name).toBe("Full body A");
  });

  it("un ejercicio nuevo trae 3 × 12; el cardio, 20 minutos", () => {
    expect(defaultPlan("Press de banca")).toEqual({ name: "Press de banca", sets: 3, reps: "12", rir: 2 });
    const cardio = exercisesInGroup("cardio")[0];
    expect(cardio.cardio).toBe(true);
    expect(defaultPlan(cardio.name)).toMatchObject({ sets: 1, reps: "20" });
    const routine = addExerciseToDay(build("full_body"), "mon", "Curl martillo");
    expect(workoutFor(routine, "mon")?.exercises.at(-1)).toMatchObject({ sets: 3, reps: "12" });
  });

  it("bíceps, tríceps y antebrazo son grupos separados", () => {
    expect(exercisesInGroup("biceps").every((item) => item.primary[0] === "biceps")).toBe(true);
    expect(exercisesInGroup("triceps").length).toBeGreaterThan(10);
    expect(exercisesInGroup("forearms").length).toBeGreaterThan(3);
    expect(exercisesInGroup("legs").some((item) => item.cardio)).toBe(false);
  });
});

describe("hora de inicio y fin", () => {
  const active = {
    id: "s",
    routineName: "Torso",
    startedAt: new Date(2026, 10, 13, 18, 30).toISOString(),
    exercises: [],
  };

  it("se corrige la hora de inicio si empezaste antes de abrir la sesión", () => {
    const now = new Date(2026, 10, 13, 19, 0);
    const fixed = withStartTime(active, "18:05", now);
    expect(sessionClock({ startedAt: fixed.startedAt, completedAt: now.toISOString() })).toEqual({
      start: "18:05",
      end: "19:00",
    });
    // Una hora que todavía no llega o mal escrita no cambia nada.
    expect(withStartTime(active, "21:00", now)).toBe(active);
    expect(withStartTime(active, "hola", now)).toBe(active);
  });

  it("el cardio no suma series a los músculos", () => {
    const run = exercisesInGroup("cardio")[0].name;
    const sets = setsPerMuscle([
      {
        id: "1",
        name: "x",
        startedAt: active.startedAt,
        completedAt: active.startedAt,
        sets: [{ exerciseName: run, setNumber: 1, type: "working", loadKg: null, reps: 20, rir: null }],
      },
    ]);
    expect(sets).toEqual([]);
  });
});
