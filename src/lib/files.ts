import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

// Variante para Android e iOS: el archivo se escribe en la caché y se entrega
// con la hoja de compartir del sistema; abrir usa el selector de archivos.

/** Comparte un archivo de texto (CSV, JSON) con la hoja del sistema. */
export async function shareTextFile(name: string, content: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) throw new Error("Este dispositivo no permite compartir archivos.");
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}

/** Abre un archivo de texto elegido por la persona. Null si cancela. */
export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/csv", "text/plain", "*/*"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return new File(result.assets[0].uri).text();
}
