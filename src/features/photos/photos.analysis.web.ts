import type { Landmark, Mask } from "@/src/features/photos/bodyShape";

// Variante web: las fotos de progreso viven solo en el teléfono y los modelos no viajan a la web.
export const ANALYSIS_READY = false;

export async function analyzePhoto(_file: string): Promise<{ mask: Mask; landmarks: Landmark[] } | null> {
  return null;
}
