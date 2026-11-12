// La web es un visor: muestra el progreso a partir de un respaldo exportado
// desde el teléfono y no registra nada.
//
// Para desarrollo y para las pruebas de navegador se puede abrir la app completa
// guardando "full" en esta clave de localStorage antes de cargar la página:
//   localStorage.setItem("dophamine.web-mode", "full")
const MODE_KEY = "dophamine.web-mode";

const readMode = () => {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(MODE_KEY);
  } catch {
    return null;
  }
};

export const VIEWER = readMode() !== "full";
