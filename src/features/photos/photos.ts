/**
 * Fotos de progreso: cada una con su fecha y, opcional, el peso de ese día y
 * la pose. Las imágenes quedan en el teléfono (carpeta de la app); aquí solo
 * se maneja la lista, que se guarda en ajustes (`progress_photos`).
 * Las imágenes no entran en el respaldo: pesan demasiado. La silueta medida
 * (`shape`, ver bodyShape.ts) sí, porque son unos pocos números.
 */
import { readShape, type BodyShape } from "@/src/features/photos/bodyShape";

export const PHOTOS_KEY = "progress_photos";

export type Pose = "front" | "side" | "back";
export const POSE_LABELS: Record<Pose, string> = { front: "Frente", side: "Perfil", back: "Espalda" };

export type ProgressPhoto = {
  id: string;
  date: string;
  file: string;
  pose: Pose;
  weightKg?: number | null;
  /** Silueta medida en el teléfono; falta si la foto no se pudo analizar. */
  shape?: BodyShape;
};

/** Lee la lista guardada, de la más reciente a la más antigua. */
export function readPhotos(value: unknown): ProgressPhoto[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is ProgressPhoto =>
        Boolean(item) &&
        typeof item.id === "string" &&
        typeof item.file === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
        ["front", "side", "back"].includes(item.pose),
    )
    .map((item) => {
      const shape = readShape(item.shape);
      const { shape: _dropped, ...rest } = item;
      return shape ? { ...rest, shape } : rest;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export const addPhoto = (list: ProgressPhoto[], photo: ProgressPhoto) => readPhotos([photo, ...list]);
export const removePhoto = (list: ProgressPhoto[], id: string) => list.filter((item) => item.id !== id);

/**
 * Par para comparar: la foto más antigua y la más reciente de la misma pose.
 * Null si no hay dos fotos de esa pose.
 */
export function comparePair(
  list: ProgressPhoto[],
  pose: Pose,
): { before: ProgressPhoto; after: ProgressPhoto } | null {
  const same = list.filter((item) => item.pose === pose);
  if (same.length < 2) return null;
  return { before: same[same.length - 1], after: same[0] };
}

/** Días entre dos fechas AAAA-MM-DD. */
export function daysBetween(from: string, to: string): number {
  const parse = (date: string) => {
    const [year, month, day] = date.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

export type ComparisonStats = {
  days: number;
  /** Peso de cada foto: el peso real del motor ese día si existe; si no, el anotado con la foto. */
  beforeKg: number | null;
  afterKg: number | null;
  /** El peso viene del motor (sin el agua del día). */
  realWeight: boolean;
  waistCm: { before: number; after: number } | null;
};

/** La medida más cercana a una fecha (hasta 10 días de distancia). */
function nearest<T extends { date: string }>(list: T[], date: string, pick: (item: T) => number | undefined) {
  let best: { value: number; gap: number } | null = null;
  for (const item of list) {
    const value = pick(item);
    if (value === undefined) continue;
    const gap = Math.abs(daysBetween(item.date, date));
    if (gap <= 10 && (!best || gap < best.gap)) best = { value, gap };
  }
  return best?.value ?? null;
}

export function comparisonStats(
  before: ProgressPhoto,
  after: ProgressPhoto,
  realSeries: Array<{ date: string; weightKg: number }>,
  measurements: Array<{ date: string; waistCm?: number }>,
): ComparisonStats {
  const real = new Map(realSeries.map((point) => [point.date, point.weightKg]));
  const realBefore = real.get(before.date);
  const realAfter = real.get(after.date);
  const realWeight = realBefore !== undefined && realAfter !== undefined;
  const waistBefore = nearest(measurements, before.date, (item) => item.waistCm);
  const waistAfter = nearest(measurements, after.date, (item) => item.waistCm);
  return {
    days: daysBetween(before.date, after.date),
    beforeKg: realWeight ? (realBefore as number) : (before.weightKg ?? null),
    afterKg: realWeight ? (realAfter as number) : (after.weightKg ?? null),
    realWeight,
    waistCm:
      waistBefore !== null && waistAfter !== null && waistBefore !== waistAfter
        ? { before: waistBefore, after: waistAfter }
        : null,
  };
}
