import { openPwaStorage } from "@/src/db/pwa-storage";
import { keepStorage, PWA } from "@/src/lib/pwa";

// SQLite es solo del teléfono. En la web los repositorios usan web-storage.ts: localStorage en el visor e
// IndexedDB en la web instalable, que se abre aquí.
export async function initializeDatabase() {
  if (!PWA) return;
  await openPwaStorage();
  void keepStorage();
}
