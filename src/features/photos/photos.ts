/**
 * Fotos de progreso: cada una con su fecha y, opcional, el peso de ese día y
 * la pose. Las imágenes quedan en el teléfono (carpeta de la app); aquí solo
 * se maneja la lista, que se guarda en ajustes (`progress_photos`).
 * Las imágenes no entran en el respaldo: pesan demasiado.
 */
export const PHOTOS_KEY = "progress_photos";

export type Pose = "front" | "side" | "back";
export const POSE_LABELS: Record<Pose, string> = { front: "Frente", side: "Perfil", back: "Espalda" };

export type ProgressPhoto = { id: string; date: string; file: string; pose: Pose; weightKg?: number | null };

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
