import { describe, expect, it } from "vitest";

import {
  latestMeasurements,
  measurementChange,
  navyBodyFat,
  readMeasurements,
  upsertMeasurement,
  waistToHeight,
} from "@/src/features/measurements/measurements";

describe("medidas corporales", () => {
  it("una medición por día, combinando lo anotado ese día", () => {
    let list = upsertMeasurement([], { date: "2026-11-01", waistCm: 80 });
    list = upsertMeasurement(list, { date: "2026-11-01", hipCm: 95 });
    list = upsertMeasurement(list, { date: "2026-10-01", waistCm: 83, armCm: 31 });
    expect(list).toEqual([
      { date: "2026-10-01", waistCm: 83, armCm: 31 },
      { date: "2026-11-01", waistCm: 80, hipCm: 95 },
    ]);
    expect(measurementChange(list, "waistCm")).toMatchObject({ first: 83, last: 80, change: -3 });
    expect(measurementChange(list, "neckCm")).toBeNull();
    expect(latestMeasurements(list)).toEqual({ waistCm: 80, armCm: 31, hipCm: 95 });
  });

  it("descarta lo imposible o mal guardado", () => {
    expect(readMeasurements([{ date: "2026-11-01", waistCm: 5 }, { date: "x", waistCm: 80 }, null])).toEqual(
      [],
    );
    expect(readMeasurements("nada")).toEqual([]);
  });

  it("estima el % de grasa con la fórmula de la Marina", () => {
    expect(navyBodyFat("male", 178, { waistCm: 85, neckCm: 38 })).toBeCloseTo(16.4, 1);
    expect(navyBodyFat("female", 165, { waistCm: 72, neckCm: 33, hipCm: 98 })).toBeCloseTo(26.8, 0);
    expect(navyBodyFat("female", 165, { waistCm: 72, neckCm: 33 })).toBeNull();
    expect(navyBodyFat("male", 178, { waistCm: 85 })).toBeNull();
  });

  it("cintura ÷ altura", () => {
    expect(waistToHeight(85, 170)).toBe(0.5);
    expect(waistToHeight(undefined, 170)).toBeNull();
  });
});
