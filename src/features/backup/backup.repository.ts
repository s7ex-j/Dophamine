import type { Backup } from "@/src/features/backup/backup";

// Variante para Android e iOS. El respaldo en archivo todavía existe solo en la
// web (ver backup.repository.web.ts): en móvil los datos viven en SQLite y
// exportarlos necesita acceso a archivos, que aún no está implementado.
export const backupAvailable = false;

export async function downloadBackup(): Promise<void> {
  throw new Error("El respaldo en archivo todavía no está disponible en la app móvil.");
}

export async function pickBackupFile(): Promise<string | null> {
  return null;
}

export async function restoreBackup(_backup: Backup): Promise<void> {
  throw new Error("El respaldo en archivo todavía no está disponible en la app móvil.");
}
