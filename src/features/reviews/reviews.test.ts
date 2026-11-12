import { describe, expect, it } from "vitest";

import { addDays, describeReview, isReviewDue, isWeeklyReview, nextReviewDate } from "./reviews";

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
