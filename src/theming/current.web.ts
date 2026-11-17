import { isThemeId, THEME_KEY, type ThemeId } from "@/src/theming/palettes";

const STORE_KEY = "dophamine.web-store.v1";

/** El tema elegido, leído al cargar la página (variante web): del mismo almacén que los ajustes. */
export function currentTheme(): ThemeId {
  try {
    if (typeof window === "undefined") return "forest";
    const store = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "null") as {
      settings?: Record<string, unknown>;
    } | null;
    const value = store?.settings?.[THEME_KEY];
    return isThemeId(value) ? value : "forest";
  } catch {
    return "forest";
  }
}

/** Recarga la página para aplicar un tema nuevo. */
export async function applyTheme(): Promise<void> {
  if (typeof window !== "undefined") window.location.reload();
}
