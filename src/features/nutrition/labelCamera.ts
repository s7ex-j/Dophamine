import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import type * as TextExtractor from "expo-text-extractor";

// Leer una etiqueta con la cámara (variante web: labelCamera.web.ts). El texto se reconoce en el
// teléfono (ML Kit); la foto no se guarda ni se envía: se borra en cuanto se lee.

const extractor = (): typeof TextExtractor | null => {
  try {
    return require("expo-text-extractor") as typeof TextExtractor;
  } catch {
    return null;
  }
};

/** Si este teléfono puede leer texto de una foto (en un build sin el módulo, no). */
export function labelCameraAvailable(): boolean {
  try {
    return extractor()?.isSupported === true;
  } catch {
    return false;
  }
}

/** Abre la cámara y devuelve el texto de la etiqueta, o null si se canceló. */
export async function scanLabelText(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error("Sin permiso para usar la cámara.");
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
  if (result.canceled || !result.assets[0]) return null;
  const uri = result.assets[0].uri;
  try {
    const lines = (await extractor()?.extractTextFromImage(uri)) ?? [];
    return lines.join("\n");
  } finally {
    try {
      new File(uri).delete();
    } catch {
      // Si ya no está, no hay nada que borrar.
    }
  }
}
