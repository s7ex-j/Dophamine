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
    expect(parseBackup(JSON.stringify(backup)).data).toEqual({ ...store, reviews: [] });
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
    expect(leido.data).toEqual({ ...store, reviews: [] });
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
    expect(BACKUP_FORMAT).toBe(2);
    expect(parseBackup(JSON.stringify(backup)).data.reviews).toEqual([review]);
    const malo = { ...backup, data: { ...store, reviews: [{ ...review, decision: "quizá" }] } };
    expect(() => parseBackup(JSON.stringify(malo))).toThrow(/revisiones/);
    expect(describeBackup(backup)).toContain("1 revisión semanal");
  });

  it("resume el contenido antes de restaurar", () => {
    const texto = describeBackup(buildBackup(store, new Date("2026-11-11T12:00:00Z")));
    expect(texto).toContain("2026-11-11");
    expect(texto).toContain("1 día de registro");
    expect(texto).toContain("0 entrenos");
    expect(texto).toContain("tu plan");
  });
});
