import { readStore, writeStore } from "@/src/db/web-storage";
import { backupFileName, buildBackup, type Backup } from "@/src/features/backup/backup";
import { shareTextFile } from "@/src/lib/files";

// Variante web: los datos están en el almacenamiento del navegador, así que el
// respaldo es un archivo que la persona descarga y guarda donde quiera.
export const backupAvailable = true;
export const backupPlace = "este navegador";
export const exportLabel = "Descargar respaldo";

/** Todos los datos, con la misma forma que el almacén (para exportar). */
export async function readAllData() {
  return readStore();
}

export async function downloadBackup(): Promise<void> {
  const contenido = JSON.stringify(buildBackup(readStore()), null, 2);
  await shareTextFile(backupFileName(), contenido, "application/json");
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

// En la web no hay copia semanal: los datos ya viven en este navegador. Mismas funciones que la nativa.
export async function autoBackupIfDue(): Promise<string | null> {
  return null;
}

export async function lastAutoBackup(): Promise<string | null> {
  return null;
}

export async function shareAutoBackup(): Promise<void> {}
