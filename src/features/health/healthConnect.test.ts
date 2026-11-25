import { describe, expect, it } from "vitest";

import {
  dayRange,
  foodToImport,
  isLeftoverImport,
  nightsToImport,
  readAllPages,
  stepsToImport,
  weightsToImport,
} from "./healthConnect";

/** Un día posterior a todos los datos de prueba. */
const TODAY = "2026-12-01";
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
        TODAY,
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
        TODAY,
      ).map((day) => day.kcal),
    ).toEqual([1000]);
  });
});

describe("isLeftoverImport", () => {
  const day = { caloriesIn: 600 };
  it("reconoce el total de hoy que dejó una importación a medias", () => {
    expect(isLeftoverImport(day, 0, true)).toBe(true);
  });
  it("no toca lo anotado aquí, los ayunos, los días vacíos ni a quien nunca importó", () => {
    expect(isLeftoverImport(day, 1, true)).toBe(false);
    expect(isLeftoverImport({ ...day, fasting: true }, 0, true)).toBe(false);
    expect(isLeftoverImport({ caloriesIn: 0 }, 0, true)).toBe(false);
    expect(isLeftoverImport(null, 0, true)).toBe(false);
    expect(isLeftoverImport(day, 0, false)).toBe(false);
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
  it("una lectura que no llega al final falla en vez de parecer completa", async () => {
    await expect(readAllPages(async () => ({ records: [1], pageToken: "igual" }))).rejects.toThrow(
      /todos los datos/,
    );
    let page = 0;
    const endless = async () => ({ records: [1], pageToken: `t${(page += 1)}` });
    await expect(readAllPages(endless, 5)).rejects.toThrow(/todos los datos/);
    expect(page).toBe(5);
    expect(await readAllPages(async () => ({ records: [], pageToken: "" }))).toEqual([]);
  });
});

describe("la comida del día en curso", () => {
  const meal = { kcal: 800, proteinG: 30, carbsG: 80, fatsG: 20, source: "app.a" };
  it("no se importa a medias: entra completa al día siguiente", () => {
    const morning = [{ ...meal, start: at("2026-11-10", "09:00") }];
    const full = [...morning, { ...meal, kcal: 1400, start: at("2026-11-10", "20:00") }];
    const first = foodToImport(morning, new Set(), "2026-11-10");
    expect(first).toEqual([]);
    const saved = new Set(first.map((day) => day.date));
    expect(foodToImport(full, saved, "2026-11-11")).toMatchObject([{ date: "2026-11-10", kcal: 2200 }]);
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
    expect(foodToImport(meals, days(foodToImport(meals, new Set(), TODAY)), TODAY)).toEqual([]);
  });
  it("los registros repetidos de peso y sueño cuentan una vez", () => {
    expect(weightsToImport([...weights, ...weights], [], new Set())).toHaveLength(1);
    expect(nightsToImport([...sleeps, ...sleeps], new Set())).toHaveLength(1);
  });
  it("los pasos se reemplazan por el total del día, no se suman a lo guardado", () => {
    const totals = [{ date: "2026-11-10", total: 8000 }];
    const saved = new Map<string, number>();
    for (let time = 0; time < 2; time += 1)
      for (const day of stepsToImport(totals)) saved.set(day.date, day.steps);
    expect([...saved]).toEqual([["2026-11-10", 8000]]);
    for (const day of stepsToImport([{ date: "2026-11-10", total: 9500 }])) saved.set(day.date, day.steps);
    expect(saved.get("2026-11-10")).toBe(9500);
  });
});
