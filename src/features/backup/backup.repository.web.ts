import { readStore, writeStore } from "@/src/db/web-storage";
import { backupFileName, buildBackup, type Backup } from "@/src/features/backup/backup";

// Variante web: los datos están en el almacenamiento del navegador, así que el
// respaldo es un archivo que la persona descarga y guarda donde quiera.
export const backupAvailable = true;
export const backupPlace = "este navegador";
export const exportLabel = "Descargar respaldo";

export async function downloadBackup(): Promise<void> {
  const contenido = JSON.stringify(buildBackup(readStore()), null, 2);
  const url = URL.createObjectURL(new Blob([contenido], { type: "application/json" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = backupFileName();
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

/** Abre el selector de archivos del navegador. Devuelve el texto del archivo o null si se cancela. */
export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const selector = document.createElement("input");
    selector.type = "file";
    selector.accept = "application/json,.json";
    selector.onchange = async () => {
      const archivo = selector.files?.[0];
      resolve(archivo ? await archivo.text() : null);
    };
    selector.oncancel = () => resolve(null);
    selector.click();
  });
}

export async function restoreBackup(backup: Backup): Promise<void> {
  writeStore(backup.data);
}
