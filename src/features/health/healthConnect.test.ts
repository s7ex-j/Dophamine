import { describe, expect, it } from "vitest";

import { foodToImport, nightsToImport, stepsByDay, weightsToImport } from "./healthConnect";

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

describe("stepsByDay", () => {
  it("suma los tramos de cada día", () => {
    expect(
      stepsByDay([
        { start: at("2026-11-10", "08:00"), count: 3000 },
        { start: at("2026-11-10", "18:00"), count: 4500 },
        { start: at("2026-11-11", "09:00"), count: 2000 },
        { start: at("2026-11-11", "10:00"), count: 0 },
      ]),
    ).toEqual([
      { date: "2026-11-10", steps: 7500 },
      { date: "2026-11-11", steps: 2000 },
    ]);
  });
});

describe("foodToImport", () => {
  it("suma las comidas de cada día y deja fuera los días ya anotados aquí", () => {
    const meal = { kcal: 500, proteinG: 30.04, carbsG: 50, fatsG: 15 };
    expect(
      foodToImport(
        [
          { start: at("2026-11-10", "08:00"), ...meal },
          { start: at("2026-11-10", "13:00"), ...meal },
          { start: at("2026-11-11", "13:00"), ...meal },
        ],
        new Set(["2026-11-11"]),
      ),
    ).toEqual([{ date: "2026-11-10", kcal: 1000, proteinG: 60.1, carbsG: 100, fatsG: 30 }]);
  });
});
