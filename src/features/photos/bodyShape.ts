/**
 * Análisis de la silueta en una foto de progreso. Módulo puro: recibe lo que
 * entregan dos modelos ya entrenados que corren en el teléfono (MediaPipe:
 * segmentación de persona = máscara, y puntos del cuerpo = landmarks) y mide.
 *
 * Qué mide: anchos de hombros, cintura y cadera como fracción de la altura en
 * la foto (así no importa la distancia), las proporciones hombro/cintura y
 * cintura/cadera, y un perfil de anchos de la cabeza a los pies para ver dónde
 * cambió la silueta entre dos fotos. Con la altura de la persona pasa a cm, y
 * con una foto de frente y otra de perfil estima la circunferencia (elipse).
 *
 * Qué no promete: centímetros exactos ni % de grasa. Es una estimación que
 * depende de la pose, la ropa y la luz; por eso primero revisa la pose.
 * Las fotos nunca salen del teléfono.
 */

/** Punto del cuerpo con coordenadas de 0 a 1 sobre la foto. */
export type Landmark = { x: number; y: number; visibility?: number };
/** Máscara de persona: probabilidad de 0 a 1 por píxel, fila por fila. */
export type Mask = { width: number; height: number; data: ArrayLike<number> };
export type ShotPose = "front" | "side" | "back";

/** Índices de los 33 puntos de MediaPipe Pose que se usan. */
export const POINTS = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

/** Cuántas franjas tiene el perfil de anchos (de la cabeza a los pies). */
export const BANDS = 24;
/** Cambios menores a esto (en %) se tratan como ruido de la foto. */
export const NOISE_PCT = 2.5;

export type BodyShape = {
  /** Anchos como fracción de la altura de la silueta en la foto. */
  shoulder: number;
  waist: number;
  hip: number;
  shoulderToWaist: number;
  waistToHip: number;
  /** Ancho medio de cada franja, de la cabeza (0) a los pies, como fracción de la altura. */
  profile: number[];
};

const visible = (point: Landmark | undefined) =>
  Boolean(point) && (point?.visibility ?? 1) >= 0.5 && point!.x >= 0 && point!.x <= 1;

/** Lo que hay que corregir para que la foto sirva para medir; vacío si está bien. */
export function poseIssues(landmarks: Landmark[], pose: ShotPose): string[] {
  const at = (index: number) => landmarks[index];
  const needed = [
    POINTS.nose,
    POINTS.leftShoulder,
    POINTS.rightShoulder,
    POINTS.leftHip,
    POINTS.rightHip,
    POINTS.leftAnkle,
    POINTS.rightAnkle,
  ];
  if (!needed.every((index) => visible(at(index))))
    return ["Que se vea el cuerpo entero, de la cabeza a los pies."];
  const issues: string[] = [];
  const nose = at(POINTS.nose);
  const ankles = Math.max(at(POINTS.leftAnkle).y, at(POINTS.rightAnkle).y);
  if (nose.y < 0.04 || ankles > 0.97) issues.push("Aléjate un poco: la cabeza o los pies quedan al borde.");
  const left = at(POINTS.leftShoulder);
  const right = at(POINTS.rightShoulder);
  const spread = Math.abs(left.x - right.x);
  const centerX = (at(POINTS.leftHip).x + at(POINTS.rightHip).x) / 2;
  if (centerX < 0.3 || centerX > 0.7) issues.push("Ponte al centro de la foto.");
  if (pose === "side") {
    if (spread > 0.08) issues.push("Gírate de perfil: los hombros deben quedar uno detrás del otro.");
  } else {
    if (spread < 0.08) issues.push("Ponte de frente a la cámara.");
    const tilt = (Math.atan2(Math.abs(left.y - right.y), Math.max(spread, 1e-6)) * 180) / Math.PI;
    if (tilt > 6) issues.push("Endereza los hombros o el teléfono: la foto sale inclinada.");
  }
  return issues;
}

const inside = (mask: Mask, x: number, y: number) => mask.data[y * mask.width + x] >= 0.5;

/** Ancho (en píxeles) del tramo de silueta que pasa por `cx` en la fila `row`; 0 si no hay. */
export function runWidth(mask: Mask, row: number, cx: number): number {
  const y = Math.min(mask.height - 1, Math.max(0, Math.round(row)));
  let x = Math.min(mask.width - 1, Math.max(0, Math.round(cx)));
  // Si el centro cae justo fuera (por ejemplo, entre las piernas), busca el tramo más cercano.
  if (!inside(mask, x, y)) {
    let found = -1;
    for (let d = 1; d < mask.width * 0.1 && found < 0; d++) {
      if (x - d >= 0 && inside(mask, x - d, y)) found = x - d;
      else if (x + d < mask.width && inside(mask, x + d, y)) found = x + d;
    }
    if (found < 0) return 0;
    x = found;
  }
  let left = x;
  let right = x;
  while (left > 0 && inside(mask, left - 1, y)) left--;
  while (right < mask.width - 1 && inside(mask, right + 1, y)) right++;
  return right - left + 1;
}

/** Primera y última fila con silueta, o null si la máscara está vacía. */
function verticalExtent(mask: Mask): { top: number; bottom: number } | null {
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++)
      if (inside(mask, x, y)) {
        if (top < 0) top = y;
        bottom = y;
        break;
      }
  }
  return top < 0 ? null : { top, bottom };
}

/** Mide la silueta. Null si falta la persona o los puntos del torso. */
export function measureShape(mask: Mask, landmarks: Landmark[]): BodyShape | null {
  const extent = verticalExtent(mask);
  const shoulders = [landmarks[POINTS.leftShoulder], landmarks[POINTS.rightShoulder]];
  const hips = [landmarks[POINTS.leftHip], landmarks[POINTS.rightHip]];
  if (!extent || ![...shoulders, ...hips].every(visible)) return null;
  const height = extent.bottom - extent.top + 1;
  if (height < mask.height * 0.3) return null;
  const toRow = (y: number) => y * mask.height;
  const shoulderRow = toRow((shoulders[0].y + shoulders[1].y) / 2);
  const hipRow = toRow((hips[0].y + hips[1].y) / 2);
  const cx = ((hips[0].x + hips[1].x) / 2) * mask.width;
  const torso = hipRow - shoulderRow;
  if (torso <= 2) return null;
  const width = (row: number) => runWidth(mask, row, cx);
  const scan = (from: number, to: number, pick: (a: number, b: number) => boolean) => {
    let best = width(from);
    for (let row = Math.ceil(from); row <= to; row++) {
      const value = width(row);
      if (value > 0 && (best === 0 || pick(value, best))) best = value;
    }
    return best;
  };
  // Hombros: lo más ancho cerca de la línea de los hombros (incluye los deltoides).
  const shoulder = scan(shoulderRow, shoulderRow + torso * 0.12, (a, b) => a > b);
  // Cintura: lo más angosto entre el pecho y la cadera.
  const waist = scan(shoulderRow + torso * 0.45, hipRow - torso * 0.05, (a, b) => a < b);
  // Cadera: lo más ancho entre la articulación de la cadera y el inicio del muslo.
  const hip = scan(hipRow, hipRow + torso * 0.35, (a, b) => a > b);
  if (!shoulder || !waist || !hip) return null;
  const profile = Array.from({ length: BANDS }, (_, band) => {
    const from = extent.top + (band * height) / BANDS;
    const to = extent.top + ((band + 1) * height) / BANDS;
    let sum = 0;
    let count = 0;
    for (let row = Math.floor(from); row < to; row++) {
      sum += width(row);
      count++;
    }
    return count ? round(sum / count / height) : 0;
  });
  return {
    shoulder: round(shoulder / height),
    waist: round(waist / height),
    hip: round(hip / height),
    shoulderToWaist: round(shoulder / waist),
    waistToHip: round(waist / hip),
    profile,
  };
}

const round = (value: number) => Math.round(value * 10_000) / 10_000;

/** Anchos en cm a partir de la altura de la persona (la silueta incluye pelo y calzado: ±2 %). */
export function widthsCm(shape: BodyShape, heightCm: number) {
  return {
    shoulder: Math.round(shape.shoulder * heightCm * 10) / 10,
    waist: Math.round(shape.waist * heightCm * 10) / 10,
    hip: Math.round(shape.hip * heightCm * 10) / 10,
  };
}

/** Perímetro de una elipse por la aproximación de Ramanujan (ancho y fondo completos). */
export function ellipseCircumference(widthCm: number, depthCm: number): number {
  const a = widthCm / 2;
  const b = depthCm / 2;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

/**
 * Cintura estimada (cm) con una foto de frente (ancho) y una de perfil (fondo).
 * La cintura real no es una elipse perfecta: sirve para ver la tendencia, y la
 * cinta métrica sigue siendo la medida de referencia.
 */
export function estimateWaistCm(front: BodyShape, side: BodyShape, heightCm: number): number {
  return Math.round(ellipseCircumference(front.waist * heightCm, side.waist * heightCm) * 10) / 10;
}

/** Zona del cuerpo de cada franja (proporciones típicas de un adulto de pie). */
export function regionOf(position: number): string | null {
  if (position < 0.13) return null; // cabeza
  if (position < 0.3) return "Hombros y pecho";
  if (position < 0.45) return "Cintura y abdomen";
  if (position < 0.58) return "Cadera";
  if (position < 0.78) return "Muslos";
  return "Piernas";
}

export type ShapeChange = {
  /** Cambio en % de cada medida (negativo = más angosto). null si está dentro del ruido. */
  shoulder: number | null;
  waist: number | null;
  hip: number | null;
  /** Cambio de la proporción hombro/cintura (más alta = forma en V más marcada). */
  shoulderToWaist: number;
  /** Zonas donde la silueta cambió más que el ruido, de mayor a menor cambio. */
  regions: Array<{ region: string; pct: number }>;
};

const pctChange = (before: number, after: number) => {
  const pct = before ? ((after - before) / before) * 100 : 0;
  return Math.abs(pct) < NOISE_PCT ? null : Math.round(pct * 10) / 10;
};

/** Cambios entre dos fotos de la misma pose. */
export function compareShapes(before: BodyShape, after: BodyShape): ShapeChange {
  const byRegion = new Map<string, { sum: number; count: number }>();
  before.profile.forEach((width, band) => {
    const region = regionOf((band + 0.5) / BANDS);
    if (!region || !width || !after.profile[band]) return;
    const entry = byRegion.get(region) ?? { sum: 0, count: 0 };
    entry.sum += ((after.profile[band] - width) / width) * 100;
    entry.count++;
    byRegion.set(region, entry);
  });
  const regions = [...byRegion.entries()]
    .map(([region, { sum, count }]) => ({ region, pct: Math.round((sum / count) * 10) / 10 }))
    .filter((item) => Math.abs(item.pct) >= NOISE_PCT)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  return {
    shoulder: pctChange(before.shoulder, after.shoulder),
    waist: pctChange(before.waist, after.waist),
    hip: pctChange(before.hip, after.hip),
    shoulderToWaist: Math.round((after.shoulderToWaist - before.shoulderToWaist) * 100) / 100,
    regions,
  };
}

/** Lee una silueta guardada (en la lista de fotos); null si no es válida. */
export function readShape(value: unknown): BodyShape | null {
  const raw = value as Partial<BodyShape> | null;
  if (!raw || typeof raw !== "object") return null;
  const numbers = [raw.shoulder, raw.waist, raw.hip, raw.shoulderToWaist, raw.waistToHip];
  if (!numbers.every((item) => typeof item === "number" && item > 0 && item < 5)) return null;
  if (!Array.isArray(raw.profile) || raw.profile.length !== BANDS) return null;
  return raw as BodyShape;
}
