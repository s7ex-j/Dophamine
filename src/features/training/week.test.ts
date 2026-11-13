import { describe, expect, it } from "vitest";

import {
  CATALOG,
  exerciseById,
  exercisesInGroup,
  findExercise,
  groupOfMuscle,
  MUSCLE_GROUPS,
} from "@/src/features/exercises/catalog";
import {
  addExerciseToDay,
  copyWorkoutDay,
  generateRoutine,
  moveExercise,
  normalizeRoutine,
  toggleRoutineDay,
  workoutFor,
} from "@/src/features/training/training.plans";
import {
  exerciseBests,
  muscleLoads,
  weekProgress,
  weekStart,
  weeklyVolume,
} from "@/src/features/training/week";
import { addExerciseToSession, startSession, type CompletedSession } from "@/src/features/training/workout";

const session = (
  completedAt: string,
  sets: Array<[string, number, number]>,
  name = "Torso A",
): CompletedSession => ({
  id: completedAt,
  name,
  startedAt: completedAt,
  completedAt,
  sets: sets.map(([exerciseName, loadKg, reps], index) => ({
    exerciseName,
    setNumber: index + 1,
    type: "working",
    loadKg,
    reps,
    rir: 2,
  })),
});

describe("catálogo con RepDB", () => {
  it("suma cientos de ejercicios sin repetir ids ni nombres", () => {
    expect(CATALOG.length).toBeGreaterThan(500);
    expect(new Set(CATALOG.map((item) => item.id)).size).toBe(CATALOG.length);
    expect(new Set(CATALOG.map((item) => item.name.toLowerCase())).size).toBe(CATALOG.length);
  });

  it("los ejercicios propios conservan su id y ganan imagen e instrucciones", () => {
    const bench = findExercise("Press de banca");
    expect(bench?.id).toBe("press-de-banca");
    expect(bench?.media).toBe("bench-press");
    expect(bench?.steps?.length).toBeGreaterThan(2);
    // El nombre de RepDB también lo encuentra.
    expect(findExercise("Press de banca con barra")?.id).toBe("press-de-banca");
    expect(exerciseById("press-de-banca")?.name).toBe("Press de banca");
  });

  it("se explora por grupo muscular, músculo y equipo", () => {
    expect(MUSCLE_GROUPS.map((group) => group.label)).toContain("Espalda");
    expect(groupOfMuscle("lats")).toBe("back");
    const back = exercisesInGroup("back");
    expect(back.length).toBeGreaterThan(40);
    expect(back.every((item) => groupOfMuscle(item.primary[0]) === "back")).toBe(true);
    const cableBiceps = exercisesInGroup("arms", { muscle: "biceps", equipment: "cable" });
    expect(cableBiceps.length).toBeGreaterThan(0);
    expect(cableBiceps.every((item) => item.equipment === "cable" && item.primary.includes("biceps"))).toBe(
      true,
    );
  });
});

describe("rutina con un entreno por día", () => {
  it("torso / pierna alterna entrenos distintos con ejercicios del catálogo", () => {
    const routine = generateRoutine({
      variant: "upper_lower",
      gymProfile: "full_gym",
      trainingGoal: "hypertrophy",
      sessionMinutes: 50,
    });
    expect(routine.schedule.map((day) => day.name)).toEqual(["Torso A", "Pierna A", "Torso B", "Pierna B"]);
    expect(routine.days).toEqual(["mon", "tue", "thu", "fri"]);
    expect(workoutFor(routine, "tue")?.exercises[0].name).toBe("Sentadilla con barra");
    expect(workoutFor(routine, "wed")).toBeNull();
    for (const day of routine.schedule)
      for (const exercise of day.exercises) expect(findExercise(exercise.name), exercise.name).not.toBeNull();
    // La lista general no repite ejercicios.
    expect(new Set(routine.exercises.map((item) => item.name)).size).toBe(routine.exercises.length);
  });

  it("las rutinas guardadas antes de la 0.14.0 repiten su lista en cada día", () => {
    const routine = normalizeRoutine({
      name: "Mi rutina",
      days: ["mon", "thu"],
      exercises: [{ name: "Press de banca", sets: 3, reps: "8–12", rir: 2 }],
    });
    expect(routine.schedule).toHaveLength(2);
    expect(routine.schedule[1]).toMatchObject({ day: "thu", name: "Mi rutina" });
    expect(routine.schedule[1].exercises[0].name).toBe("Press de banca");
  });

  it("se editan días y ejercicios", () => {
    let routine = generateRoutine({
      variant: "full_body",
      gymProfile: "full_gym",
      trainingGoal: "hypertrophy",
      sessionMinutes: 35,
    });
    routine = toggleRoutineDay(routine, "sat");
    expect(routine.days).toEqual(["mon", "wed", "fri", "sat"]);
    expect(workoutFor(routine, "sat")?.exercises).toEqual([]);
    routine = addExerciseToDay(routine, "sat", "Dominadas");
    routine = addExerciseToDay(routine, "sat", "Dominadas");
    routine = addExerciseToDay(routine, "sat", "Curl martillo");
    expect(workoutFor(routine, "sat")?.exercises.map((item) => item.name)).toEqual([
      "Dominadas",
      "Curl martillo",
    ]);
    routine = moveExercise(routine, "sat", 1, -1);
    expect(workoutFor(routine, "sat")?.exercises[0].name).toBe("Curl martillo");
    routine = copyWorkoutDay(routine, "mon", "sat");
    expect(workoutFor(routine, "sat")?.name).toBe("Full body A");
    routine = toggleRoutineDay(routine, "mon");
    expect(routine.days).toEqual(["wed", "fri", "sat"]);
    expect(routine.variant).toBe("custom");
  });

  it("la sesión sale del entreno del día y se le pueden sumar ejercicios", () => {
    const routine = generateRoutine({
      variant: "push_pull_legs",
      gymProfile: "full_gym",
      trainingGoal: "hypertrophy",
      sessionMinutes: 50,
    });
    const pull = workoutFor(routine, "wed");
    const active = startSession(routine, [], "kg", new Date(2026, 10, 11, 18), "s1", pull);
    expect(active.routineName).toBe("Tirón");
    expect(active.exercises[0].name).toBe("Dominadas");
    expect(active.exercises[0]).not.toHaveProperty("restSeconds");
    const more = addExerciseToSession(active, "Encogimientos de hombros", [], "kg");
    expect(more.exercises.at(-1)?.sets).toHaveLength(3);
  });
});

describe("la semana de entreno", () => {
  const routine = generateRoutine({
    variant: "upper_lower",
    gymProfile: "full_gym",
    trainingGoal: "hypertrophy",
    sessionMinutes: 50,
  });
  // Jueves 12 de noviembre de 2026.
  const today = new Date(2026, 10, 12, 10);

  it("la semana empieza el lunes", () => {
    expect(weekStart(today)).toBe("2026-11-09");
    expect(weekStart(new Date(2026, 10, 15))).toBe("2026-11-09");
    expect(weekStart(new Date(2026, 10, 16))).toBe("2026-11-16");
  });

  it("marca qué toca, qué se hizo y cuál es hoy", () => {
    const week = weekProgress(routine, [session("2026-11-09T18:00:00", [["Press de banca", 60, 8]])], today);
    expect(week.map((day) => day.workout)).toEqual([
      "Torso A",
      "Pierna A",
      null,
      "Torso B",
      "Pierna B",
      null,
      null,
    ]);
    expect(week[0]).toMatchObject({ date: "2026-11-09", done: 1, isPast: true });
    expect(week[1]).toMatchObject({ done: 0, isPast: true });
    expect(week[3]).toMatchObject({ isToday: true, isPast: false });
  });

  it("suma series y kilos por semana", () => {
    const weeks = weeklyVolume(
      [
        session("2026-11-10T18:00:00", [
          ["Press de banca", 60, 10],
          ["Press de banca", 60, 8],
        ]),
        session("2026-11-03T18:00:00", [["Press de banca", 55, 10]]),
      ],
      today,
      3,
    );
    expect(weeks.map((week) => week.weekStart)).toEqual(["2026-10-26", "2026-11-02", "2026-11-09"]);
    expect(weeks.map((week) => week.sets)).toEqual([0, 1, 2]);
    expect(weeks[2]).toMatchObject({ sessions: 1, volumeKg: 1080 });
  });

  it("muestra la mejor serie de la última vez y cuánto cambió", () => {
    const bests = exerciseBests([
      session("2026-11-03T18:00:00", [["Press de banca", 60, 8]]),
      session("2026-11-10T18:00:00", [
        ["Press de banca", 62.5, 8],
        ["Press de banca", 60, 6],
        ["Remo con barra", 50, 10],
      ]),
    ]);
    expect(bests[0]).toMatchObject({ name: "Press de banca", sessions: 2, lastDate: "2026-11-10" });
    expect(bests[0].lastBest).toEqual({ loadKg: 62.5, reps: 8 });
    expect(bests[0].changeKg).toBeGreaterThan(0);
    expect(bests[1]).toMatchObject({ name: "Remo con barra", changeKg: null });
  });

  it("colorea cada músculo según sus series de la semana", () => {
    const sets: Array<[string, number, number]> = Array.from({ length: 10 }, () => ["Press de banca", 60, 8]);
    const loads = muscleLoads([session("2026-11-10T18:00:00", sets)]);
    expect(loads.find((item) => item.muscle === "chest")).toMatchObject({ sets: 10, level: 3 });
    expect(loads.find((item) => item.muscle === "triceps")?.level).toBe(2);
    expect(loads.find((item) => item.muscle === "quads")).toMatchObject({ sets: 0, level: 0 });
    expect(loads).toHaveLength(17);
  });
});
