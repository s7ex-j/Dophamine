import { setTheme } from "@/src/theme";
import type { ThemeId } from "@/src/theming/palettes";

/**
 * Cambio de tema sin reiniciar la app: se reescriben los colores y el layout
 * raíz vuelve a montar la navegación con ellos (en un instante, sin recargar el
 * código). Si se pasa `returnTo`, se vuelve a esa pantalla.
 */
const listeners = new Set<() => void>();
let pendingReturn: string | null = null;

export function onThemeChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function switchTheme(theme: ThemeId, returnTo?: string) {
  setTheme(theme);
  pendingReturn = returnTo ?? null;
  listeners.forEach((listener) => listener());
}

/** La pantalla a la que volver tras el cambio (una sola vez). */
export function takeReturnPath() {
  const path = pendingReturn;
  pendingReturn = null;
  return path;
}
