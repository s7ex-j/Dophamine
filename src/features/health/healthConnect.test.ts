import { describe, expect, it } from "vitest";

import {
  dayRange,
  foodToImport,
  nightsToImport,
  readAllPages,
  stepsToImport,
  weightsToImport,
} from "./healthConnect";

// Horas locales: así el día de cada dato no depende de la zona horaria de quien corre la prueba.
const at = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString();

describe("weightsToImport", () => {
  it("toma el primer pesaje de cada día y su grasa", () => {
    const result = weightsToImport(
      [
        { time: at("2026-11-10", "20:00"), kg: 79.4 },
        { time: at("2026-11-10", "07:10"), kg: 78.96 },
        { time: at("2026-11-11", "07:05"), kg: 78.8 },
      ],
      [{ time: at("2026-11-10", "07:10"), pct: 18.24 }],
      new Set(),
    );
    expect(result).toEqual([
      { date: "2026-11-10", weightKg: 79, bodyFatPct: 18.2 },
      { date: "2026-11-11", weightKg: 78.8, bodyFatPct: null },
    ]);
  });

  it("no pisa los días que ya tienen peso anotado a mano ni acepta valores imposibles", () => {
    const result = weightsToImport(
      [
        { time: at("2026-11-10", "07:00"), kg: 79 },
        { time: at("2026-11-12", "07:00"), kg: 0.5 },
      ],
      [],
      new Set(["2026-11-10"]),
    );
    expect(result).toEqual([]);
  });
});

describe("nightsToImport", () => {
  it("cuenta la noche para el día en que se despierta y se queda con la más larga", () => {
    const result = nightsToImport(
      [
        { start: at("2026-11-10", "23:30"), end: at("2026-11-11", "07:00") },
        { start: at("2026-11-11", "14:00"), end: at("2026-11-11", "14:40") },
        { start: at("2026-11-11", "23:50"), end: at("2026-11-12", "06:40") },
      ],
      new Set(["2026-11-12"]),
    );
    expect(result).toEqual([{ date: "2026-11-11", bedtime: "23:30", wakeTime: "07:00" }]);
  });
});

describe("stepsToImport", () => {
  it("usa el total de cada día y deja fuera los vacíos", () => {
    expect(
      stepsToImport([
        { date: "2026-11-11", total: 2000.4 },
        { date: "2026-11-10", total: 7500 },
        { date: "2026-11-12", total: 0 },
        { date: "2026-11-13", total: undefined },
      ]),
    ).toEqual([
      { date: "2026-11-10", steps: 7500 },
      { date: "2026-11-11", steps: 2000 },
    ]);
  });
  it("el día va de medianoche a medianoche local, sin huecos con el siguiente", () => {
    const day = dayRange("2026-11-30");
    expect(day.startTime).toBe(at("2026-11-30", "00:00"));
    expect(day.endTime).toBe(dayRange("2026-12-01").startTime);
  });
});

describe("foodToImport", () => {
  const meal = { kcal: 500, proteinG: 30.04, carbsG: 50, fatsG: 15, source: "app.a" };
  it("suma las comidas de cada día y deja fuera los días ya anotados aquí", () => {
    expect(
      foodToImport(
        [
          { ...meal, start: at("2026-11-10", "08:00") },
          { ...meal, start: at("2026-11-10", "13:00") },
          { ...meal, start: at("2026-11-11", "13:00") },
        ],
        new Set(["2026-11-11"]),
      ),
    ).toEqual([{ date: "2026-11-10", kcal: 1000, proteinG: 60.1, carbsG: 100, fatsG: 30 }]);
  });
  it("con dos apps el mismo día usa la más completa, no la suma", () => {
    expect(
      foodToImport(
        [
          { ...meal, start: at("2026-11-10", "08:00") },
          { ...meal, start: at("2026-11-10", "13:00") },
          { ...meal, start: at("2026-11-10", "13:05"), source: "app.b" },
        ],
        new Set(),
      ).map((day) => day.kcal),
    ).toEqual([1000]);
  });
});

describe("readAllPages", () => {
  it("junta todas las páginas", async () => {
    const pages: Record<string, { records: number[]; pageToken?: string }> = {
      "": { records: [1, 2], pageToken: "b" },
      b: { records: [3], pageToken: "c" },
      c: { records: [4] },
    };
    expect(await readAllPages(async (token) => pages[token ?? ""])).toEqual([1, 2, 3, 4]);
  });
  it("se detiene si la página se repite o la última viene vacía", async () => {
    let calls = 0;
    await readAllPages(async () => {
      calls += 1;
      return { records: [1], pageToken: "igual" };
    });
    expect(calls).toBe(2);
    expect(await readAllPages(async () => ({ records: [], pageToken: "" }))).toEqual([]);
  });
});

describe("importar dos veces no cambia nada", () => {
  const weights = [{ time: at("2026-11-10", "07:00"), kg: 79 }];
  const sleeps = [{ start: at("2026-11-10", "23:30"), end: at("2026-11-11", "07:00") }];
  const meals = [
    { start: at("2026-11-10", "13:00"), kcal: 500, proteinG: 30, carbsG: 50, fatsG: 15, source: "app.a" },
  ];
  const days = (list: Array<{ date: string }>) => new Set(list.map((item) => item.date));
  it("la segunda vez los días ya tienen dato", () => {
    expect(weightsToImport(weights, [], days(weightsToImport(weights, [], new Set())))).toEqual([]);
    expect(nightsToImport(sleeps, days(nightsToImport(sleeps, new Set())))).toEqual([]);
    expect(foodToImport(meals, days(foodToImport(meals, new Set())))).toEqual([]);
  });
  it("los registros repetidos de peso y sueño cuentan una vez", () => {
    expect(weightsToImport([...weights, ...weights], [], new Set())).toHaveLength(1);
    expect(nightsToImport([...sleeps, ...sleeps], new Set())).toHaveLength(1);
  });
  it("los pasos se reemplazan por el total: repetir da lo mismo", () => {
    const totals = [{ date: "2026-11-10", total: 8000 }];
    expect(stepsToImport(totals)).toEqual(stepsToImport(totals));
  });
});
