import { describe, expect, it } from "vitest";

import type { Store } from "@/src/db/web-storage";
import { buildBackup, parseBackup } from "./backup";
import { storeFromTables, tablesFromStore } from "./backup.sqlite";

const store: Store = {
  biometrics: [
    {
      id: "b1",
      date: "2026-11-10",
      weightKg: 78.4,
      caloriesIn: 2100,
      proteinG: 150,
      carbsG: 220,
      fatsG: 65,
      bodyFatPct: 18.5,
      muscleMassKg: 36,
      waterPct: null,
      boneMassKg: 3.1,
    },
    {
      id: "b2",
      date: "2026-11-11",
      weightKg: 78.1,
      caloriesIn: 0,
      proteinG: 0,
      carbsG: 0,
      fatsG: 0,
      bodyFatPct: null,
      muscleMassKg: null,
      waterPct: null,
      boneMassKg: null,
    },
  ],
  wellbeing: [
    { id: "w2", date: "2026-11-11", mood: 4, energy: 3, stress: 2, sleepHours: 7.5, note: "bien" },
    { id: "w1", date: "2026-11-11", mood: 2, note: "" },
  ],
  workouts: [
    {
      id: "t1",
      name: "Full body",
      completedAt: "2026-11-11T15:00:00.000Z",
      exerciseCount: 2,
      sessionLogs: [
        { exerciseName: "Sentadilla", loadKg: 80, reps: 8, rir: 2 },
        { exerciseName: "Plancha", loadKg: null, reps: null, rir: null },
      ],
    },
  ],
  habits: [
    { id: "protein", date: "2026-11-11", completed: true },
    { id: "sleep", date: "2026-11-11", completed: false },
  ],
  routines: [
    {
      id: "routine-full_body",
      name: "Full body",
      variant: "full_body",
      days: ["mon", "wed"],
      exercises: [{ name: "Sentadilla", sets: 3, reps: "8–12", rir: 2 }],
      accent: "#167B5B",
      gymProfile: "full_gym",
      trainingGoal: "hypertrophy",
      sessionMinutes: 50,
    },
  ],
  profile: {
    age: 24,
    sex: "male",
    heightCm: 176,
    activity: "moderate",
    goal: "lose",
    calorieTarget: 2350,
    proteinTarget: 160,
    carbsTarget: 260,
    fatsTarget: 64,
    weightUnit: "kg",
    goalWeightKg: 74,
    pace: "moderate",
    adjustMode: "auto",
    checkInDays: 3,
  },
  reviews: [
    {
      id: "r1",
      date: "2026-11-08",
      decision: "auto",
      previousCalories: 2400,
      suggestedCalories: 2350,
      tdee: 2790,
    },
  ],
  foods: [
    {
      id: "c:1",
      source: "custom",
      name: "Yogur de casa",
      servingG: 200,
      per100: { kcal: 71, proteinG: 6, carbsG: 5, fatsG: 3 },
    },
  ],
  meals: [
    {
      id: "m1",
      date: "2026-11-11",
      slot: "lunch",
      foodId: "c:1",
      name: "Yogur de casa",
      grams: 200,
      kcal: 142,
      proteinG: 12,
      carbsG: 10,
      fatsG: 6,
    },
    {
      id: "m2",
      date: "2026-11-11",
      slot: "snack",
      name: "Registro rápido",
      kcal: 300,
      proteinG: 0,
      carbsG: 0,
      fatsG: 0,
    },
  ],
  settings: { onlineLookup: true },
  sleep: [],
};

describe("respaldo entre el teléfono y la web", () => {
  it("un respaldo guardado en SQLite y vuelto a leer es el mismo", () => {
    expect(storeFromTables(tablesFromStore(store))).toEqual(store);
  });

  it("lo que exporta el teléfono pasa la validación del respaldo", () => {
    const exported = buildBackup(storeFromTables(tablesFromStore(store)));
    expect(parseBackup(JSON.stringify(exported)).data).toEqual(store);
  });

  it("guarda el RIR como RPE y una fila por ejercicio registrado", () => {
    const { sets, workouts } = tablesFromStore(store);
    expect(workouts).toHaveLength(1);
    expect(sets).toEqual([
      {
        id: "t1-1",
        workout_id: "t1",
        exercise_name: "Sentadilla",
        set_number: 1,
        reps: 8,
        load_kg: 80,
        rpe: 8,
      },
      {
        id: "t1-2",
        workout_id: "t1",
        exercise_name: "Plancha",
        set_number: 1,
        reps: null,
        load_kg: null,
        rpe: null,
      },
    ]);
  });

  it("resume las series del teléfono en una línea por ejercicio", () => {
    const tables = tablesFromStore({ biometrics: [], wellbeing: [], workouts: [] });
    tables.workouts = [
      { id: "t9", name: "Pierna", started_at: null, completed_at: "2026-11-11T10:00:00.000Z" },
    ];
    tables.sets = [1, 2, 3].map((set) => ({
      id: `s${set}`,
      workout_id: "t9",
      exercise_name: "Prensa",
      set_number: set,
      reps: 10,
      load_kg: 120,
      rpe: 9,
    }));
    const workout = storeFromTables(tables).workouts[0];
    expect(workout.exerciseCount).toBe(1);
    expect(workout.sessionLogs).toEqual([{ exerciseName: "Prensa", loadKg: 120, reps: 10, rir: 1 }]);
  });

  it("si el respaldo trae dos registros del mismo día, conserva el último", () => {
    const repeated = {
      ...store,
      biometrics: [store.biometrics[0], { ...store.biometrics[0], id: "b9", weightKg: 79 }],
    };
    const rows = tablesFromStore(repeated).biometrics;
    expect(rows).toHaveLength(1);
    expect(rows[0].weight_kg).toBe(79);
  });

  it("un respaldo vacío produce tablas vacías y vuelve como respaldo vacío", () => {
    const empty = storeFromTables(tablesFromStore({ biometrics: [], wellbeing: [], workouts: [] }));
    expect(empty).toEqual({
      biometrics: [],
      wellbeing: [],
      workouts: [],
      habits: [],
      routines: [],
      reviews: [],
      foods: [],
      meals: [],
      sleep: [],
      settings: { onlineLookup: false },
    });
  });

  it("ignora un plan o una rutina guardados con JSON dañado", () => {
    const tables = tablesFromStore(store);
    tables.settings = [{ key: "nutrition_profile", value: "{roto" }];
    const read = storeFromTables(tables);
    expect(read.profile).toBeUndefined();
    expect(read.routines).toEqual([]);
  });
});

describe("ajustes en el respaldo del teléfono", () => {
  it("el orden del Panel y los recordatorios pasan por SQLite sin cambios", () => {
    const reminders = {
      enabled: true,
      leadMinutes: 5,
      days: { mon: [{ id: "a", label: "Cena", time: "20:00" }] },
    };
    const layout = [{ id: "trend", visible: false }];
    const data = {
      biometrics: [],
      wellbeing: [],
      workouts: [],
      settings: { onlineLookup: false, dashboard_layout: layout, meal_reminders: reminders },
    };
    const tables = tablesFromStore(data);
    expect(tables.settings.map((row) => row.key).sort()).toEqual(["dashboard_layout", "meal_reminders"]);
    expect(storeFromTables(tables).settings).toEqual(data.settings);
  });
});

describe("sueño en el respaldo del teléfono", () => {
  it("las noches pasan por SQLite sin cambios", () => {
    const sleep = [
      {
        id: "n1",
        date: "2026-11-12",
        bedtime: "23:30",
        wakeTime: "07:00",
        quality: 4,
        source: "health" as const,
      },
    ];
    const data = { biometrics: [], wellbeing: [], workouts: [], sleep };
    expect(storeFromTables(tablesFromStore(data)).sleep).toEqual(sleep);
  });
});

describe("entrenos serie por serie en el respaldo del teléfono", () => {
  it("las series con tipo, ejercicio y lado pasan por SQLite sin cambios", () => {
    const sets = [
      {
        exerciseName: "Sentadilla con barra",
        exerciseId: "sentadilla-con-barra",
        setNumber: 1,
        type: "warmup" as const,
        loadKg: 40,
        reps: 10,
        rir: null,
      },
      {
        exerciseName: "Sentadilla con barra",
        exerciseId: "sentadilla-con-barra",
        setNumber: 2,
        type: "working" as const,
        loadKg: 80,
        reps: 8,
        rir: 2,
      },
      {
        exerciseName: "Remo con mancuerna",
        setNumber: 1,
        type: "working" as const,
        loadKg: 30,
        reps: 10,
        rir: 1,
        side: "left" as const,
      },
    ];
    const workout = {
      id: "t2",
      name: "Full body",
      startedAt: "2026-11-13T17:00:00.000Z",
      completedAt: "2026-11-13T18:00:00.000Z",
      exerciseCount: 2,
      sessionLogs: [
        { exerciseName: "Sentadilla con barra", loadKg: 80, reps: 8, rir: 2 },
        { exerciseName: "Remo con mancuerna", loadKg: 30, reps: 10, rir: 1 },
      ],
      sets,
    };
    const data = { biometrics: [], wellbeing: [], workouts: [workout] };
    const back = storeFromTables(tablesFromStore(data)).workouts[0];
    expect(back.sets).toEqual(sets);
    expect(back.startedAt).toBe(workout.startedAt);
  });
});

describe("agua en el respaldo del teléfono", () => {
  it("el agua del día pasa por SQLite sin cambios", () => {
    const day = {
      id: "d",
      date: "2026-11-13",
      weightKg: 56,
      caloriesIn: 0,
      proteinG: 0,
      carbsG: 0,
      fatsG: 0,
      bodyFatPct: null,
      muscleMassKg: null,
      waterPct: null,
      boneMassKg: null,
      waterMl: 1750,
    };
    const back = storeFromTables(tablesFromStore({ biometrics: [day], wellbeing: [], workouts: [] }))
      .biometrics[0];
    expect(back.waterMl).toBe(1750);
  });
});
