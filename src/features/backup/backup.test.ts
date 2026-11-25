import { describe, expect, it } from "vitest";

import { normalizeRoutine } from "@/src/features/training/training.plans";

import {
  autoBackupDue,
  BACKUP_FORMAT,
  BackupError,
  backupFileName,
  buildBackup,
  describeBackup,
  parseBackup,
} from "./backup";

const store = {
  biometrics: [{ id: "1", date: "2026-11-01", weightKg: 78, caloriesIn: 2300, proteinG: 150 }],
  wellbeing: [{ id: "2", date: "2026-11-01", mood: 4, note: "" }],
  workouts: [],
  profile: {
    age: 24,
    sex: "male" as const,
    heightCm: 176,
    activity: "moderate" as const,
    goal: "lose" as const,
    calorieTarget: 2750,
    proteinTarget: 165,
    carbsTarget: 340,
    fatsTarget: 80,
  },
};

describe("respaldo", () => {
  it("lo que se exporta se puede volver a leer igual", () => {
    const backup = buildBackup(store, new Date("2026-11-11T12:00:00Z"));
    expect(parseBackup(JSON.stringify(backup)).data).toEqual({
      ...store,
      reviews: [],
      foods: [],
      meals: [],
      sleep: [],
    });
    expect(backupFileName(new Date("2026-11-11T12:00:00Z"))).toBe("dophamine-respaldo-2026-11-11.json");
  });

  it("rechaza archivos que no son de Dophamine", () => {
    expect(() => parseBackup("hola")).toThrow(BackupError);
    expect(() => parseBackup("[]")).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ app: "otra", data: store }))).toThrow(BackupError);
  });

  it("rechaza respaldos incompletos o con registros inválidos", () => {
    const base = buildBackup(store);
    const sinEntrenos = { ...base, data: { biometrics: [], wellbeing: [] } };
    expect(() => parseBackup(JSON.stringify(sinEntrenos))).toThrow(/falta "workouts"/);
    const pesoMalo = {
      ...base,
      data: { ...store, biometrics: [{ id: "1", date: "2026-11-01", weightKg: "78" }] },
    };
    expect(() => parseBackup(JSON.stringify(pesoMalo))).toThrow(/dañado/);
  });

  it("rechaza respaldos de un formato más nuevo", () => {
    expect(() => parseBackup(JSON.stringify({ ...buildBackup(store), format: 99 }))).toThrow(/más nueva/);
  });

  it("lee un respaldo del formato 1, que no traía revisiones, sin perder nada", () => {
    const v1 = { app: "dophamine", format: 1, exportedAt: "2026-11-11T12:00:00.000Z", data: store };
    const leido = parseBackup(JSON.stringify(v1));
    expect(leido.format).toBe(1);
    expect(leido.data).toEqual({ ...store, reviews: [], foods: [], meals: [], sleep: [] });
  });

  it("lee un respaldo del formato 2 y conserva la composición corporal del formato 3", () => {
    const v2 = { app: "dophamine", format: 2, exportedAt: "", data: { ...store, reviews: [] } };
    expect(parseBackup(JSON.stringify(v2)).data.biometrics).toEqual(store.biometrics);
    const conComposicion = {
      ...store,
      biometrics: [
        { ...store.biometrics[0], bodyFatPct: 18.5, muscleMassKg: 36, waterPct: 58, boneMassKg: 3.1 },
      ],
      profile: { ...store.profile, goalWeightKg: 74, pace: "moderate" as const, adjustMode: "auto" as const },
    };
    const leido = parseBackup(JSON.stringify(buildBackup(conComposicion)));
    expect(leido.data.biometrics[0]).toMatchObject({ bodyFatPct: 18.5, boneMassKg: 3.1 });
    expect(leido.data.profile).toMatchObject({ goalWeightKg: 74, adjustMode: "auto" });
  });

  it("el formato 2 conserva el historial de revisiones y rechaza uno dañado", () => {
    const review = {
      id: "r1",
      date: "2026-11-04",
      decision: "accepted" as const,
      previousCalories: 2750,
      suggestedCalories: 2650,
      tdee: 3000,
    };
    const backup = buildBackup({ ...store, reviews: [review] });
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(BACKUP_FORMAT).toBe(10);
    expect(parseBackup(JSON.stringify(backup)).data.reviews).toEqual([review]);
    const malo = { ...backup, data: { ...store, reviews: [{ ...review, decision: "quizá" }] } };
    expect(() => parseBackup(JSON.stringify(malo))).toThrow(/revisiones/);
    expect(describeBackup(backup)).toContain("1 revisión");
  });

  it("el formato 4 conserva comidas, alimentos propios y días sin pesaje", () => {
    const meal = {
      id: "m1",
      date: "2026-11-11",
      slot: "lunch" as const,
      foodId: "c:1",
      name: "Yogur de casa",
      grams: 200,
      kcal: 142,
      proteinG: 12,
      carbsG: 10,
      fatsG: 6,
    };
    const food = {
      id: "c:1",
      source: "custom" as const,
      name: "Yogur de casa",
      servingG: 200,
      per100: { kcal: 71, proteinG: 6, carbsG: 5, fatsG: 3 },
    };
    const sinPesaje = { id: "9", date: "2026-11-11", weightKg: null, caloriesIn: 142, proteinG: 12 };
    const data = { ...store, biometrics: [...store.biometrics, sinPesaje], meals: [meal], foods: [food] };
    const leido = parseBackup(JSON.stringify(buildBackup(data))).data;
    expect(leido.meals).toEqual([meal]);
    expect(leido.foods).toEqual([food]);
    expect(leido.biometrics[1].weightKg).toBeNull();
    expect(describeBackup(buildBackup(data))).toContain("1 comida registrada");
    const malo = { ...buildBackup(data), data: { ...data, meals: [{ ...meal, slot: "merienda" }] } };
    expect(() => parseBackup(JSON.stringify(malo))).toThrow(/comidas/);
  });

  it("resume el contenido antes de restaurar", () => {
    const texto = describeBackup(buildBackup(store, new Date("2026-11-11T12:00:00Z")));
    expect(texto).toContain("2026-11-11");
    expect(texto).toContain("1 día de registro");
    expect(texto).toContain("0 entrenos");
    expect(texto).toContain("tu plan");
  });
});

describe("respaldo formato 5", () => {
  it("conserva los ajustes libres y rechaza unos dañados", () => {
    const settings = { onlineLookup: true, dashboard_layout: [{ id: "trend", visible: false }] };
    const data = { biometrics: [], wellbeing: [], workouts: [], settings };
    expect(parseBackup(JSON.stringify(buildBackup(data))).data.settings).toEqual(settings);
    const malo = { ...buildBackup(data), data: { ...data, settings: "roto" } };
    expect(() => parseBackup(JSON.stringify(malo))).toThrow(/ajustes/);
  });
});

describe("respaldo formato 6", () => {
  it("conserva el sueño y rechaza una noche dañada", () => {
    const night = {
      id: "n1",
      date: "2026-11-12",
      bedtime: "23:30",
      wakeTime: "07:00",
      quality: 4,
      source: "manual",
    };
    const data = { biometrics: [], wellbeing: [], workouts: [], sleep: [night] };
    expect(parseBackup(JSON.stringify(buildBackup(data as never))).data.sleep).toEqual([night]);
    const malo = {
      ...buildBackup(data as never),
      data: { ...data, sleep: [{ ...night, bedtime: "nunca" }] },
    };
    expect(() => parseBackup(JSON.stringify(malo))).toThrow(/sueño/);
  });
});

describe("autoBackupDue", () => {
  it("toca la primera vez y cada siete días", () => {
    expect(autoBackupDue(null, "2026-11-18")).toBe(true);
    expect(autoBackupDue("2026-11-12", "2026-11-18")).toBe(false);
    expect(autoBackupDue("2026-11-11", "2026-11-18")).toBe(true);
  });
  it("si la fecha guardada es del futuro (reloj cambiado), vuelve a guardar", () => {
    expect(autoBackupDue("2026-12-01", "2026-11-18")).toBe(true);
  });
});

describe("0.42.1: el respaldo se valida igual en el teléfono y en la web", () => {
  const read = (data: object) => parseBackup(JSON.stringify({ app: "dophamine", format: 10, data }));
  const day = { id: "1", date: "2026-11-20", weightKg: 78, caloriesIn: 2300, proteinG: 150 };
  const base = { biometrics: [day], wellbeing: [], workouts: [] };
  const cases: Array<[string, object]> = [
    ["peso negativo", { ...base, biometrics: [{ ...day, weightKg: -5 }] }],
    ["peso cero", { ...base, biometrics: [{ ...day, weightKg: 0 }] }],
    ["calorías negativas", { ...base, biometrics: [{ ...day, caloriesIn: -500 }] }],
    ["fecha que no existe", { ...base, biometrics: [{ ...day, date: "2026-99-99" }] }],
    ["30 de febrero", { ...base, biometrics: [{ ...day, date: "2026-02-30" }] }],
    ["sin proteína", { ...base, biometrics: [{ ...day, proteinG: undefined }] }],
    ["grasa de 140 %", { ...base, biometrics: [{ ...day, bodyFatPct: 140 }] }],
    ["ánimo 9", { ...base, wellbeing: [{ id: "w", date: "2026-11-20", mood: 9, note: "" }] }],
    ["entrenos vacíos", { ...base, workouts: [null, 5] }],
    ["entreno sin fecha", { ...base, workouts: [{ id: "e", name: "A", completedAt: "ayer" }] }],
    [
      "serie con carga negativa",
      {
        ...base,
        workouts: [
          {
            id: "e",
            name: "A",
            completedAt: "2026-11-20T10:00:00",
            sets: [{ exerciseName: "Press", setNumber: 1, type: "working", loadKg: -5, reps: 5, rir: 2 }],
          },
        ],
      },
    ],
    ["hábito sin fecha", { ...base, habits: [{ id: "h", completed: true }] }],
    ["rutina sin ejercicios ni entrenos", { ...base, routines: [{ name: "R", days: ["mon"] }] }],
    ["plan solo con calorías", { ...base, profile: { calorieTarget: 2000 } }],
    ["plan con sexo desconocido", { ...base, profile: { ...store.profile, sex: "x" } }],
  ];
  for (const [name, data] of cases) it(`rechaza: ${name}`, () => expect(() => read(data)).toThrow(/dañado/));

  const workoutWith = (extra: object) => ({
    ...base,
    workouts: [{ id: "e", name: "A", completedAt: "2026-11-20T10:00:00.000Z", ...extra }],
  });
  const log = { exerciseName: "Press", loadKg: 60, reps: 8, rir: 2 };
  const profileWith = (extra: object) => ({ ...base, profile: { ...store.profile, ...extra } });
  const more: Array<[string, object]> = [
    ["hora imposible", workoutWith({ completedAt: "2026-11-20T99:99:99Z" })],
    ["texto tras la fecha", workoutWith({ completedAt: "2026-11-20 basura" })],
    ["inicio con hora inválida", workoutWith({ startedAt: "2026-11-20T10:61" })],
    ["rir de una línea que no es número", workoutWith({ sessionLogs: [{ ...log, rir: "dos" }] })],
    ["rir de una línea fuera de rango", workoutWith({ sessionLogs: [{ ...log, rir: 400 }] })],
    [
      "bienestar con texto tras la fecha",
      { ...base, wellbeing: [{ id: "w", date: "2026-11-20x", mood: 4 }] },
    ],
    ["grasa del plan imposible", profileWith({ bodyFatPct: 140 })],
    ["fecha de inicio del plan que no existe", profileWith({ startDate: "2026-02-30" })],
    ["experiencia desconocida", profileWith({ experience: "dios" })],
    ["días de entreno imposibles", profileWith({ trainingDays: 9 })],
    ["ingesta conocida como texto", profileWith({ knownIntake: "2000" })],
    ["reparto semanal con texto", profileWith({ customDayOffsets: { mon: "mucho" } })],
    [
      "rutina con un ejercicio nulo",
      { ...base, routines: [{ name: "R", days: ["mon"], exercises: [null] }] },
    ],
    [
      "rutina con series negativas",
      { ...base, routines: [{ name: "R", exercises: [{ name: "P", sets: -1 }] }] },
    ],
  ];
  for (const [name, data] of more) it(`rechaza: ${name}`, () => expect(() => read(data)).toThrow(/dañado/));

  for (const [name, routine] of [
    ["ejercicios como texto", { name: "R", days: ["mon", "wed"], exercises: ["Press banca", "Remo"] }],
    ["textos y objetos mezclados", { name: "R", days: ["mon"], exercises: ["Remo", { name: "Press" }] }],
    ["sin días", { name: "R", exercises: ["Remo"] }],
    ["solo con entrenos por día", { name: "R", schedule: [{ day: "mon", exercises: ["Remo"] }] }],
    ["un día sin ejercicios", { name: "R", schedule: [{ day: "mon" }] }],
  ] as const)
    it(`acepta una rutina antigua: ${name}, y se puede leer`, () => {
      const saved = read({ ...base, routines: [routine] }).data.routines?.[0];
      expect(normalizeRoutine(saved).name).toBe("R");
    });

  it("una rutina anterior a la 0.14.0 conserva sus ejercicios en cada día", () => {
    const saved = read({
      ...base,
      routines: [{ name: "Anterior", days: ["mon", "wed"], exercises: ["Press banca", "Remo"] }],
    }).data.routines?.[0];
    const routine = normalizeRoutine(saved);
    expect(routine.days).toEqual(["mon", "wed"]);
    for (const day of routine.schedule)
      expect(day.exercises.map((item) => item.name)).toEqual(["Press banca", "Remo"]);
  });

  for (const moment of [
    "2026-11-20",
    "2026-11-20 10:00:00",
    "2026-11-20T10:00",
    "2026-11-20T10:00:00.123Z",
    "2026-11-20T10:00:00-05:00",
  ])
    it(`acepta la hora ${moment}`, () =>
      expect(read(workoutWith({ completedAt: moment })).data.workouts).toHaveLength(1));

  it("acepta un plan con todos los datos de la evaluación", () => {
    const full = {
      startDate: "2026-01-01",
      bodyFatPct: 18,
      proteinLevel: "high",
      trainingDays: 4,
      sessionMinutes: 60,
      trainingType: "mixed",
      experience: "beginner",
      knownIntake: 2200,
      recentTrend: "stable",
      initialExpenditure: 2600,
      mealStyle: "numbered",
      mealsPerDay: 5,
      dietType: "keto",
      calorieSchedule: "custom",
      trainingDayExtra: 200,
      customDayOffsets: { mon: -100, sat: 250 },
    };
    expect(read(profileWith(full)).data.profile).toMatchObject(full);
  });

  it("acepta lo que la app guarda de verdad, también lo opcional vacío", () => {
    const data = {
      ...base,
      biometrics: [
        { ...day, carbsG: 0, fatsG: 0, bodyFatPct: null, waterPct: null, steps: null, fasting: true },
        { ...day, id: "2", date: "2026-11-21", weightKg: null, caloriesIn: 0, proteinG: 0 },
      ],
      wellbeing: [{ id: "w", date: "2026-11-20", mood: 4, sleepHours: 0, note: "" }],
      workouts: [
        {
          id: "e",
          name: "A",
          completedAt: "2026-11-20T10:00:00.000Z",
          sessionLogs: [{ exerciseName: "Press", loadKg: null, reps: null, rir: null }],
          sets: [
            { exerciseName: "Plancha", setNumber: 1, type: "working", loadKg: null, reps: 0, rir: null },
          ],
        },
      ],
      habits: [{ id: "checkin", date: "2026-11-20", completed: true }],
      profile: store.profile,
    };
    expect(read(data).data.biometrics).toHaveLength(2);
  });
});
