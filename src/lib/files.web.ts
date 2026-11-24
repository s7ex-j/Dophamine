import { PWA } from "@/src/lib/pwa";

// Variante web: compartir es descargar el archivo; abrir usa el selector del navegador. En la web
// instalable se usa la hoja de compartir del teléfono, si existe.

export async function shareTextFile(name: string, content: string, mimeType: string): Promise<void> {
  const file = new File([content], name, { type: mimeType });
  if (PWA && navigator.maxTouchPoints > 0 && navigator.canShare?.({ files: [file] })) {
    try {
      return await navigator.share({ files: [file] });
    } catch (error) {
      // Cancelar la hoja no es un error, pero tampoco se exportó nada.
      if (error instanceof DOMException && error.name === "AbortError")
        throw new Error("No se compartió el archivo.");
    }
  }
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function pickTextFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv,application/json,text/csv,text/plain";
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? await file.text() : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
