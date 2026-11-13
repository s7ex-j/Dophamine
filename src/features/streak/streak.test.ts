import { describe, expect, it } from "vitest";

import {
  achievements,
  bestStreak,
  currentStreak,
  petMood,
  petStage,
  shareText,
} from "@/src/features/streak/streak";

describe("racha de registro", () => {
  const dates = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-10", "2026-11-11", "2026-11-12"];

  it("cuenta los días seguidos hasta hoy o ayer", () => {
    expect(currentStreak(dates, "2026-11-12")).toBe(3);
    // Hoy sin registrar todavía no corta la racha.
    expect(currentStreak(dates, "2026-11-13")).toBe(3);
    // Dos días sin registrar sí.
    expect(currentStreak(dates, "2026-11-14")).toBe(0);
    expect(currentStreak([], "2026-11-14")).toBe(0);
  });

  it("recuerda la racha más larga, aunque cruce de mes", () => {
    expect(bestStreak(dates)).toBe(3);
    expect(bestStreak(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-01"])).toBe(3);
    expect(bestStreak([])).toBe(0);
  });
});

describe("Dopi", () => {
  it("crece con la mejor racha y nunca encoge", () => {
    expect(petStage(0)).toMatchObject({ name: "Huevo", next: 1 });
    expect(petStage(2)).toMatchObject({ name: "Recién nacido", next: 3 });
    expect(petStage(7)).toMatchObject({ level: 3, name: "Joven", next: 21 });
    expect(petStage(400)).toMatchObject({ name: "Leyenda", next: null });
  });

  it("su ánimo depende de si anotaste hoy y de si la racha sigue", () => {
    expect(petMood(true, 5, 5)).toBe("happy");
    expect(petMood(false, 5, 5)).toBe("waiting");
    expect(petMood(false, 0, 0)).toBe("waiting");
    expect(petMood(false, 0, 9)).toBe("sad");
  });
});

describe("logros", () => {
  it("se desbloquean con lo registrado", () => {
    const list = achievements({ best: 8, weighIns: 1, workouts: 12, goalReached: false });
    const unlocked = list.filter((item) => item.unlocked).map((item) => item.id);
    expect(unlocked).toEqual(["streak-3", "streak-7", "weigh-1", "train-1", "train-10"]);
    expect(list).toHaveLength(11);
  });

  it("el texto para compartir lo arma la app, pero solo sale si la persona lo envía", () => {
    expect(shareText("streak", "12 días", petStage(12))).toContain("12 días");
    expect(shareText("achievement", "30 pesajes", petStage(0))).toContain("30 pesajes");
  });
});
