// Variante web: leer con la cámara solo existe en el teléfono. Mismas funciones que la nativa.
export function labelCameraAvailable(): boolean {
  return false;
}

export async function scanLabelText(): Promise<string | null> {
  return null;
}
