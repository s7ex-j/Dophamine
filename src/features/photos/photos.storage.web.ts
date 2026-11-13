// En la web no se guardan fotos: el navegador no tiene espacio para imágenes y
// el visor es de solo lectura. Las fotos de progreso son del teléfono.

export const PHOTOS_SUPPORTED = false;

export async function capturePhoto(_source: "camera" | "library"): Promise<string | null> {
  return null;
}

export function photoUri(_file: string): string | null {
  return null;
}

export function deletePhotoFile(_file: string) {}
