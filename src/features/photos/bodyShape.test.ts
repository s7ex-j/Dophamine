import { describe, expect, it } from "vitest";

import {
  BANDS,
  compareShapes,
  ellipseCircumference,
  estimateWaistCm,
  measureShape,
  poseIssues,
  readShape,
  regionOf,
  runWidth,
  widthsCm,
  type Landmark,
  type Mask,
} from "./bodyShape";

/**
 * Silueta de prueba de 100 x 200 px: cabeza, hombros de `shoulder` px, cintura
 * de `waist`, cadera de `hip` y dos piernas. Los brazos van separados del torso.
 */
function figure({ shoulder = 44, waist = 30, hip = 38 } = {}): Mask {
  const width = 100;
  const height = 200;
  const data = new Float32Array(width * height);
  const fill = (row: number, from: number, to: number) => {
    for (let x = Math.round(from); x < Math.round(to); x++) data[row * width + x] = 1;
  };
  for (let row = 10; row < 190; row++) {
    if (row < 34)
      fill(row, 42, 58); // cabeza
    else if (row < 40)
      fill(row, 46, 54); // cuello
    else if (row < 104) {
      // torso: de los hombros a la cintura (fila 80) y a la cadera (fila 104)
      const w =
        row < 50
          ? shoulder
          : row < 80
            ? shoulder + ((waist - shoulder) * (row - 50)) / 30
            : waist + ((hip - waist) * (row - 80)) / 24;
      fill(row, 50 - w / 2, 50 + w / 2);
      if (row < 100) {
        fill(row, 50 - w / 2 - 10, 50 - w / 2 - 4); // brazo izquierdo, separado
        fill(row, 50 + w / 2 + 4, 50 + w / 2 + 10);
      }
    } else if (row < 116)
      fill(row, 50 - hip / 2, 50 + hip / 2); // cadera
    else {
      fill(row, 50 - hip / 2, 49); // piernas
      fill(row, 51, 50 + hip / 2);
    }
  }
  return { width, height, data };
}

function points(overrides: Partial<Record<number, Landmark>> = {}): Landmark[] {
  const list: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  list[0] = { x: 0.5, y: 0.1 }; // nariz
  list[11] = { x: 0.6, y: 0.225 }; // hombros (fila 45)
  list[12] = { x: 0.4, y: 0.225 };
  list[23] = { x: 0.56, y: 0.52 }; // caderas (fila 104)
  list[24] = { x: 0.44, y: 0.52 };
  list[27] = { x: 0.55, y: 0.9 }; // tobillos
  list[28] = { x: 0.45, y: 0.9 };
  return list.map((point, index) => overrides[index] ?? point);
}

describe("revisar la pose", () => {
  it("una foto de frente bien tomada no tiene nada que corregir", () => {
    expect(poseIssues(points(), "front")).toEqual([]);
  });

  it("pide el cuerpo entero, centrarse y enderezar", () => {
    expect(poseIssues(points({ 27: { x: 0.5, y: 0.9, visibility: 0.1 } }), "front")).toEqual([
      "Que se vea el cuerpo entero, de la cabeza a los pies.",
    ]);
    const off = points({ 23: { x: 0.85, y: 0.52 }, 24: { x: 0.75, y: 0.52 } });
    expect(poseIssues(off, "front")).toContain("Ponte al centro de la foto.");
    const tilted = points({ 11: { x: 0.6, y: 0.26 } });
    expect(poseIssues(tilted, "front").join()).toMatch(/inclinada/);
  });

  it("distingue frente de perfil", () => {
    const side = points({ 11: { x: 0.51, y: 0.225 }, 12: { x: 0.49, y: 0.225 } });
    expect(poseIssues(side, "side")).toEqual([]);
    expect(poseIssues(side, "front")).toContain("Ponte de frente a la cámara.");
    expect(poseIssues(points(), "side").join()).toMatch(/perfil/);
  });
});

describe("medir la silueta", () => {
  it("el tramo que pasa por el centro no incluye los brazos separados", () => {
    expect(runWidth(figure(), 60, 50)).toBeGreaterThan(30);
    expect(runWidth(figure(), 60, 50)).toBeLessThan(44);
    // Entre las piernas busca el tramo más cercano.
    expect(runWidth(figure(), 150, 50)).toBeGreaterThan(10);
  });

  it("encuentra hombros, cintura y cadera como fracción de la altura", () => {
    const shape = measureShape(figure(), points());
    expect(shape).not.toBeNull();
    const height = 180;
    expect(shape!.shoulder).toBeCloseTo(44 / height, 2);
    expect(shape!.waist).toBeCloseTo(30 / height, 2);
    expect(shape!.hip).toBeCloseTo(38 / height, 2);
    expect(shape!.shoulderToWaist).toBeCloseTo(44 / 30, 1);
    expect(shape!.profile).toHaveLength(BANDS);
  });

  it("no depende de la distancia: la misma persona más chica mide igual", () => {
    const near = measureShape(figure(), points())!;
    // Media resolución = la persona a doble distancia.
    const big = figure();
    const small: Mask = { width: 50, height: 100, data: new Float32Array(50 * 100) };
    for (let y = 0; y < 100; y++)
      for (let x = 0; x < 50; x++) (small.data as Float32Array)[y * 50 + x] = big.data[y * 2 * 100 + x * 2];
    const far = measureShape(small, points())!;
    expect(far.waist).toBeCloseTo(near.waist, 1);
    expect(far.shoulderToWaist).toBeCloseTo(near.shoulderToWaist, 0);
  });

  it("sin persona o sin torso no mide", () => {
    const empty: Mask = { width: 10, height: 10, data: new Float32Array(100) };
    expect(measureShape(empty, points())).toBeNull();
    expect(measureShape(figure(), points({ 23: { x: 0.5, y: 0.5, visibility: 0 } }))).toBeNull();
  });
});

describe("comparar y pasar a centímetros", () => {
  it("ve la cintura más angosta y deja fuera el ruido", () => {
    const before = measureShape(figure({ waist: 34 }), points())!;
    const after = measureShape(figure({ waist: 30 }), points())!;
    const change = compareShapes(before, after);
    expect(change.waist).toBeLessThan(-8);
    expect(change.shoulder).toBeNull();
    expect(change.shoulderToWaist).toBeGreaterThan(0);
    expect(change.regions[0].region).toBe("Cintura y abdomen");
    expect(compareShapes(before, before).regions).toEqual([]);
  });

  it("pasa a cm con la altura y estima la cintura con frente y perfil", () => {
    const shape = measureShape(figure(), points())!;
    expect(widthsCm(shape, 180).waist).toBeCloseTo(30, 0);
    expect(ellipseCircumference(30, 30)).toBeCloseTo(Math.PI * 30, 5);
    expect(ellipseCircumference(32, 22)).toBeGreaterThan(Math.PI * 22);
    const side = { ...shape, waist: 22 / 180 };
    expect(estimateWaistCm(shape, side, 180)).toBeGreaterThan(80);
    expect(estimateWaistCm(shape, side, 180)).toBeLessThan(90);
  });

  it("zonas y lectura de lo guardado", () => {
    expect(regionOf(0.05)).toBeNull();
    expect(regionOf(0.4)).toBe("Cintura y abdomen");
    const shape = measureShape(figure(), points())!;
    expect(readShape(JSON.parse(JSON.stringify(shape)))).toEqual(shape);
    expect(readShape({ ...shape, profile: [1] })).toBeNull();
    expect(readShape(null)).toBeNull();
  });
});
