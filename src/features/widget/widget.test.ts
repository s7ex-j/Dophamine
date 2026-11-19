import { describe, expect, it } from "vitest";

import { widgetSummary } from "./widget";

describe("widgetSummary", () => {
  it("dice lo que queda del día, con agua y pasos", () => {
    expect(widgetSummary({ target: 2300, eatenKcal: 1060, waterMl: 1500, steps: 8432 })).toEqual({
      label: "Te quedan",
      figure: (1240).toLocaleString("es-PE"),
      unit: "kcal",
      detail: `1.5 L de agua · ${(8432).toLocaleString("es-PE")} pasos`,
      over: false,
    });
  });

  it("avisa cuando se pasó y, sin plan, dice lo comido", () => {
    expect(widgetSummary({ target: 2000, eatenKcal: 2150, waterMl: 0, steps: null })).toMatchObject({
      label: "Te pasaste por",
      figure: "150",
      over: true,
      detail: "Sin agua anotada",
    });
    expect(widgetSummary({ target: null, eatenKcal: 800, waterMl: 0, steps: null })).toMatchObject({
      label: "Comiste hoy",
      figure: "800",
    });
  });
});
