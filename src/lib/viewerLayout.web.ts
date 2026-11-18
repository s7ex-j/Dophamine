import { VIEWER } from "@/src/lib/mode";

// El visor web se ve ancho (menú a la izquierda y contenido en columnas) o, si se prefiere, en una
// columna de celular centrada. Es una preferencia de esta pantalla, no un dato: se guarda aparte.
export type ViewerLayout = "wide" | "phone";
const LAYOUT_KEY = "dophamine.viewer-layout";

// Sin elección guardada: ancha en una computadora y de celular en una pantalla angosta.
const byWidth = (): ViewerLayout =>
  typeof window !== "undefined" && window.innerWidth < 900 ? "phone" : "wide";

const readLayout = (): ViewerLayout => {
  try {
    const saved = typeof window === "undefined" ? null : window.localStorage.getItem(LAYOUT_KEY);
    return saved === "phone" || saved === "wide" ? saved : byWidth();
  } catch {
    return byWidth();
  }
};

export const VIEWER_LAYOUT: ViewerLayout = VIEWER ? readLayout() : "phone";
export const VIEWER_WIDE = VIEWER_LAYOUT === "wide";

/** Cambia la vista y recarga para volver a dibujar la página en el formato nuevo. */
export function setViewerLayout(layout: ViewerLayout) {
  try {
    window.localStorage.setItem(LAYOUT_KEY, layout);
  } catch {
    // Sin almacenamiento la vista no se recuerda, pero igual cambia.
  }
  window.location.reload();
}

const THEME_KEY = "dophamine.viewer-theme";

/** El tema que se eligió en el visor (una preferencia de esta pantalla, fuera de los datos). */
export function savedViewerTheme(): string | null {
  try {
    return window.localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

export function saveViewerTheme(theme: string) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Sin almacenamiento el tema dura hasta recargar.
  }
}
