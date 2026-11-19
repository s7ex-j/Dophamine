import { POINTS, type Landmark, type Mask } from "@/src/features/photos/bodyShape";

/**
 * Preparar una foto para los modelos y leer lo que devuelven. Módulo puro.
 *
 * Los modelos piden una imagen cuadrada; la foto se achica sin deformarla y se centra en el
 * cuadrado (con bordes negros). Después, la máscara y los puntos se recortan de vuelta a la foto,
 * para que las medidas de `bodyShape.ts` no cambien por el encuadre.
 */
export type Frame = { size: number; offsetX: number; offsetY: number; width: number; height: number };

/** Dónde queda la foto (de `width`×`height`, ya achicada) dentro del cuadrado de `size`. */
export function frameFor(width: number, height: number, size: number): Frame {
  return {
    size,
    width,
    height,
    offsetX: Math.floor((size - width) / 2),
    offsetY: Math.floor((size - height) / 2),
  };
}

/** Píxeles RGBA de la foto, centrados en el cuadrado, como entrada RGB del modelo. */
export function squareInput(rgba: ArrayLike<number>, frame: Frame, type: "uint8" | "float32") {
  const { size, width, height, offsetX, offsetY } = frame;
  const input = type === "uint8" ? new Uint8Array(size * size * 3) : new Float32Array(size * size * 3);
  const scale = type === "uint8" ? 1 : 1 / 255;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4;
      const to = ((y + offsetY) * size + (x + offsetX)) * 3;
      input[to] = rgba[from] * scale;
      input[to + 1] = rgba[from + 1] * scale;
      input[to + 2] = rgba[from + 2] * scale;
    }
  return input;
}

/** La probabilidad de persona del cuadrado, recortada a la foto. */
export function cropMask(probabilities: ArrayLike<number>, frame: Frame): Mask {
  const { size, width, height, offsetX, offsetY } = frame;
  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) data[y * width + x] = probabilities[(y + offsetY) * size + (x + offsetX)];
  return { width, height, data };
}

// MoveNet da 17 puntos; la medición usa los índices de MediaPipe Pose (33 puntos).
const MOVENET_TO_POSE: Array<[number, number]> = [
  [0, POINTS.nose],
  [5, POINTS.leftShoulder],
  [6, POINTS.rightShoulder],
  [11, POINTS.leftHip],
  [12, POINTS.rightHip],
  [15, POINTS.leftAnkle],
  [16, POINTS.rightAnkle],
];

/** Puntos de MoveNet (y, x, confianza en el cuadrado) como puntos de 0 a 1 sobre la foto. */
export function poseFromMoveNet(output: ArrayLike<number>, frame: Frame): Landmark[] {
  const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({ x: -1, y: -1, visibility: 0 }));
  for (const [from, to] of MOVENET_TO_POSE) {
    const y = output[from * 3] * frame.size;
    const x = output[from * 3 + 1] * frame.size;
    landmarks[to] = {
      x: (x - frame.offsetX) / frame.width,
      y: (y - frame.offsetY) / frame.height,
      visibility: output[from * 3 + 2],
    };
  }
  return landmarks;
}
