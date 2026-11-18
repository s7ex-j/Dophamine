// El visor web empieza cada visita en "Conecta tu teléfono". Los datos que ya trajo se quedan en este
// navegador, pero solo se muestran cuando en esta visita se conectó el teléfono, se cargó un respaldo o
// se eligió ver lo guardado. La marca vive en sessionStorage: se borra al cerrar la pestaña.
const SESSION_KEY = "dophamine.viewer-open";
const STORE_KEY = "dophamine.web-store.v1";

export function viewerSessionOpen() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function openViewerSession() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Sin sessionStorage el visor muestra los datos solo hasta recargar.
  }
}

export function closeViewerSession() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nada que cerrar.
  }
}

/** Borra de este navegador lo que trajo el visor (no toca el teléfono). */
export function forgetViewerData() {
  closeViewerSession();
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    // Sin almacenamiento no había nada guardado.
  }
}
