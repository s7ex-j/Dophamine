import { describe, expect, it } from "vitest";

import {
  dayScore,
  daysBetween,
  goalRows,
  isClosingHour,
  monthWeeks,
  shiftMonth,
  stripDates,
} from "@/src/features/calendar/calendar";
import { longDate } from "@/src/lib/dates";
import type { ComplianceDay } from "@/src/features/habits/compliance.data";

const day = (extra: Partial<ComplianceDay> = {}): ComplianceDay => ({
  date: "2026-11-23",
  compliance: {
    calories: false,
    water: false,
    weight: false,
    training: true,
    sleep: false,
    wellbeing: false,
  },
  logged: false,
  record: null,
  sleepMinutes: null,
  trained: false,
  trainingDay: false,
  targets: { calories: 2300, protein: 160, water: 3000 },
  ...extra,
});

describe("calendario", () => {
  it("la tira termina hoy y siempre incluye ayer, también en lunes", () => {
    const strip = stripDates("2026-11-23", "2026-11-23");
    expect(strip).toHaveLength(7);
    expect(strip.at(-1)).toBe("2026-11-23");
    expect(strip).toContain("2026-11-22");
    expect(stripDates("2026-11-18", "2026-11-23").at(-1)).toBe("2026-11-23");
  });
  it("un día anterior queda en el centro, sin pasar de hoy", () => {
    expect(stripDates("2026-03-10", "2026-11-23")[3]).toBe("2026-03-10");
    expect(stripDates("2026-11-16", "2026-11-23").at(-1)).toBe("2026-11-19");
  });
  it("arma el mes de lunes a domingo", () => {
    const november = monthWeeks({ year: 2026, month: 11 });
    expect(november[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(november.at(-1)?.[0]).toBe("2026-11-30");
    expect(monthWeeks({ year: 2028, month: 2 }).flat().filter(Boolean)).toHaveLength(29);
  });
  it("cambia de mes cruzando el año y cuenta días", () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(daysBetween("2026-02-27", "2026-03-02")).toBe(3);
  });
  it("un día vacío no suma por ser de descanso", () => {
    expect(dayScore(undefined)).toBe(0);
    expect(dayScore(day())).toBe(0);
    expect(dayScore(day({ logged: true }))).toBe(1);
  });
  it("muestra cada objetivo con su dato", () => {
    const rows = goalRows(day({ logged: true, sleepMinutes: 450, trainingDay: true }), "kg");
    expect(rows).toHaveLength(6);
    expect(rows.find((row) => row.key === "training")?.value).toBe("Tocaba entrenar");
    expect(rows.find((row) => row.key === "weight")?.value).toBe("Sin anotar");
    expect(goalRows(day(), "kg").some((row) => row.done)).toBe(false);
  });
  it("escribe la fecha para leer", () => {
    expect(longDate("2027-01-12")).toBe("12 ene 2027");
    expect(longDate("")).toBe("");
  });
  it("el cierre se ofrece desde las 20:00", () => {
    expect(isClosingHour(19)).toBe(false);
    expect(isClosingHour(20)).toBe(true);
  });
});
