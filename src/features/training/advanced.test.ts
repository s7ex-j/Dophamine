import { describe, expect, it } from "vitest";

import { cycleWeek, deloadLoad, deloadPlan, readCycle } from "@/src/features/training/cycle";
import { activeGym, DEFAULT_GYMS, readGyms, roundLoad, warmupSets } from "@/src/features/training/gyms";
import {
  nextInSuperset,
  nextSetType,
  readSetType,
  setMark,
  sideBalance,
  supersetLabels,
  toggleSides,
  toggleSuperset,
  withWarmup,
} from "@/src/features/training/sets";
import { generateRoutine } from "@/src/features/training/training.plans";
import {
  finishSession,
  sessionExercise,
  setsVolume,
  startSession,
  type ActiveSession,
  type CompletedSession,
} from "@/src/features/training/workout";

const history: CompletedSession[] = [
  {
    id: "1",
    name: "Pierna",
    startedAt: "2026-11-10T18:00:00.000Z",
    completedAt: "2026-11-10T19:00:00.000Z",
    sets: [1, 2, 3].map((setNumber) => ({
      exerciseName: "Sentadilla con barra",
      setNumber,
      type: "working" as const,
      loadKg: 100,
      reps: 8,
      rir: 2,
    })),
  },
];
const plan = { name: "Sentadilla con barra", sets: 4, reps: "8–12", rir: 2 };

describe("tipos de serie", () => {
  it("se recorren al tocar el número y se marcan con su letra", () => {
    expect(nextSetType("working")).toBe("warmup");
    expect(nextSetType("partial")).toBe("working");
    expect(setMark("working", 3)).toBe("3");
    expect(setMark("myo", 3)).toBe("M");
    expect(readSetType("otro")).toBe("working");
    expect(readSetType("drop")).toBe("drop");
  });

  it("drop sets, myo-reps y parciales suman al volumen; el calentamiento no", () => {
    const sets = (["working", "drop", "myo", "partial", "warmup"] as const).map((type, index) => ({
      exerciseName: "x",
      setNumber: index,
      type,
      loadKg: 10,
      reps: 10,
      rir: null,
    }));
    expect(setsVolume(sets)).toBe(400);
  });
});

describe("lados izquierdo y derecho", () => {
  it("cada serie se vuelve dos y al quitarlo vuelve a una", () => {
    const exercise = sessionExercise({ ...plan, sets: 2 }, [], "kg");
    const sided = toggleSides(exercise);
    expect(sided.bySide).toBe(true);
    expect(sided.sets.map((set) => set.side)).toEqual(["left", "right", "left", "right"]);
    const back = toggleSides(sided);
    expect(back.sets).toHaveLength(2);
    expect(back.sets[0]).not.toHaveProperty("side");
  });

  it("compara el volumen de cada lado", () => {
    const set = (side: "left" | "right", loadKg: number) => ({
      exerciseName: "Remo con mancuerna",
      setNumber: 1,
      type: "working" as const,
      loadKg,
      reps: 10,
      rir: 2,
      side,
    });
    expect(sideBalance([set("left", 20), set("right", 25)])).toEqual({
      left: 200,
      right: 250,
      differencePct: 20,
    });
    expect(sideBalance([set("left", 20)])).toBeNull();
    // El lado se guarda al cerrar la sesión.
    const active: ActiveSession = {
      id: "s",
      routineName: "x",
      startedAt: "2026-11-13T18:00:00.000Z",
      exercises: [
        {
          ...toggleSides(
            sessionExercise({ name: "Remo con mancuerna", sets: 1, reps: "10", rir: 2 }, [], "kg"),
          ),
        },
      ],
    };
    active.exercises[0].sets = active.exercises[0].sets.map((draft) => ({
      ...draft,
      load: "20",
      reps: "10",
      done: true,
    }));
    const done = finishSession(active, "kg", new Date("2026-11-13T19:00:00.000Z")).session!;
    expect(done.sets.map((logged) => logged.side)).toEqual(["left", "right"]);
  });
});

describe("superseries", () => {
  const routine = generateRoutine({
    variant: "upper_lower",
    gymProfile: "full_gym",
    trainingGoal: "hypertrophy",
    sessionMinutes: 50,
  });
  const session = startSession(routine, [], "kg", new Date(), "s");

  it("une ejercicios seguidos, los etiqueta y alterna entre ellos", () => {
    let linked = toggleSuperset(session, 0);
    linked = toggleSuperset(linked, 1);
    linked = toggleSuperset(linked, 3);
    expect(supersetLabels(linked)).toEqual(["A1", "A2", "A3", "B1", "B2"]);
    expect(nextInSuperset(linked, 0)).toBe(1);
    expect(nextInSuperset(linked, 2)).toBe(0);
    expect(nextInSuperset(linked, 4)).toBe(3);
    const split = toggleSuperset(linked, 3);
    expect(supersetLabels(split)).toEqual(["A1", "A2", "A3", "", ""]);
    expect(nextInSuperset(split, 3)).toBeNull();
  });
});

describe("gimnasios y calentamiento", () => {
  it("lee perfiles guardados y vuelve a los de siempre si no hay", () => {
    expect(readGyms(null)).toBe(DEFAULT_GYMS);
    const mine = [{ id: "trabajo", name: "Trabajo", equipment: ["dumbbell"], barKg: 15, incrementKg: 1 }];
    expect(readGyms(mine)).toEqual(mine);
    expect(activeGym(readGyms(mine), "otro").id).toBe("trabajo");
    expect(roundLoad(61.3, 2.5)).toBe(62.5);
    expect(roundLoad(13.4, 2)).toBe(14);
  });

  it("con barra: barra vacía y luego 40, 60 y 80 %", () => {
    expect(warmupSets(100, "barbell", { barKg: 20, incrementKg: 2.5 })).toEqual([
      { loadKg: 20, reps: 10 },
      { loadKg: 40, reps: 8 },
      { loadKg: 60, reps: 5 },
      { loadKg: 80, reps: 3 },
    ]);
    // Con poca carga no repite la barra ni llega a la serie efectiva.
    expect(warmupSets(30, "barbell", { barKg: 20, incrementKg: 2.5 })).toEqual([
      { loadKg: 20, reps: 10 },
      { loadKg: 25, reps: 3 },
    ]);
    expect(warmupSets(24, "dumbbell", { barKg: 20, incrementKg: 2 })).toEqual([
      { loadKg: 12, reps: 10 },
      { loadKg: 18, reps: 5 },
    ]);
    expect(warmupSets(0, "barbell", { barKg: 20, incrementKg: 2.5 })).toEqual([]);
  });

  it("agrega el calentamiento antes de la primera serie efectiva, una sola vez", () => {
    const exercise = sessionExercise(plan, history, "kg");
    const warmed = withWarmup(exercise, "barbell", { barKg: 20, incrementKg: 2.5 }, "kg");
    expect(warmed.sets.filter((set) => set.type === "warmup").map((set) => set.load)).toEqual([
      "20",
      "40",
      "60",
      "80",
    ]);
    expect(withWarmup(warmed, "barbell", { barKg: 20, incrementKg: 2.5 }, "kg")).toBe(warmed);
  });

  it("la carga sugerida se redondea al salto del gimnasio", () => {
    const exercise = sessionExercise({ ...plan, reps: "8" }, history, "kg", { incrementKg: 5 });
    // La vez anterior llegó al tope (8): sube un paso a 102.5 y se redondea a 105.
    expect(exercise.sets[0].suggestion?.loadKg).toBe(105);
  });
});

describe("mesociclos", () => {
  const cycle = { weeks: 5, startDate: "2026-11-02", deload: true };

  it("sabe en qué semana va y cuándo toca descarga", () => {
    expect(cycleWeek(cycle, "2026-11-02")).toMatchObject({ week: 1, total: 5, isDeload: false });
    expect(cycleWeek(cycle, "2026-11-25")).toMatchObject({ week: 4, deloadNext: true });
    expect(cycleWeek(cycle, "2026-12-01")).toMatchObject({ week: 5, isDeload: true });
    // El bloque se repite.
    expect(cycleWeek(cycle, "2026-12-07")).toMatchObject({ week: 1, isDeload: false });
    expect(cycleWeek({ ...cycle, deload: false }, "2026-12-01").isDeload).toBe(false);
  });

  it("en descarga: la mitad de las series, 10 % menos de carga y más reserva", () => {
    expect(deloadPlan(plan)).toMatchObject({ sets: 2, rir: 4 });
    expect(deloadLoad(100)).toBe(90);
    const exercise = sessionExercise(plan, history, "kg", { deload: true });
    expect(exercise.sets).toHaveLength(2);
    expect(exercise.target.rir).toBe(4);
    expect(exercise.sets[0].suggestion?.loadKg).toBe(90);
    expect(readCycle({ weeks: 6, startDate: "2026-11-02" })).toEqual({
      weeks: 6,
      startDate: "2026-11-02",
      deload: true,
    });
    expect(readCycle({ weeks: 1, startDate: "2026-11-02" })).toBeNull();
  });
});
