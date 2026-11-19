import { describe, expect, it } from "vitest";

import { POINTS } from "./bodyShape";
import { cropMask, frameFor, poseFromMoveNet, squareInput } from "./photoPixels";

describe("encuadre de la foto para los modelos", () => {
  it("centra una foto alta en el cuadrado y la recorta de vuelta igual", () => {
    const frame = frameFor(2, 4, 4);
    expect(frame).toMatchObject({ offsetX: 1, offsetY: 0 });
    // Foto de 2×4 con el canal rojo = índice del píxel.
    const rgba = Array.from({ length: 2 * 4 * 4 }, (_, i) => (i % 4 === 0 ? i / 4 : 0));
    const input = squareInput(rgba, frame, "uint8");
    expect(input[(0 * 4 + 1) * 3]).toBe(0);
    expect(input[(3 * 4 + 2) * 3]).toBe(7);
    expect(input[0]).toBe(0);
    const probabilities = Array.from({ length: 16 }, (_, i) => i / 16);
    const mask = cropMask(probabilities, frame);
    expect(mask.width).toBe(2);
    expect(mask.data[0]).toBeCloseTo(1 / 16);
    expect(mask.data[7]).toBeCloseTo(14 / 16);
  });

  it("pasa los valores a 0–1 cuando el modelo pide números decimales", () => {
    const input = squareInput([255, 0, 51, 255], frameFor(1, 1, 1), "float32");
    expect(input[0]).toBe(1);
    expect(input[1]).toBe(0);
    expect(input[2]).toBeCloseTo(0.2);
  });

  it("lleva los puntos de MoveNet a los índices de MediaPipe y a la foto", () => {
    const output = new Array(17 * 3).fill(0);
    // Hombro izquierdo de MoveNet (5) en el centro del cuadrado.
    output[5 * 3] = 0.5;
    output[5 * 3 + 1] = 0.5;
    output[5 * 3 + 2] = 0.9;
    const landmarks = poseFromMoveNet(output, frameFor(100, 200, 200));
    expect(landmarks).toHaveLength(33);
    expect(landmarks[POINTS.leftShoulder]).toEqual({ x: 0.5, y: 0.5, visibility: 0.9 });
    expect(landmarks[1].visibility).toBe(0);
  });
});
