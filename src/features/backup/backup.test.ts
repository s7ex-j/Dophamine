import { describe, expect, it } from "vitest";

import {
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
    expect(BACKUP_FORMAT).toBe(9);
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
