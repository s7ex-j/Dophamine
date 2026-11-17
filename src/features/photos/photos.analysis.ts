import type { Landmark, Mask } from "@/src/features/photos/bodyShape";

/**
 * Corre los dos modelos de MediaPipe sobre una foto guardada: segmentación de
 * persona (máscara) y puntos del cuerpo. Todo en el teléfono.
 *
 * Todavía no está conectado: necesita `react-native-fast-tflite` y los archivos
 * de modelo dentro del APK (etapa 2 de la hoja de ruta). Mientras tanto
 * `ANALYSIS_READY` es false y la pantalla de fotos explica que llega con la app
 * instalada. La medición (bodyShape.ts) ya está hecha y probada.
 */
export const ANALYSIS_READY = false;

export async function analyzePhoto(_file: string): Promise<{ mask: Mask; landmarks: Landmark[] } | null> {
  return null;
}
