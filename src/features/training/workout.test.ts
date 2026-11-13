import { describe, expect, it } from "vitest";

import { alternatives, CATALOG, findExercise, searchExercises } from "@/src/features/exercises/catalog";
import { DEFAULT_ROUTINES, generateRoutine } from "./training.plans";
import {
  addSet,
  exerciseProgress,
  finishSession,
  lastSetsFor,
  parseRepRange,
  personalRecords,
  readActiveSession,
  sessionStats,
  setsPerMuscle,
  setsVolume,
  startSession,
  suggestNext,
  swapExercise,
  type CompletedSession,
  type LoggedSet,
} from "./workout";

const set = (patch: Partial<LoggedSet>): LoggedSet => ({
  exerciseName: "Sentadilla con barra",
  setNumber: 1,
  type: "working",
  loadKg: 80,
  reps: 8,
  rir: 2,
  ...patch,
});
const session = (id: string, completedAt: string, sets: LoggedSet[]): CompletedSession => ({
  id,
  name: "Full body",
  startedAt: completedAt.replace("T18", "T17"),
  completedAt,
  sets,
});
const target = { sets: 3, repsMin: 8, repsMax: 12, rir: 2 };

describe("catálogo de ejercicios", () => {
  it("tiene ids únicos y reconoce los ejercicios de todas las rutinas generadas", () => {
    expect(new Set(CATALOG.map((item) => item.id)).size).toBe(CATALOG.length);
    expect(CATALOG.length).toBeGreaterThan(80);
    const variants = ["full_body", "upper_lower", "push_pull_legs", "posterior"] as const;
    const gyms = ["full_gym", "home", "limited"] as const;
    const missing = variants.flatMap((variant) =>
      gyms.flatMap((gymProfile) =>
        generateRoutine({ variant, gymProfile, trainingGoal: "hypertrophy", sessionMinutes: 70 })
          .exercises.map((exercise) => exercise.name)
          .filter((name) => !findExercise(name)),
      ),
    );
    expect([...new Set(missing)]).toEqual([]);
  });

  it("busca por nombre, alias y músculo sin tildes", () => {
    expect(findExercise("press DE PECHO")?.id).toBe("press-de-banca");
    expect(searchExercises("biceps").length).toBeGreaterThan(3);
    expect(
      searchExercises("isquio").every(
        (item) => item.primary.includes("hamstrings") || /isquio/i.test(item.name),
      ),
    ).toBe(true);
  });

  it("sugiere reemplazos con el mismo movimiento y músculo, filtrando por equipo", () => {
    const bench = findExercise("Press de banca")!;
    const options = alternatives(bench);
    expect(options.length).toBeGreaterThan(2);
    expect(options.every((item) => item.pattern === "horizontalPush")).toBe(true);
    expect(alternatives(bench, ["dumbbell"]).every((item) => item.equipment === "dumbbell")).toBe(true);
  });
});

describe("sugerencia de carga (doble progresión)", () => {
  it("sin historial propone el mínimo de repeticiones y sin carga", () => {
    expect(suggestNext([], target)).toEqual({ loadKg: null, reps: 8 });
    expect(parseRepRange("8–12")).toEqual({ repsMin: 8, repsMax: 12 });
    expect(parseRepRange("5")).toEqual({ repsMin: 5, repsMax: 5 });
  });

  it("sube la carga cuando todas las series llegaron al tope con el RIR pedido", () => {
    const top = [set({ reps: 12 }), set({ reps: 12, setNumber: 2 }), set({ reps: 12, rir: 3, setNumber: 3 })];
    expect(suggestNext(top, target)).toEqual({ loadKg: 82.5, reps: 8 });
    expect(suggestNext([set({ loadKg: 12, reps: 12 })], target)).toEqual({ loadKg: 13, reps: 8 });
  });

  it("si falta llegar al tope, repite la carga y busca una repetición más", () => {
    expect(suggestNext([set({ reps: 12 }), set({ reps: 10 })], target)).toEqual({ loadKg: 80, reps: 11 });
    expect(suggestNext([set({ reps: 12, rir: 0 })], target)).toEqual({ loadKg: 80, reps: 12 });
    expect(suggestNext([set({ type: "warmup", reps: 12 })], target)).toEqual({ loadKg: null, reps: 8 });
  });

  it("toma las series de la última vez que se hizo el ejercicio", () => {
    const history = [
      session("2", "2026-11-12T18:00:00.000Z", [set({ exerciseName: "Remo con barra" })]),
      session("1", "2026-11-10T18:00:00.000Z", [set({ loadKg: 75 })]),
    ];
    expect(lastSetsFor("Sentadilla con barra", history)[0].loadKg).toBe(75);
    expect(lastSetsFor("Curl martillo", history)).toEqual([]);
  });
});

describe("sesión en curso", () => {
  const exercises = [{ name: "Hip thrust", sets: 3, reps: "8–12", rir: 2 }];
  const routine = {
    ...DEFAULT_ROUTINES.posterior,
    exercises,
    schedule: [{ day: "mon", name: "Glúteo", exercises }],
  };
  const history = [
    session("1", "2026-11-10T18:00:00.000Z", [set({ exerciseName: "Hip thrust", loadKg: 100, reps: 12 })]),
  ];
  const active = startSession(routine, history, "kg", new Date("2026-11-13T18:00:00.000Z"), "s1");

  it("arma las series con la sugerencia y el ejercicio del catálogo", () => {
    expect(active.exercises[0]).toMatchObject({
      name: "Hip thrust",
      exerciseId: "hip-thrust",
      target,
    });
    expect(active.exercises[0].sets).toHaveLength(3);
    expect(active.exercises[0].sets[0]).toMatchObject({ load: "102.5", reps: "", rir: "2", done: false });
    const inPounds = startSession(routine, history, "lb", new Date(), "s2");
    expect(inPounds.exercises[0].sets[0].load).toBe("226");
  });

  it("agrega series de trabajo al final y de calentamiento al inicio", () => {
    const exercise = active.exercises[0];
    expect(addSet(exercise).sets).toHaveLength(4);
    expect(addSet(exercise, "warmup").sets[0].type).toBe("warmup");
  });

  it("cambia el ejercicio sin perder las series hechas", () => {
    const exercise = {
      ...active.exercises[0],
      sets: [{ ...active.exercises[0].sets[0], done: true }, active.exercises[0].sets[1]],
    };
    const swapped = swapExercise(exercise, "Puente de glúteos", "puente-de-gluteos");
    expect(swapped.name).toBe("Puente de glúteos");
    expect(swapped.sets[0].load).toBe("102.5");
    expect(swapped.sets[1].load).toBe("");
  });

  it("guarda solo las series hechas, en kg", () => {
    expect(finishSession(active, "kg", new Date()).error).toContain("al menos una serie");
    const done = {
      ...active,
      exercises: [
        {
          ...active.exercises[0],
          sets: [
            { type: "warmup" as const, load: "60", reps: "10", rir: "", done: true },
            { type: "working" as const, load: "225", reps: "10", rir: "2", done: true },
            { type: "working" as const, load: "225", reps: "", rir: "2", done: false },
          ],
        },
      ],
    };
    const result = finishSession(done, "lb", new Date("2026-11-13T19:00:00.000Z"));
    expect(result.session?.sets).toHaveLength(2);
    expect(result.session?.sets[1]).toMatchObject({ setNumber: 2, type: "working", reps: 10, rir: 2 });
    expect(result.session?.sets[1].loadKg).toBeCloseTo(102.06, 2);
    expect(result.session?.sets[0].rir).toBeNull();
  });

  it("lee una sesión en curso guardada", () => {
    expect(readActiveSession(active)?.id).toBe("s1");
    expect(readActiveSession(null)).toBeNull();
    expect(readActiveSession({ id: 3 })).toBeNull();
  });
});

describe("resultados de la sesión", () => {
  const previous = [
    session("1", "2026-11-10T18:00:00.000Z", [
      set({ loadKg: 80, reps: 8 }),
      set({ loadKg: 80, reps: 8, setNumber: 2 }),
    ]),
  ];
  const today = session("2", "2026-11-13T18:00:00.000Z", [
    set({ type: "warmup", loadKg: 40, reps: 10 }),
    set({ loadKg: 85, reps: 6 }),
    set({ loadKg: 80, reps: 9, setNumber: 2 }),
  ]);

  it("calcula volumen, duración y series sin contar el calentamiento", () => {
    expect(setsVolume(today.sets)).toBe(85 * 6 + 80 * 9);
    expect(sessionStats(today)).toEqual({
      durationMinutes: 60,
      volumeKg: 1230,
      workingSets: 2,
      exercises: 1,
    });
  });

  it("detecta récords frente a las sesiones anteriores", () => {
    const records = personalRecords(today, previous);
    expect(records.map((record) => record.kind).sort()).toEqual(["load", "oneRepMax"]);
    expect(records.find((record) => record.kind === "load")).toMatchObject({ value: 85, previous: 80 });
    expect(personalRecords(today, [])).toEqual([]);
  });

  it("da la evolución de un ejercicio sesión a sesión", () => {
    const progress = exerciseProgress("Sentadilla con barra", [today, ...previous]);
    expect(progress.map((item) => item.heaviest)).toEqual([80, 85]);
    expect(progress[1].oneRepMax).toBeGreaterThan(progress[0].oneRepMax);
  });

  it("cuenta series por músculo: 1 principal, ½ secundario", () => {
    const muscles = setsPerMuscle([today]);
    expect(muscles.find((item) => item.muscle === "quads")?.sets).toBe(2);
    expect(muscles.find((item) => item.muscle === "adductors")?.sets).toBe(1);
    expect(muscles[0].label).toBeTruthy();
  });
});
