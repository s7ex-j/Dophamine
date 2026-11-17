import type { Landmark, Mask } from "@/src/features/photos/bodyShape";

/** En la web no hay fotos (quedan en el teléfono), así que tampoco análisis. */
export const ANALYSIS_READY = false;

export async function analyzePhoto(_file: string): Promise<{ mask: Mask; landmarks: Landmark[] } | null> {
  return null;
}
