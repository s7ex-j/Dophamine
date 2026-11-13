import { describe, expect, it } from "vitest";

import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { complianceRates, complianceScore, dayCompliance, streak } from "@/src/features/habits/compliance";
import { formatDuration } from "@/src/lib/time";
import { isSleepEntry, sleepError, sleepMinutes, sleepSummary, type SleepEntry } from "./sleep";

const night = (date: string, bedtime: string, wakeTime: string, quality: number | null = 4): SleepEntry => ({
  id: date,
  date,
  bedtime,
  wakeTime,
  quality,
  source: "manual",
});

describe("sueño", () => {
  it("calcula la duración cruzando la medianoche", () => {
    expect(sleepMinutes("23:30", "07:00")).toBe(450);
    expect(sleepMinutes("01:00", "08:30")).toBe(450);
    expect(sleepMinutes("14:00", "15:30")).toBe(90);
    expect(sleepMinutes("23:00", "nada")).toBeNull();
    expect(formatDuration(450)).toBe("7 h 30 min");
    expect(formatDuration(480)).toBe("8 h");
    expect(formatDuration(40)).toBe("40 min");
  });

  it("valida lo escrito", () => {
    expect(sleepError({ bedtime: "23:00", wakeTime: "07:00", quality: 3 })).toBeNull();
    expect(sleepError({ bedtime: "x", wakeTime: "07:00", quality: null })).toContain("formato");
    expect(sleepError({ bedtime: "07:00", wakeTime: "07:30", quality: null })).toContain("entre 1 y 16");
    expect(sleepError({ bedtime: "23:00", wakeTime: "07:00", quality: 9 })).toContain("1 a 5");
  });

  it("resume la semana: promedio, calidad, hora de acostarse y deuda", () => {
    const summary = sleepSummary([
      night("2026-11-10", "23:30", "07:00", 4),
      night("2026-11-11", "00:30", "07:00", 2),
      night("2026-11-12", "23:00", "07:00", null),
    ]);
    expect(summary.nights).toBe(3);
    expect(summary.averageMinutes).toBe(440); // 450, 390 y 480
    expect(summary.averageQuality).toBe(3);
    // 23:30, 00:30 y 23:00 → media 23:40, no un mediodía.
    expect(summary.averageBedtime).toBe("23:40");
    expect(summary.bedtimeSpreadMinutes).toBeGreaterThan(0);
    expect(summary.debtMinutes).toBe(30 + 90 + 0);
    expect(sleepSummary([]).averageMinutes).toBeNull();
  });

  it("valida las noches de un respaldo", () => {
    expect(isSleepEntry(night("2026-11-12", "23:00", "07:00"))).toBe(true);
    expect(isSleepEntry({ ...night("2026-11-12", "23:00", "07:00"), source: "otra" })).toBe(false);
    expect(isSleepEntry({ ...night("2026-11-12", "23:00", "07:00"), quality: 8 })).toBe(false);
  });
});

describe("cumplimiento del día", () => {
  const record: DailyBiometrics = {
    id: "1",
    date: "2026-11-12",
    weightKg: 56,
    caloriesIn: 2700,
    proteinG: 105,
    carbsG: 0,
    fatsG: 0,
  };
  const targets = { calories: 2750, protein: 112 };
  const full = { record, trained: true, trainingDay: true, sleepMinutes: 450, wellbeingDone: true };

  it("marca solo lo que se cumplió con lo registrado", () => {
    expect(dayCompliance(full, targets)).toEqual({
      calories: true,
      protein: true,
      weight: true,
      training: true,
      sleep: true,
      wellbeing: true,
    });
    const empty = dayCompliance(
      { record: null, trained: false, trainingDay: true, sleepMinutes: null, wellbeingDone: false },
      targets,
    );
    expect(complianceScore(empty)).toBe(0);
  });

  it("aplica cada regla en su límite", () => {
    const at = (patch: Partial<DailyBiometrics>) =>
      dayCompliance({ ...full, record: { ...record, ...patch } }, targets);
    expect(at({ caloriesIn: 3100 }).calories).toBe(false);
    expect(at({ caloriesIn: 2475 }).calories).toBe(true);
    expect(at({ proteinG: 100 }).protein).toBe(false);
    expect(at({ weightKg: null }).weight).toBe(false);
    expect(dayCompliance({ ...full, sleepMinutes: 400 }, targets).sleep).toBe(false);
  });

  it("un día de descanso cuenta como cumplido en entreno", () => {
    expect(dayCompliance({ ...full, trained: false, trainingDay: false }, targets).training).toBe(true);
    expect(dayCompliance({ ...full, trained: false, trainingDay: true }, targets).training).toBe(false);
  });

  it("cuenta rachas y porcentajes", () => {
    const good = dayCompliance(full, targets);
    const bad = { ...good, sleep: false };
    expect(streak([good, bad, good, good], "sleep")).toBe(2);
    expect(streak([good, good, bad], "sleep")).toBe(0);
    expect(complianceRates([good, bad]).sleep).toBe(50);
    expect(complianceRates([]).sleep).toBe(0);
  });
});
