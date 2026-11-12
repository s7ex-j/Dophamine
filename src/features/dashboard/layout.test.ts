import { describe, expect, it } from "vitest";

import { linePath } from "@/src/components/chartGeometry";
import { DEFAULT_LAYOUT, moveSection, normalizeLayout, toggleSection } from "./layout";

describe("Panel personalizable", () => {
  it("sin nada guardado muestra todo en el orden por defecto", () => {
    expect(normalizeLayout(null)).toEqual(DEFAULT_LAYOUT);
    expect(DEFAULT_LAYOUT.every((item) => item.visible)).toBe(true);
  });

  it("respeta lo guardado, descarta lo desconocido y agrega lo nuevo al final", () => {
    const layout = normalizeLayout([
      { id: "trend", visible: false },
      { id: "nutrition" },
      { id: "fantasma", visible: true },
      { id: "trend", visible: true },
    ]);
    expect(layout.slice(0, 2)).toEqual([
      { id: "trend", visible: false },
      { id: "nutrition", visible: true },
    ]);
    expect(layout).toHaveLength(DEFAULT_LAYOUT.length);
  });

  it("mueve y oculta secciones", () => {
    const moved = moveSection(DEFAULT_LAYOUT, "trend", -1);
    expect(moved.map((item) => item.id).slice(0, 3)).toEqual(["nutrition", "trend", "expenditure"]);
    expect(moveSection(DEFAULT_LAYOUT, "nutrition", -1)).toBe(DEFAULT_LAYOUT);
    expect(toggleSection(DEFAULT_LAYOUT, "habits").find((item) => item.id === "habits")?.visible).toBe(false);
  });
});

describe("geometría de los gráficos", () => {
  it("escala la serie al tamaño del gráfico", () => {
    const geometry = linePath([1, 2, 3], 100, 50, undefined, 0);
    expect(geometry?.points).toEqual([
      { x: 0, y: 50 },
      { x: 50, y: 25 },
      { x: 100, y: 0 },
    ]);
    expect(geometry?.line).toBe("M 0 50 L 50 25 L 100 0");
    expect(geometry?.area.endsWith("L 100 50 L 0 50 Z")).toBe(true);
  });

  it("dibuja una serie plana al centro y acepta una referencia", () => {
    expect(linePath([5, 5], 100, 40)?.points.every((point) => point.y === 20)).toBe(true);
    expect(linePath([0, 10], 100, 50, 5, 0)?.referenceY).toBe(25);
    expect(linePath([7], 100, 40)).toBeNull();
  });
});
