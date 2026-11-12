import { describe, expect, it } from "vitest";

import { addDays } from "@/src/lib/dates";
import {
  canUndoAuto,
  checkInAction,
  describeReview,
  isReviewDue,
  isWeeklyReview,
  nextReviewDate,
} from "./reviews";

const accepted = {
  id: "1",
  date: "2026-11-04",
  decision: "accepted" as const,
  previousCalories: 2400,
  suggestedCalories: 2500,
  tdee: 2510,
};

describe("revisiones semanales", () => {
  it("suma días cruzando fin de mes y de año", () => {
    expect(addDays("2026-11-04", 7)).toBe("2026-11-11");
    expect(addDays("2026-11-28", 7)).toBe("2026-12-05");
    expect(addDays("2026-12-29", 7)).toBe("2027-01-05");
  });

  it("propone de inmediato si nunca hubo revisión", () => {
    expect(nextReviewDate(null)).toBeNull();
    expect(isReviewDue(null, "2026-11-11")).toBe(true);
  });

  it("espera siete días después de una respuesta, aceptada o descartada", () => {
    expect(isReviewDue(accepted, "2026-11-04")).toBe(false);
    expect(isReviewDue(accepted, "2026-11-10")).toBe(false);
    expect(isReviewDue(accepted, "2026-11-11")).toBe(true);
    expect(isReviewDue({ date: "2026-11-04" }, "2026-11-10")).toBe(false);
  });

  it("describe una revisión aceptada y una descartada", () => {
    expect(describeReview(accepted)).toEqual({
      title: "Ajuste aceptado",
      detail: "2026-11-04 · 2400 → 2500 kcal · TDEE estimado 2510 kcal",
      value: "+100 kcal",
    });
    const dismissed = describeReview({
      ...accepted,
      decision: "dismissed",
      suggestedCalories: 2320,
      tdee: null,
    });
    expect(dismissed.title).toBe("Propuesta descartada");
    expect(dismissed.detail).toBe("2026-11-04 · se mantuvo 2400 kcal (propuesta: -80 kcal)");
    expect(dismissed.value).toBe("Sin cambio");
  });

  it("reconoce revisiones válidas al leer un respaldo", () => {
    expect(isWeeklyReview(accepted)).toBe(true);
    expect(isWeeklyReview({ ...accepted, decision: "otra" })).toBe(false);
    expect(isWeeklyReview({ ...accepted, date: "ayer" })).toBe(false);
    expect(isWeeklyReview({ ...accepted, suggestedCalories: "2500" })).toBe(false);
    expect(isWeeklyReview(null)).toBe(false);
  });
});

describe("revisión cada 3 días y modos de ajuste", () => {
  const last = { date: "2026-11-04" };
  const proposal = { ready: true, delta: -50 };

  it("con intervalo de 3 días la siguiente revisión llega antes", () => {
    expect(nextReviewDate(last, 3)).toBe("2026-11-07");
    expect(isReviewDue(last, "2026-11-06", 3)).toBe(false);
    expect(isReviewDue(last, "2026-11-07", 3)).toBe(true);
  });

  it("automático aplica, colaborativo propone y manual solo informa", () => {
    expect(checkInAction(proposal, true, "auto")).toBe("auto");
    expect(checkInAction(proposal, true, "collaborative")).toBe("propose");
    expect(checkInAction(proposal, true, "manual")).toBe("inform");
    expect(checkInAction(proposal, false, "manual")).toBe("inform");
  });

  it("no hace nada si no toca revisión, no hay datos o el cambio es mínimo", () => {
    expect(checkInAction(proposal, false, "auto")).toBe("none");
    expect(checkInAction(proposal, false, "collaborative")).toBe("none");
    expect(checkInAction({ ready: false, delta: null }, true, "auto")).toBe("none");
    expect(checkInAction({ ready: true, delta: 10 }, true, "auto")).toBe("none");
    expect(checkInAction(null, true, "auto")).toBe("none");
  });

  it("un ajuste automático se puede deshacer hasta la siguiente revisión", () => {
    const auto = { date: "2026-11-04", decision: "auto" as const };
    expect(canUndoAuto(auto, "2026-11-05", 3)).toBe(true);
    expect(canUndoAuto(auto, "2026-11-07", 3)).toBe(false);
    expect(canUndoAuto({ ...auto, decision: "accepted" }, "2026-11-05", 3)).toBe(false);
    expect(canUndoAuto(null, "2026-11-05", 3)).toBe(false);
  });

  it("describe un ajuste automático y lo acepta al leer un respaldo", () => {
    const review = {
      id: "1",
      date: "2026-11-04",
      decision: "auto" as const,
      previousCalories: 2400,
      suggestedCalories: 2350,
      tdee: 2700,
    };
    expect(describeReview(review).title).toBe("Ajuste automático");
    expect(isWeeklyReview(review)).toBe(true);
  });
});
