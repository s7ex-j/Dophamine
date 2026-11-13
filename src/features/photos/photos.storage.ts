import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

// Las imágenes se copian a la carpeta privada de la app: no quedan en la galería
// ni salen del teléfono. (La versión web no guarda fotos: ver photos.storage.web.ts.)

export const PHOTOS_SUPPORTED = true;
const folder = () => new Directory(Paths.document, "progress-photos");

/** Abre la cámara o la galería y copia la foto elegida. Devuelve el nombre del archivo o null. */
export async function capturePhoto(source: "camera" | "library"): Promise<string | null> {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.7,
    allowsEditing: true,
    aspect: [3, 4],
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  const directory = folder();
  if (!directory.exists) directory.create({ intermediates: true });
  const name = `${Date.now()}.jpg`;
  new File(result.assets[0].uri).copy(new File(directory, name));
  return name;
}

/** Dirección de la imagen para mostrarla, o null si el archivo ya no existe. */
export function photoUri(file: string): string | null {
  const image = new File(folder(), file);
  return image.exists ? image.uri : null;
}

export function deletePhotoFile(file: string) {
  const image = new File(folder(), file);
  if (image.exists) image.delete();
}
