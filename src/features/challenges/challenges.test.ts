import { describe, expect, it } from "vitest";

import {
  challengeProgress,
  readChallenges,
  settleChallenges,
  startChallenge,
  EMPTY_CHALLENGES,
} from "@/src/features/challenges/challenges";
import type { DayCompliance } from "@/src/features/habits/compliance";
import { addDays } from "@/src/lib/dates";

const START = "2026-11-01";
const day = (sleep: boolean): DayCompliance => ({
  calories: true,
  water: true,
  weight: true,
  training: true,
  sleep,
  wellbeing: true,
});
const history = (pattern: boolean[]) =>
  new Map(pattern.map((sleep, index) => [addDays(START, index), day(sleep)]));

describe("retos de 21 días", () => {
  it("cuenta los días cumplidos y marca hoy y lo que falta", () => {
    const progress = challengeProgress(
      { key: "sleep", start: START },
      history([true, true, true]),
      addDays(START, 3),
    );
    expect(progress.day).toBe(4);
    expect(progress.marks.slice(0, 5)).toEqual(["done", "done", "done", "today", "pending"]);
    expect(progress.status).toBe("active");
  });

  it("un fallo por semana no lo pierde; dos en la misma semana sí", () => {
    const oneMiss = history([true, false, true, true, true, true, true, true]);
    expect(challengeProgress({ key: "sleep", start: START }, oneMiss, addDays(START, 8)).status).toBe(
      "active",
    );
    const twoMisses = history([true, false, true, false, true]);
    expect(challengeProgress({ key: "sleep", start: START }, twoMisses, addDays(START, 5)).status).toBe(
      "lost",
    );
  });

  it("se completa al cumplir el día 21 y pasa al historial", () => {
    const pattern = Array.from({ length: 21 }, (_, index) => index !== 3 && index !== 10 && index !== 17);
    const done = challengeProgress({ key: "sleep", start: START }, history(pattern), addDays(START, 20));
    expect(done).toMatchObject({ status: "done", done: 18, missed: 3 });
    const state = startChallenge(EMPTY_CHALLENGES, "sleep", START);
    const settled = settleChallenges(state, history(pattern), addDays(START, 20));
    expect(settled.active).toEqual([]);
    expect(settled.history[0]).toMatchObject({ key: "sleep", result: "done", end: addDays(START, 20) });
  });

  it("no repite un reto activo y lee lo guardado con cuidado", () => {
    const state = startChallenge(startChallenge(EMPTY_CHALLENGES, "water", START), "water", START);
    expect(state.active).toHaveLength(1);
    expect(
      readChallenges({
        active: [
          { key: "water", start: START },
          { key: "x", start: START },
        ],
        history: "no",
      }),
    ).toEqual({
      active: [{ key: "water", start: START }],
      history: [],
    });
    expect(readChallenges(null)).toEqual(EMPTY_CHALLENGES);
  });
});
