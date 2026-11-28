import { describe, expect, it } from "vitest";

import { arcPath, gapOf, minutesAt, pointOf, shiftMinutes, spanOf } from "./dial";

describe("reloj de 24 horas", () => {
  it("pone la medianoche arriba, las 6 a la derecha, el mediodía abajo y las 18 a la izquierda", () => {
    const at = (minutes: number) => {
      const point = pointOf(minutes, 100, 80);
      return [Math.round(point.x), Math.round(point.y)];
    };
    expect(at(0)).toEqual([100, 20]);
    expect(at(6 * 60)).toEqual([180, 100]);
    expect(at(12 * 60)).toEqual([100, 180]);
    expect(at(18 * 60)).toEqual([20, 100]);
  });

  it("lee la hora del punto tocado, redondeada a 5 minutos", () => {
    expect(minutesAt(100, 20, 100)).toBe(0);
    expect(minutesAt(180, 100, 100)).toBe(360);
    expect(minutesAt(20, 100, 100)).toBe(1080);
    const point = pointOf(23 * 60 + 37, 100, 80);
    expect(minutesAt(point.x, point.y, 100)).toBe(23 * 60 + 35);
    // Justo antes de la medianoche se redondea a las 00:00, no a las 24:00.
    const late = pointOf(23 * 60 + 58, 100, 80);
    expect(minutesAt(late.x, late.y, 100)).toBe(0);
  });

  it("mide la noche cruzando la medianoche y el arco largo usa la bandera grande", () => {
    expect(spanOf(23 * 60, 7 * 60)).toBe(8 * 60);
    expect(spanOf(1 * 60, 9 * 60 + 30)).toBe(8 * 60 + 30);
    expect(gapOf(23 * 60 + 50, 10)).toBe(20);
    expect(arcPath(60, 60, 100, 80)).toBe("");
    expect(arcPath(0, 6 * 60, 100, 80)).toContain(" 0 0 1 ");
    expect(arcPath(0, 18 * 60, 100, 80)).toContain(" 0 1 1 ");
    expect(shiftMinutes(23 * 60 + 55, 10)).toBe(5);
    expect(shiftMinutes(0, -5)).toBe(23 * 60 + 55);
  });
});
