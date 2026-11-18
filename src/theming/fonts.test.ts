import { describe, expect, it } from "vitest";

import { FONTS, fontFor } from "./fonts";

describe("fontFor", () => {
  it("elige el peso de Instrument Sans para el texto corriente", () => {
    expect(fontFor(undefined, undefined, 15)).toBe(FONTS.text400);
    expect(fontFor(undefined, "600", 13)).toBe(FONTS.text600);
    expect(fontFor(undefined, "bold", 14)).toBe(FONTS.text700);
    expect(fontFor(undefined, "800", 13)).toBe(FONTS.text700);
  });
  it("usa la letra de titulares para cifras y títulos grandes en negrita", () => {
    expect(fontFor(undefined, "700", 42)).toBe(FONTS.display700);
    expect(fontFor(undefined, "600", 20)).toBe(FONTS.display600);
    expect(fontFor(undefined, "400", 30)).toBe(FONTS.text400);
    expect(fontFor("display", "700", 14)).toBe(FONTS.display700);
  });
  it("da la voz de Term a la monoespaciada y respeta una familia ya resuelta", () => {
    expect(fontFor("monospace", "800", 12)).toBe(FONTS.mono700);
    expect(fontFor("monospace", undefined, 12)).toBe(FONTS.mono400);
    expect(fontFor(FONTS.text500, "700", 40)).toBe(FONTS.text500);
  });
});
