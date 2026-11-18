import { VIEWER } from "@/src/lib/mode";
import { isThemeId, THEME_KEY, type ThemeId } from "@/src/theming/palettes";

const STORE_KEY = "dophamine.web-store.v1";

/** El tema elegido, leído al cargar la página (variante web): del mismo almacén que los ajustes. */
export function currentTheme(): ThemeId {
  try {
    if (typeof window === "undefined") return "forest";
    // El visor no toca los ajustes de los datos: su tema se guarda aparte.
    const viewerTheme = window.localStorage.getItem("dophamine.viewer-theme");
    if (VIEWER && isThemeId(viewerTheme)) return viewerTheme;
    const store = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "null") as {
      settings?: Record<string, unknown>;
    } | null;
    const value = store?.settings?.[THEME_KEY];
    return isThemeId(value) ? value : "forest";
  } catch {
    return "forest";
  }
}
