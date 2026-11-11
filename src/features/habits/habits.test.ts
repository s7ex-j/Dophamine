import { describe, expect, it } from "vitest";
import { DEFAULT_HABITS, dateKey, monthDays } from "@/src/features/habits/habits";

describe("habits", () => {
  it("define cinco hábitos con identificadores únicos", () => {
    expect(DEFAULT_HABITS).toHaveLength(5);
    expect(new Set(DEFAULT_HABITS.map((habit) => habit.id)).size).toBe(5);
  });

  it("dateKey devuelve AAAA-MM-DD", () => {
    expect(dateKey(new Date(Date.UTC(2026, 10, 2, 12)))).toBe("2026-11-02");
  });

  it("monthDays cubre el mes completo, incluido febrero bisiesto", () => {
    expect(monthDays(new Date(2026, 1, 10, 12))).toHaveLength(28);
    expect(monthDays(new Date(2028, 1, 10, 12))).toHaveLength(29);
    expect(monthDays(new Date(2026, 9, 5, 12))).toHaveLength(31);
  });
});
