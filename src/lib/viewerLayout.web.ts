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
