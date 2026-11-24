import { THEME_KEY } from "@/src/theming/palettes";

/**
 * Los datos de la web instalable, en IndexedDB (Safari da unos 5 MB a localStorage: no alcanza). Se leen
 * una vez al abrir y quedan en memoria como texto, para que los repositorios sigan leyendo al instante.
 * Cada cambio se escribe enseguida y en orden. Si hay otra pestaña abierta, se le avisa para que se
 * ponga al día y no pise lo nuevo.
 */
const DB = "dophamine-pwa";
const STORE = "data";
const ROW = "store";
/** Copia del tema, que se necesita antes de abrir la base de datos. */
export const PWA_THEME = "dophamine.pwa-theme";

let cache: string | null | undefined;
let queue: Promise<void> = Promise.resolve();
let warned = false;
let channel: BroadcastChannel | null = null;

const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir el almacenamiento."));
  });

async function load(): Promise<string | null> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(ROW);
      request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function save(text: string): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(text, ROW);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

/** Trae los datos a memoria. Si falla, la app no abre: mejor eso que empezar vacía y pisarlos. */
export async function openPwaStorage(): Promise<void> {
  cache = await load();
  if (!channel && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(DB);
    channel.onmessage = () => {
      load()
        .then((text) => {
          cache = text;
        })
        .catch(() => undefined);
    };
  }
}

export function readPwa(): string | null {
  if (cache === undefined) throw new Error("Los datos todavía no están abiertos.");
  return cache;
}

export function writePwa(text: string, theme: unknown): void {
  if (cache === undefined) throw new Error("Los datos todavía no están abiertos.");
  cache = text;
  try {
    if (typeof theme === "string") window.localStorage.setItem(PWA_THEME, theme);
  } catch {
    // El tema se vuelve a leer de los datos en la próxima elección.
  }
  queue = queue
    .then(() => save(text))
    .then(() => channel?.postMessage("saved"))
    .catch(() => {
      if (warned) return;
      warned = true;
      window.alert("No se pudo guardar. Comparte un respaldo desde Más y libera espacio en el teléfono.");
    });
}

export const themeOf = (store: { settings?: Record<string, unknown> }) => store.settings?.[THEME_KEY];
