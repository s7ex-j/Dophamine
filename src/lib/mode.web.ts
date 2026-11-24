// La web es un visor: muestra el progreso a partir de un respaldo exportado
// desde el teléfono y no registra nada.
//
// Para desarrollo y para las pruebas de navegador se puede abrir la app completa
// guardando "full" en esta clave de localStorage antes de cargar la página:
//   localStorage.setItem("dophamine.web-mode", "full")
import { PWA } from "@/src/lib/pwa";

const MODE_KEY = "dophamine.web-mode";

const readMode = () => {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(MODE_KEY);
  } catch {
    return null;
  }
};

// La app completa solo se abre en esta computadora (desarrollo y pruebas), nunca en el sitio publicado.
const isLocal = () =>
  typeof window !== "undefined" && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

// La web instalable (PWA) es la app completa; el resto del sitio publicado es el visor.
export const VIEWER = !PWA && !(isLocal() && readMode() === "full");
