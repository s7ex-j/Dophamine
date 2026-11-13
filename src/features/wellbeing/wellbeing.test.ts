import { describe, expect, it } from "vitest";

import {
  composeNote,
  QUESTIONS,
  shouldOfferCheckIn,
  splitNote,
  wellbeingPatterns,
} from "@/src/features/wellbeing/wellbeing";

const entry = (date: string, mood: number, energy: number | null = 3, note = "") => ({
  date,
  mood,
  energy,
  stress: 3,
  note,
});
const night = (date: string, bedtime: string, wakeTime: string) => ({
  id: date,
  date,
  bedtime,
  wakeTime,
  quality: null,
  source: "manual" as const,
});

describe("chequeo breve", () => {
  it("son tres preguntas de cinco respuestas", () => {
    expect(QUESTIONS.map((question) => question.key)).toEqual(["mood", "energy", "stress"]);
    for (const question of QUESTIONS) expect(question.options).toHaveLength(5);
  });

  it("Dopi pregunta una vez al día y respeta el «ahora no»", () => {
    expect(shouldOfferCheckIn("2026-11-13", false, null)).toBe(true);
    expect(shouldOfferCheckIn("2026-11-13", true, null)).toBe(false);
    expect(shouldOfferCheckIn("2026-11-13", false, "2026-11-13")).toBe(false);
    expect(shouldOfferCheckIn("2026-11-14", false, "2026-11-13")).toBe(true);
  });

  it("las etiquetas viajan dentro de la nota y se recuperan", () => {
    const note = composeNote(["trabajo", "sueño"], "  día largo ");
    expect(note).toBe("#trabajo #sueño día largo");
    expect(splitNote(note)).toEqual({ tags: ["trabajo", "sueño"], text: "día largo" });
    expect(splitNote("sin etiquetas #al final")).toEqual({ tags: [], text: "sin etiquetas #al final" });
    expect(composeNote([], "")).toBe("");
  });
});

describe("patrones de bienestar", () => {
  it("relaciona el ánimo con el sueño y la energía con el entreno", () => {
    const entries = [
      entry("2026-11-01", 4, 4),
      entry("2026-11-02", 5, 4),
      entry("2026-11-03", 4, 4),
      entry("2026-11-04", 2, 2, "#trabajo"),
      entry("2026-11-05", 2, 2, "#trabajo #sueño"),
      entry("2026-11-06", 3, 2, "#comida"),
    ];
    const sleep = [
      night("2026-11-01", "23:00", "07:00"),
      night("2026-11-02", "22:30", "07:00"),
      night("2026-11-03", "23:00", "06:30"),
      night("2026-11-04", "01:00", "06:00"),
      night("2026-11-05", "02:00", "07:00"),
      night("2026-11-06", "01:30", "06:30"),
    ];
    const patterns = wellbeingPatterns(entries, sleep, ["2026-11-01", "2026-11-02", "2026-11-03"]);
    expect(patterns[0]).toContain("más alto los días que duermes 7 h o más");
    expect(patterns[1]).toContain("Los días que entrenas tu energía es 2 puntos mayor");
  });

  it("con pocos datos no saca conclusiones", () => {
    expect(wellbeingPatterns([entry("2026-11-01", 1)], [], [])).toEqual([]);
  });

  it("señala lo que más aparece en los días bajos", () => {
    const low = [
      entry("2026-11-01", 1, 2, "#trabajo"),
      entry("2026-11-02", 2, 2, "#trabajo #familia"),
      entry("2026-11-03", 2, 2, "#clima"),
    ];
    expect(wellbeingPatterns(low, [], [])).toEqual(["En tus días bajos aparece más «trabajo» (2 de 3)."]);
  });
});
