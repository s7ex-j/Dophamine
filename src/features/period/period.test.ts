import { describe, expect, it } from "vitest";

import {
  addPeriodStart,
  cycleLength,
  cycleStatus,
  endPeriod,
  periodLength,
  readPeriods,
  removePeriod,
} from "@/src/features/period/period";

const periods = readPeriods([
  { start: "2026-08-03", end: "2026-08-07" },
  { start: "2026-08-31", end: "2026-09-04" },
  { start: "2026-09-29", end: "2026-10-03" },
  { start: "2026-10-28" },
]);

describe("ciclo menstrual", () => {
  it("estima la duración del ciclo y del periodo con lo anotado", () => {
    expect(cycleLength(periods)).toBe(29);
    expect(periodLength(periods)).toBe(5);
    expect(cycleLength([])).toBe(28);
  });

  it("sabe el día y la fase de hoy, y cuándo viene el próximo", () => {
    expect(cycleStatus(periods, "2026-10-30")).toMatchObject({ day: 3, phase: "menstrual" });
    expect(cycleStatus(periods, "2026-11-04")).toMatchObject({ day: 8, phase: "follicular" });
    expect(cycleStatus(periods, "2026-11-11")).toMatchObject({ day: 15, phase: "ovulation" });
    expect(cycleStatus(periods, "2026-11-20")).toMatchObject({
      day: 24,
      phase: "luteal",
      nextStart: "2026-11-26",
      daysUntilNext: 6,
      late: false,
    });
    expect(cycleStatus(periods, "2026-11-30")).toMatchObject({ late: true, daysUntilNext: -4 });
    expect(cycleStatus([], "2026-11-20")).toBeNull();
  });

  it("anota inicio y fin sin duplicar, y se puede borrar", () => {
    let list = addPeriodStart(periods, "2026-11-26");
    expect(list.at(-1)).toEqual({ start: "2026-11-26" });
    expect(addPeriodStart(list, "2026-11-28")).toBe(list);
    list = endPeriod(list, "2026-11-30");
    expect(list.at(-1)).toEqual({ start: "2026-11-26", end: "2026-11-30" });
    expect(removePeriod(list, "2026-11-26").at(-1)?.start).toBe("2026-10-28");
  });

  it("descarta lo mal guardado", () => {
    expect(readPeriods([{ start: "x" }, { start: "2026-11-01", end: "2026-10-01" }, null])).toEqual([
      { start: "2026-11-01" },
    ]);
    expect(readPeriods("nada")).toEqual([]);
  });
});
